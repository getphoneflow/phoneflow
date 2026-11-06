import {
  Agent,
  ChatContext,
  type JobContext,
  log,
  type ModelSettings,
  type ToolContext,
  tool,
  voice,
} from "@livekit/agents"
import { z } from "zod"

import type {
  ExtractVariablesTool,
  VoicemailDetection,
} from "@workspace/shared/api/agent-config/types"
import type { CallSipConnection } from "@workspace/shared/api/calls/types"
import { evaluateExpression } from "@/flow/expression"
import {
  EXTRACT_INSTRUCTIONS,
  PLATFORM_INSTRUCTIONS,
  TRANSITION_INSTRUCTIONS,
} from "@/flow/prompts"
import { createSendDtmfTool } from "@/flow/tools/dtmf"
import { createTransferCallTool } from "@/flow/tools/transfer-call"
import { createWebhookTool } from "@/flow/tools/webhook"
import type { FlowConversationNode, FlowGraph, FlowNode } from "@/flow/types"
import type { Variables } from "@/flow/variables"
import {
  createVoicemailDetector,
  isVoicemail,
  MAX_DETECTION_MS,
} from "@/flow/voicemail"
import { endCall } from "@/lib/end-call"

// A short "hello?" can get a human verdict before its turn ends, and that turn
// would then cut off the first speech if the agent started right away.
const HUMAN_TURN_WAIT_MS = 2_000

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
  private readonly sip: CallSipConnection | null
  private readonly callId: string
  private readonly room: JobContext["room"]
  private readonly participantIdentity: string
  private readonly onVoicemailDetected: () => void
  private userTurnCompleted = false
  private notifyUserTurnCompleted?: () => void
  awaitingVoicemailVerdict = false

  constructor(
    graph: FlowGraph,
    variables: Variables,
    sip: CallSipConnection | null,
    callId: string,
    room: JobContext["room"],
    participantIdentity: string,
    onVoicemailDetected: () => void
  ) {
    super({
      instructions: buildNodeInstructions(graph, graph.startNode, variables),
    })

    this.graph = graph
    this.variables = variables
    this.sip = sip
    this.callId = callId
    this.room = room
    this.participantIdentity = participantIdentity
    this.onVoicemailDetected = onVoicemailDetected
  }

  private async publishActiveNode(node: FlowNode) {
    if (this.variables.get("direction") !== "web") return

    await this.room.localParticipant?.setAttributes({
      active_node_id: node.id,
    })
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

    if (node.endCall) {
      const description = this.variables.replace(node.endCall.description)
      tools.push(
        tool({
          name: "end_call",
          description,
          execute: async (_args, { ctx }) => {
            await ctx.waitForPlayout()
            await endCall()
          },
        })
      )
    }

    if (node.ivrNavigation) {
      tools.push(createSendDtmfTool(node.ivrNavigation, this.variables))
    }

    if (node.extractVariables) {
      tools.push(this.buildExtractTool(node, node.extractVariables))
    }

    if (node.transferCall && this.sip) {
      tools.push(
        createTransferCallTool(
          node.transferCall,
          this.variables,
          this.sip,
          this.callId
        )
      )
    }

    for (const toolId of node.toolIds ?? []) {
      const definition = this.graph.tools.find((entry) => entry.id === toolId)
      if (definition?.type === "webhook") {
        tools.push(createWebhookTool(definition, this.variables))
      }
    }

    return tools
  }

  private buildExtractTool(
    node: FlowConversationNode,
    extractVariables: ExtractVariablesTool
  ) {
    const shape: Record<string, z.ZodType> = {}

    for (const variable of extractVariables.variables) {
      let field: z.ZodType =
        variable.type === "number"
          ? z.number()
          : variable.type === "boolean"
            ? z.boolean()
            : z.string()

      if (variable.description) {
        field = field.describe(this.variables.replace(variable.description))
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
    await this.publishActiveNode(node)

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

  private async leaveVoicemail(voicemail: VoicemailDetection) {
    try {
      if (voicemail.action === "leave_message") {
        await this.session
          .say(this.variables.replace(voicemail.message), {
            allowInterruptions: false,
          })
          .waitForPlayout()
      }
    } finally {
      await endCall()
    }
  }

  // Resolves to true when the call ended here and the start node must not run.
  private async screenForVoicemail(voicemail: VoicemailDetection) {
    const session = this.session
    const agentSpeaksFirst = this.graph.startNode.startSpeaker === "agent"
    const heldReplies: voice.SpeechHandle[] = []

    // AMD holds speech in the queue but a user turn still creates a reply. It
    // must not play ahead of the start node's first speech. An unscheduled reply
    // is a preemptive one whose turn has not ended, and interrupting it now would
    // drop that turn's message from the chat context.
    const dropHeldReplies = () => {
      for (const reply of heldReplies) {
        if (reply.scheduled) reply.interrupt(true)
      }
    }
    const trackReply = (event: voice.SpeechCreatedEvent) => {
      if (event.source === "generate_reply") {
        heldReplies.push(event.speechHandle)
      }
    }

    session.on(voice.AgentSessionEventTypes.SpeechCreated, trackReply)
    this.awaitingVoicemailVerdict = true

    let amd: voice.AMD | undefined
    let prediction: voice.AMDPredictionEvent | undefined
    let watchdog: ReturnType<typeof setTimeout> | undefined

    try {
      amd = createVoicemailDetector(session, this.participantIdentity)

      // Emitted before execute() resumes speech, so nothing has played yet.
      amd.on("amd_prediction", (event) => {
        if (isVoicemail(event)) {
          this.onVoicemailDetected()
        } else if (agentSpeaksFirst) {
          dropHeldReplies()
        }
      })

      const detector = amd
      watchdog = setTimeout(() => {
        detector.aclose().catch((error) => {
          log().error({ error }, "failed to close voicemail detection")
        })
      }, MAX_DETECTION_MS)
      prediction = await detector.execute()
    } catch (error) {
      log().error({ error }, "voicemail detection failed, continuing the call")
    } finally {
      clearTimeout(watchdog)
    }

    try {
      if (prediction && isVoicemail(prediction)) {
        // AMD stays open until the call ends: while it holds a machine verdict,
        // it stops the turns the greeting still produces from getting a reply.
        await this.leaveVoicemail(voicemail)
        return true
      }

      // A machine verdict skips the reply to later turns for as long as AMD is
      // open, which a phone menu needs, so close it before going on.
      await amd?.aclose()

      if (prediction?.reason === "session_closed") return true

      if (
        agentSpeaksFirst &&
        prediction?.category === voice.AMDCategory.HUMAN &&
        !this.userTurnCompleted
      ) {
        await new Promise<void>((resolve) => {
          this.notifyUserTurnCompleted = resolve
          setTimeout(resolve, HUMAN_TURN_WAIT_MS)
        })
      }

      if (agentSpeaksFirst) {
        // The reply to a turn that just ended is created a few microtasks after
        // the verdict, so let it appear before dropping it.
        await new Promise((resolve) => setImmediate(resolve))
        dropHeldReplies()
      } else if (prediction?.category === voice.AMDCategory.MACHINE_IVR) {
        // AMD cancelled the reply to the menu, so it has to be asked for again.
        session.generateReply()
      }

      return false
    } finally {
      await amd?.aclose()
      session.off(voice.AgentSessionEventTypes.SpeechCreated, trackReply)
      this.awaitingVoicemailVerdict = false
    }
  }

  override async onUserTurnCompleted() {
    this.userTurnCompleted = true
    this.notifyUserTurnCompleted?.()
  }

  override async onEnter() {
    const startNode = this.graph.startNode
    const voicemail = this.graph.voicemailDetection

    // Starts before the first await: AMD ignores speech until it is listening,
    // and the session attaches the call's audio as soon as onEnter yields.
    const callEnded =
      voicemail && this.variables.get("direction") === "outbound"
        ? this.screenForVoicemail(voicemail)
        : false

    await this.publishActiveNode(startNode)
    await this.updateTools(this.buildNodeTools(startNode))

    if (await callEnded) return

    if (startNode.startSpeaker === "agent") {
      await this.enterNode(startNode)
    }
  }

  override llmNode(
    chatCtx: ChatContext,
    toolCtx: ToolContext,
    modelSettings: ModelSettings
  ) {
    const cleaned = new ChatContext(
      chatCtx.items.filter(
        (item) => !("name" in item && item.name.startsWith("notify_condition_"))
      )
    )

    return super.llmNode(cleaned, toolCtx, modelSettings)
  }
}
