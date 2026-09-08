import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react"
import { create } from "zustand"

import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"
import type {
  AgentConfig,
  FlowEdgeConfig,
  FlowNodeConfig,
} from "@workspace/shared/api/agent-config/types"
import type { AgentDetailResponse } from "@workspace/shared/api/agents/types"
import {
  agentConfigsEqual,
  type ClientAgentConfig,
  type ClientFlowEdge,
  type ClientFlowNode,
  snapshotAgentConfig,
  toClientAgentConfig,
} from "@/components/flow/agent-config"

export type FlowSidePanelState =
  | { kind: "closed" }
  | { kind: "test" }
  | { kind: "global-prompt" }
  | { kind: "models-config" }
  | { kind: "node"; node: FlowNodeConfig }
  | { kind: "edge"; edge: FlowEdgeConfig }

type FlowSelection = { nodeId?: string; edgeId?: string }

type AgentEditorState = {
  agent: AgentDetailResponse
  config: ClientAgentConfig
  savedConfig: AgentConfig
  past: AgentConfig[]
  future: AgentConfig[]
  readOnly: boolean
  activeVersionNumber: number | null
  activeVersionId: string | null
  sidePanel: FlowSidePanelState
}

type AgentEditorStore = AgentEditorState & {
  setAgent: (agent: AgentDetailResponse) => void
  setConfig: (config: ClientAgentConfig) => void
  loadAgentConfig: (config: AgentConfig, readOnly: boolean) => void
  loadAgentVersionConfig: (
    config: AgentConfig,
    version: { id: string; number: number }
  ) => void
  setNode: (node: FlowNodeConfig) => void
  setEdge: (edge: FlowEdgeConfig) => void
  addNode: (node: FlowNodeConfig) => void
  onNodesChange: (changes: NodeChange<ClientFlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange<ClientFlowEdge>[]) => void
  onConnect: (connection: Connection) => void
  selectNode: (node: ClientFlowNode) => void
  selectEdge: (edge: ClientFlowEdge) => void
  setSidePanel: (sidePanel: FlowSidePanelState) => void
  undo: () => void
  redo: () => void
  markSaved: () => void
}

const closedSidePanel: FlowSidePanelState = { kind: "closed" }

let lastConnectAt = 0
const CONNECT_GUARD_MS = 200

const HISTORY_LIMIT = 50
const HISTORY_COALESCE_MS = 400
let coalesceTimer: ReturnType<typeof setTimeout> | undefined

export const emptyAgent: AgentDetailResponse = {
  id: "",
  name: "",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  versions: [],
}

function selectionFromSidePanel(
  sidePanel: FlowSidePanelState
): FlowSelection | undefined {
  if (sidePanel.kind === "node") {
    return { nodeId: sidePanel.node.id }
  }
  if (sidePanel.kind === "edge") {
    return { edgeId: sidePanel.edge.id }
  }
}

function applySelection(
  config: ClientAgentConfig,
  selection?: FlowSelection
): ClientAgentConfig {
  const selectedNodeId = selection?.nodeId
  const selectedEdgeId = selection?.edgeId

  return {
    ...config,
    nodes: config.nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    })),
    edges: config.edges.map((edge) => ({
      ...edge,
      selected: edge.id === selectedEdgeId,
    })),
  }
}

function commitConfig(
  state: AgentEditorState,
  nextConfig: ClientAgentConfig,
  extra: Partial<AgentEditorState> = {}
): Partial<AgentEditorState> {
  const previous = snapshotAgentConfig(state.config)
  const next = snapshotAgentConfig(nextConfig)

  if (agentConfigsEqual(previous, next)) {
    return { ...extra, config: nextConfig }
  }

  const shouldPush = coalesceTimer === undefined
  clearTimeout(coalesceTimer)
  coalesceTimer = setTimeout(() => {
    coalesceTimer = undefined
  }, HISTORY_COALESCE_MS)

  return {
    ...extra,
    config: nextConfig,
    past: shouldPush
      ? [...state.past, previous].slice(-HISTORY_LIMIT)
      : state.past,
    future: shouldPush ? [] : state.future,
  }
}

function applySnapshot(
  state: AgentEditorState,
  snapshot: AgentConfig
): Pick<AgentEditorState, "config" | "sidePanel"> {
  const config = toClientAgentConfig(snapshot)
  let sidePanel = state.sidePanel

  if (sidePanel.kind === "node") {
    const nodeId = sidePanel.node.id
    const node = config.nodes.find((entry) => entry.id === nodeId)
    sidePanel = node ? { kind: "node", node } : closedSidePanel
  } else if (sidePanel.kind === "edge") {
    const edgeId = sidePanel.edge.id
    const edge = config.edges.find((entry) => entry.id === edgeId)
    sidePanel = edge ? { kind: "edge", edge } : closedSidePanel
  }

  return {
    sidePanel,
    config: applySelection(config, selectionFromSidePanel(sidePanel)),
  }
}

function resetHistory(config: AgentConfig) {
  clearTimeout(coalesceTimer)
  coalesceTimer = undefined
  const clientConfig = toClientAgentConfig(config)
  return {
    config: clientConfig,
    savedConfig: snapshotAgentConfig(clientConfig),
    past: [] as AgentConfig[],
    future: [] as AgentConfig[],
    sidePanel: closedSidePanel,
  }
}

const initialConfig = toClientAgentConfig(createDefaultAgentConfig())

const initialState: AgentEditorState = {
  agent: emptyAgent,
  config: initialConfig,
  savedConfig: snapshotAgentConfig(initialConfig),
  past: [],
  future: [],
  readOnly: true,
  activeVersionNumber: null,
  activeVersionId: null,
  sidePanel: closedSidePanel,
}

