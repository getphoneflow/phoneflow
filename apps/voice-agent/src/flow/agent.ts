import { Agent, tool } from "@livekit/agents"
import { z } from "zod"

import type { ExtractVariable } from "@workspace/shared/api/agent-config/types"
import { evaluateExpression } from "@/flow/expression"
import {
  EXTRACT_INSTRUCTIONS,
  PLATFORM_INSTRUCTIONS,
  TRANSITION_INSTRUCTIONS,
} from "@/flow/prompts"
import type { FlowConversationNode, FlowGraph, FlowNode } from "@/flow/types"
import type { Variables } from "@/flow/variables"
import { endCall } from "@/lib/end-call"

function buildNodeInstructions(
  graph: FlowGraph,
  node: FlowConversationNode,
  variables: Variables
) {
  const parts = [PLATFORM_INSTRUCTIONS]

  if (graph.globalPrompt) {
    parts.push(variables.replace(graph.globalPrompt))
  }

  if (node.instructions.type === "prompt") {
    parts.push(variables.replace(node.instructions.text))
  }

  if (node.extractVariables) {
    parts.push(EXTRACT_INSTRUCTIONS)
  }

  if (node.outgoingEdges.some((edge) => edge.condition.type === "prompt")) {
    parts.push(TRANSITION_INSTRUCTIONS)
  }

  return parts.join("\n\n")
}

export class FlowAgent extends Agent {
  private readonly graph: FlowGraph
  private readonly variables: Variables

  constructor(graph: FlowGraph, variables: Variables) {
    super({
      instructions: buildNodeInstructions(graph, graph.startNode, variables),
    })

    this.graph = graph
    this.variables = variables
  }

  private buildNodeTools(node: FlowConversationNode) {
    const tools = []
    let conditionIndex = 0

    for (const edge of node.outgoingEdges) {
      if (edge.condition.type !== "prompt") {
        continue
      }

      conditionIndex++

      tools.push(
        tool({
          name: `notify_condition_${conditionIndex}_met`,
          description: `Call this tool when the following condition is met: ${this.variables.replace(edge.condition.prompt)}`,
          execute: async () => {
            await this.transitionTo(edge.targetNode)
          },
        })
      )
    }

    if (node.extractVariables) {
      tools.push(this.buildExtractTool(node, node.extractVariables))
    }

    return tools
  }

  private buildExtractTool(
    node: FlowConversationNode,
    extractVariables: ExtractVariable[]
  ) {
    const shape: Record<string, z.ZodType> = {}

    for (const variable of extractVariables) {
      let field: z.ZodType =
        variable.type === "number"
          ? z.number()
          : variable.type === "boolean"
            ? z.boolean()
            : z.string()

      if (variable.description) {
        field = field.describe(variable.description)
      }

      shape[variable.key] = field.optional()
    }

    return tool({
      name: "extract_variables",
      description:
        "Call this tool when the user provides some of the requested values",
      parameters: z.object(shape),
      execute: async (args) => {
        for (const [key, value] of Object.entries(args)) {
          this.variables.set(key, String(value))
        }

        const target = this.matchedTarget(node)
        if (target) {
          await this.transitionTo(target)
        }
      },
    })
  }

  private matchedTarget(node: FlowConversationNode): FlowNode | undefined {
    const edge = node.outgoingEdges.find(
      (candidate) =>
        candidate.condition.type === "always" ||
        (candidate.condition.type === "expression" &&
          evaluateExpression(candidate.condition, this.variables))
    )
    return edge?.targetNode
  }

  private async transitionTo(node: FlowNode) {
    if (node.type === "end") {
      await endCall()
      return
    }

    await this.updateInstructions(
      buildNodeInstructions(this.graph, node, this.variables)
    )
    await this.updateTools(this.buildNodeTools(node))
    await this.enterNode(node)
  }

  private async enterNode(node: FlowConversationNode) {
    const speech =
      node.instructions.type === "say"
        ? this.session.say(this.variables.replace(node.instructions.text))
        : this.session.generateReply()

    const target = this.matchedTarget(node)
    if (target) {
      await speech.waitForPlayout()
      await this.transitionTo(target)
    }
  }

  override async onEnter() {
    const startNode = this.graph.startNode
    await this.updateTools(this.buildNodeTools(startNode))

    if (startNode.startSpeaker === "agent") {
      await this.enterNode(startNode)
    }
  }
}
