import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import type {
  FlowConversationNode,
  FlowEdge,
  FlowGraph,
  FlowNode,
} from "@/flow/types"

export function buildFlowGraph(config: AgentConfig) {
  const nodesById = new Map<string, FlowNode>()
  let startNode: FlowConversationNode | undefined

  for (const node of config.nodes) {
    let flowNode: FlowNode

    if (node.type === "conversation") {
      flowNode = {
        type: node.type,
        name: node.data.name,
        instructions: node.data.instructions,
        outgoingEdges: [],
      }

      if (node.data.extractVariables) {
        flowNode.extractVariables = node.data.extractVariables
      }

      if (node.data.startSpeaker) {
        flowNode.startSpeaker = node.data.startSpeaker
      }

      if (node.data.isStart) {
        flowNode.isStart = true
        startNode = flowNode
      }
    } else if (node.type === "end") {
      flowNode = {
        type: node.type,
        name: node.data.name,
      }
    } else {
      throw new Error("Unsupported node type")
    }

    nodesById.set(node.id, flowNode)
  }

  for (const edge of config.edges) {
    const targetNode = nodesById.get(edge.target)!

    const flowEdge: FlowEdge = {
      targetNode,
      condition: edge.data.condition,
    }

    const sourceNode = nodesById.get(edge.source)!
    if (sourceNode.type === "conversation") {
      sourceNode.outgoingEdges.push(flowEdge)
    }
  }

  return {
    globalPrompt: config.globalPrompt,
    startNode,
  } as FlowGraph
}