export const useAgentStore = create<AgentEditorStore>((set) => ({
  ...initialState,
  setAgent: (agent) => set({ agent }),
  setConfig: (config) => set((state) => commitConfig(state, config)),
  loadAgentConfig: (config, readOnly) =>
    set((state) => ({
      ...resetHistory(config),
      readOnly,
      activeVersionNumber: null,
      activeVersionId: null,
      agent: state.agent,
    })),
  loadAgentVersionConfig: (config, version) =>
    set((state) => ({
      ...resetHistory(config),
      readOnly: true,
      activeVersionNumber: version.number,
      activeVersionId: version.id,
      agent: state.agent,
    })),
  setNode: (node) =>
    set((state) =>
      commitConfig(
        state,
        applySelection(
          {
            ...state.config,
            nodes: state.config.nodes.map((entry) =>
              entry.id === node.id ? node : entry
            ),
          },
          { nodeId: node.id }
        ),
        { sidePanel: { kind: "node", node } }
      )
    ),
  setEdge: (edge) =>
    set((state) =>
      commitConfig(
        state,
        applySelection(
          {
            ...state.config,
            edges: state.config.edges.map((entry) =>
              entry.id === edge.id ? edge : entry
            ),
          },
          { edgeId: edge.id }
        ),
        { sidePanel: { kind: "edge", edge } }
      )
    ),
  addNode: (node) =>
    set((state) =>
      commitConfig(
        state,
        applySelection(
          { ...state.config, nodes: [...state.config.nodes, node] },
          { nodeId: node.id }
        ),
        { sidePanel: { kind: "node", node } }
      )
    ),
  onNodesChange: (changes) => {
    const filtered = changes.filter((change) => change.type !== "select")
    if (filtered.length === 0) {
      return
    }

    set((state) => {
      if (state.readOnly) {
        const dimensions = filtered.filter(
          (change) => change.type === "dimensions"
        )
        if (dimensions.length === 0) {
          return state
        }

        return {
          config: {
            ...state.config,
            nodes: applyNodeChanges(dimensions, state.config.nodes),
          },
        }
      }

      const nodes = applyNodeChanges(filtered, state.config.nodes)
      const panel = state.sidePanel
      const sidePanel =
        panel.kind === "node" &&
        !nodes.some((node) => node.id === panel.node.id)
          ? closedSidePanel
          : panel

      return commitConfig(
        state,
        applySelection(
          { ...state.config, nodes },
          selectionFromSidePanel(sidePanel)
        ),
        { sidePanel }
      )
    })
  },
  onEdgesChange: (changes) => {
    const filtered = changes.filter(
      (change) => change.type !== "select" && change.type !== "add"
    )
    if (filtered.length === 0) {
      return
    }

    set((state) => {
      if (state.readOnly) {
        return state
      }

      const edges = applyEdgeChanges(filtered, state.config.edges)
      const panel = state.sidePanel
      const sidePanel =
        panel.kind === "edge" &&
        !edges.some((edge) => edge.id === panel.edge.id)
          ? closedSidePanel
          : panel

      return commitConfig(
        state,
        applySelection(
          { ...state.config, edges },
          selectionFromSidePanel(sidePanel)
        ),
        { sidePanel }
      )
    })
  },
  onConnect: (connection) => {
    lastConnectAt = Date.now()
    const edge: FlowEdgeConfig = {
      ...connection,
      id: crypto.randomUUID(),
      data: {
        condition: { type: "prompt", prompt: "Transition condition" },
      },
    }

    set((state) => {
      const edges = addEdge(edge, state.config.edges)
      if (edges.length === state.config.edges.length) {
        return state
      }

      return commitConfig(
        state,
        applySelection({ ...state.config, edges }, { edgeId: edge.id }),
        { sidePanel: { kind: "edge", edge } }
      )
    })
  },
  selectNode: (node) =>
    set((state) => ({
      sidePanel: { kind: "node", node },
      config: applySelection(state.config, { nodeId: node.id }),
    })),
  selectEdge: (edge) =>
    set((state) => ({
      sidePanel: { kind: "edge", edge },
      config: applySelection(state.config, { edgeId: edge.id }),
    })),
  setSidePanel: (sidePanel) => {
    if (
      sidePanel.kind === "closed" &&
      Date.now() - lastConnectAt < CONNECT_GUARD_MS
    ) {
      return
    }

    set((state) => ({
      sidePanel,
      config: applySelection(state.config, selectionFromSidePanel(sidePanel)),
    }))
  },
  undo: () =>
    set((state) => {
      clearTimeout(coalesceTimer)
      coalesceTimer = undefined
      const previous = state.past.at(-1)
      if (state.readOnly || !previous) {
        return state
      }

      return {
        ...applySnapshot(state, previous),
        past: state.past.slice(0, -1),
        future: [snapshotAgentConfig(state.config), ...state.future],
      }
    }),
  redo: () =>
    set((state) => {
      clearTimeout(coalesceTimer)
      coalesceTimer = undefined
      const next = state.future.at(0)
      if (state.readOnly || !next) {
        return state
      }

      return {
        ...applySnapshot(state, next),
        past: [...state.past, snapshotAgentConfig(state.config)].slice(
          -HISTORY_LIMIT
        ),
        future: state.future.slice(1),
      }
    }),
  markSaved: () =>
    set((state) => ({
      savedConfig: snapshotAgentConfig(state.config),
    })),
}))
