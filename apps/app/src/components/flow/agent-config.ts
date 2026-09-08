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

export type FlowValidationErrors = {
  byNodeId: Record<string, string[]>
  byEdgeId: Record<string, string[]>
  global: string[]
}

export type ValidatedEditorAgentConfig = {
  validation: AgentConfigValidation
  flowErrors: FlowValidationErrors
}

const emptyFlowValidationErrors: FlowValidationErrors = {
  byNodeId: {},
  byEdgeId: {},
  global: [],
}

export function loadEditorAgentConfig(server: AgentConfig): {
  config: EditorAgentConfig
  validation: AgentConfigValidation
  flowErrors: FlowValidationErrors
  savedConfig: AgentConfig
} {
  const config = server as EditorAgentConfig
  const { validation, flowErrors } = validateAgentConfig(config)
  return {
    config,
    validation,
    flowErrors,
    savedConfig: validation.success ? validation.data : server,
  }
}

export function validateAgentConfig(
  config: EditorAgentConfig
): ValidatedEditorAgentConfig {
  const validation = agentConfigSchema.safeParse(config)
  if (validation.success) {
    return { validation, flowErrors: emptyFlowValidationErrors }
  }

  const byNodeId: Record<string, string[]> = {}
  const byEdgeId: Record<string, string[]> = {}
  const global: string[] = []

  for (const issue of validation.error.issues) {
    const [root, index] = issue.path
    if (root === "nodes" && typeof index === "number") {
      const nodeId = config.nodes[index]?.id
      if (nodeId) {
        ;(byNodeId[nodeId] ??= []).push(issue.message)
        continue
      }
    }
    if (root === "edges" && typeof index === "number") {
      const edgeId = config.edges[index]?.id
      if (edgeId) {
        ;(byEdgeId[edgeId] ??= []).push(issue.message)
        continue
      }
    }
    global.push(issue.message)
  }

  return { validation, flowErrors: { byNodeId, byEdgeId, global } }
}

export function areAgentConfigsEqual(a: AgentConfig, b: AgentConfig) {
  return JSON.stringify(a) === JSON.stringify(b)
}
