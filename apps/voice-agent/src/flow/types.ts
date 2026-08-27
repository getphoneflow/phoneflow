import type {
  ExtractVariable,
  FlowEdgeCondition,
  FlowNodeInstructions,
} from "@workspace/shared/api/agent-config/types"

// Runtime flow
export interface FlowConversationNode {
  type: "conversation"
  name: string
  isStart?: true
  startSpeaker?: "agent" | "user"
  instructions: FlowNodeInstructions
  extractVariables?: ExtractVariable[]
  outgoingEdges: FlowEdge[]
}

export interface FlowEndNode {
  type: "end"
  name: string
}

export type FlowNode = FlowConversationNode | FlowEndNode

export interface FlowEdge {
  condition: FlowEdgeCondition
  targetNode: FlowNode
}

export interface FlowGraph {
  globalPrompt: string
  startNode: FlowConversationNode
}
