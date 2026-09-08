import type {
  AgentConfig,
  FlowEdgeConfig,
  FlowNodeConfig,
} from "@workspace/shared/api/agent-config/types"

export type ClientFlowNode = FlowNodeConfig & {
  selected?: boolean
  dragging?: boolean
  measured?: { width?: number; height?: number }
  width?: number
  height?: number
}
export type ClientFlowEdge = FlowEdgeConfig & { selected?: boolean }

export type ClientAgentConfig = Omit<AgentConfig, "nodes" | "edges"> & {
  nodes: ClientFlowNode[]
  edges: ClientFlowEdge[]
}

export function toClientAgentConfig(server: AgentConfig): ClientAgentConfig {
  return {
    ...server,
    nodes: server.nodes.map((node) => ({ ...node })),
    edges: server.edges.map((edge) => ({ ...edge })),
  }
}

export function toServerAgentConfig(config: ClientAgentConfig): AgentConfig {
  return {
    ...config,
    nodes: config.nodes.map(
      ({
        selected: _selected,
        dragging: _dragging,
        measured: _measured,
        width: _width,
        height: _height,
        ...node
      }) => node
    ),
    edges: config.edges.map(({ selected: _selected, ...edge }) => edge),
  }
}

export function snapshotAgentConfig(config: ClientAgentConfig): AgentConfig {
  return structuredClone(toServerAgentConfig(config))
}

export function agentConfigsEqual(a: AgentConfig, b: AgentConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function hasUnsavedAgentChanges(
  config: ClientAgentConfig,
  savedConfig: AgentConfig
): boolean {
  return !agentConfigsEqual(snapshotAgentConfig(config), savedConfig)
}
