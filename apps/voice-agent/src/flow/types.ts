import type {
  AgentTool,
  EndCallTool,
  ExtractVariablesTool,
  FlowEdgeCondition,
  FlowNodeInstructions,
  IvrNavigationTool,
  SkipTurnTool,
  TransferCallTool,
} from "@workspace/shared/api/agent-config/types"

// Runtime flow
export interface FlowConversationNode {
  id: string
  type: "conversation"
  name: string
  isStart?: true
  startSpeaker?: "agent" | "user"
  instructions: FlowNodeInstructions
  endCall?: EndCallTool
  extractVariables?: ExtractVariablesTool
  ivrNavigation?: IvrNavigationTool
  skipTurn?: SkipTurnTool
  transferCall?: TransferCallTool
  toolIds?: string[]
  documentIds?: string[]
  outgoingEdges: FlowEdge[]
}

export interface FlowEndNode {
  id: string
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
  tools: AgentTool[]
}
