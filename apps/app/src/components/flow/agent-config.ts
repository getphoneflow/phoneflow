import type { Edge, Node } from "@xyflow/react"

import { agentConfigSchema } from "@workspace/shared/api/agent-config/schemas"
import type {
  AgentConfig,
  FlowEdgeConfig,
  FlowNodeConfig,
} from "@workspace/shared/api/agent-config/types"

export type EditorFlowNode = FlowNodeConfig & Node

export type EditorFlowEdge = FlowEdgeConfig & Edge

export type EditorAgentConfig = Omit<AgentConfig, "nodes" | "edges"> & {
  nodes: EditorFlowNode[]
  edges: EditorFlowEdge[]
}

export type AgentConfigValidation = ReturnType<
  typeof agentConfigSchema.safeParse
>

export function loadEditorAgentConfig(server: AgentConfig): {
  config: EditorAgentConfig
  validation: AgentConfigValidation
  savedConfig: AgentConfig
} {
  const config = server as EditorAgentConfig
  const validation = validateAgentConfig(config)
  return {
    config,
    validation,
    savedConfig: validation.success ? validation.data : server,
  }
}

export function validateAgentConfig(
  config: EditorAgentConfig
): AgentConfigValidation {
  return agentConfigSchema.safeParse(config)
}

export function areAgentConfigsEqual(a: AgentConfig, b: AgentConfig) {
  return JSON.stringify(a) === JSON.stringify(b)
}
