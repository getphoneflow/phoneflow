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
  type AgentConfigValidation,
  areAgentConfigsEqual,
  type EditorAgentConfig,
  type EditorFlowEdge,
  type EditorFlowNode,
  type FlowValidationErrors,
  loadEditorAgentConfig,
  validateAgentConfig,
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
  config: EditorAgentConfig
  validation: AgentConfigValidation
  flowErrors: FlowValidationErrors
  savedConfig: AgentConfig
  past: EditorAgentConfig[]
  future: EditorAgentConfig[]
  readOnly: boolean
  activeVersionNumber: number | null
  activeVersionId: string | null
  sidePanel: FlowSidePanelState
}

type AgentEditorStore = AgentEditorState & {
  setAgent: (agent: AgentDetailResponse) => void
  setConfig: (config: EditorAgentConfig) => void
  loadAgentConfig: (config: AgentConfig, readOnly: boolean) => void
  loadAgentVersionConfig: (
    config: AgentConfig,
    version: { id: string; number: number }
  ) => void
  setNode: (node: FlowNodeConfig) => void
  setEdge: (edge: FlowEdgeConfig) => void
  addNode: (node: FlowNodeConfig) => void
  onNodesChange: (changes: NodeChange<EditorFlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange<EditorFlowEdge>[]) => void
  onConnect: (connection: Connection) => void
  selectNode: (node: EditorFlowNode) => void
  selectEdge: (edge: EditorFlowEdge) => void
  setSidePanel: (sidePanel: FlowSidePanelState) => void
  undo: () => void
  redo: () => void
  markSaved: (savedConfig: AgentConfig) => void
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

function flowSelectionFromSidePanel(
  sidePanel: FlowSidePanelState
): FlowSelection | undefined {
  if (sidePanel.kind === "node") {
    return { nodeId: sidePanel.node.id }
  }
  if (sidePanel.kind === "edge") {
    return { edgeId: sidePanel.edge.id }
  }
}

function applyFlowSelection(
  config: EditorAgentConfig,
  selection?: FlowSelection
): EditorAgentConfig {
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

function commitEditorConfig(
  state: AgentEditorState,
  nextConfig: EditorAgentConfig,
  extra: Partial<AgentEditorState> = {}
): Partial<AgentEditorState> {
  const { validation, flowErrors } = validateAgentConfig(nextConfig)

  if (
    state.validation.success &&
    validation.success &&
    areAgentConfigsEqual(state.validation.data, validation.data)
  ) {
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
    validation,
    flowErrors,
    past: shouldPush
      ? [...state.past, structuredClone(state.config)].slice(-HISTORY_LIMIT)
      : state.past,
    future: shouldPush ? [] : state.future,
  }
}

function restoreEditorConfig(
  state: AgentEditorState,
  historyConfig: EditorAgentConfig
): Pick<
  AgentEditorState,
  "config" | "validation" | "flowErrors" | "sidePanel"
> {
  let sidePanel = state.sidePanel

  if (sidePanel.kind === "node") {
    const nodeId = sidePanel.node.id
    const node = historyConfig.nodes.find((entry) => entry.id === nodeId)
    sidePanel = node ? { kind: "node", node } : closedSidePanel
  } else if (sidePanel.kind === "edge") {
    const edgeId = sidePanel.edge.id
    const edge = historyConfig.edges.find((entry) => entry.id === edgeId)
    sidePanel = edge ? { kind: "edge", edge } : closedSidePanel
  }

  const nextConfig = applyFlowSelection(
    historyConfig,
    flowSelectionFromSidePanel(sidePanel)
  )

  return {
    sidePanel,
    config: nextConfig,
    ...validateAgentConfig(nextConfig),
  }
}

function resetEditorHistory(config: AgentConfig) {
  clearTimeout(coalesceTimer)
  coalesceTimer = undefined
  const {
    config: clientConfig,
    validation,
    flowErrors,
    savedConfig,
  } = loadEditorAgentConfig(config)
  return {
    config: clientConfig,
    validation,
    flowErrors,
    savedConfig,
    past: [] as EditorAgentConfig[],
    future: [] as EditorAgentConfig[],
    sidePanel: closedSidePanel,
  }
}

const {
  config: initialConfig,
  validation: initialValidation,
  flowErrors: initialFlowErrors,
  savedConfig: initialSavedConfig,
} = loadEditorAgentConfig(createDefaultAgentConfig())

const initialState: AgentEditorState = {
  agent: emptyAgent,
  config: initialConfig,
  validation: initialValidation,
  flowErrors: initialFlowErrors,
  savedConfig: initialSavedConfig,
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
  setConfig: (config) => set((state) => commitEditorConfig(state, config)),
  loadAgentConfig: (config, readOnly) =>
    set((state) => ({
      ...resetEditorHistory(config),
      readOnly,
      activeVersionNumber: null,
      activeVersionId: null,
      agent: state.agent,
    })),
  loadAgentVersionConfig: (config, version) =>
    set((state) => ({
      ...resetEditorHistory(config),
      readOnly: true,
      activeVersionNumber: version.number,
      activeVersionId: version.id,
      agent: state.agent,
    })),
  setNode: (node) =>
    set((state) =>
      commitEditorConfig(
        state,
        applyFlowSelection(
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
      commitEditorConfig(
        state,
        applyFlowSelection(
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
      commitEditorConfig(
        state,
        applyFlowSelection(
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

      return commitEditorConfig(
        state,
        applyFlowSelection(
          { ...state.config, nodes },
          flowSelectionFromSidePanel(sidePanel)
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

      return commitEditorConfig(
        state,
        applyFlowSelection(
          { ...state.config, edges },
          flowSelectionFromSidePanel(sidePanel)
        ),
        { sidePanel }
      )
    })
  },
  onConnect: (connection) => {
    lastConnectAt = Date.now()
    const edge: FlowEdgeConfig = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      data: {
        condition: { type: "prompt", prompt: "Transition condition" },
      },
    }

    set((state) => {
      const edges = addEdge(edge, state.config.edges)
      if (edges.length === state.config.edges.length) {
        return state
      }

      return commitEditorConfig(
        state,
        applyFlowSelection({ ...state.config, edges }, { edgeId: edge.id }),
        { sidePanel: { kind: "edge", edge } }
      )
    })
  },
  selectNode: (node) =>
    set((state) => ({
      sidePanel: { kind: "node", node },
      config: applyFlowSelection(state.config, { nodeId: node.id }),
    })),
  selectEdge: (edge) =>
    set((state) => ({
      sidePanel: { kind: "edge", edge },
      config: applyFlowSelection(state.config, { edgeId: edge.id }),
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
      config: applyFlowSelection(
        state.config,
        flowSelectionFromSidePanel(sidePanel)
      ),
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
        ...restoreEditorConfig(state, previous),
        past: state.past.slice(0, -1),
        future: [structuredClone(state.config), ...state.future],
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
        ...restoreEditorConfig(state, next),
        past: [...state.past, structuredClone(state.config)].slice(
          -HISTORY_LIMIT
        ),
        future: state.future.slice(1),
      }
    }),
  markSaved: (savedConfig) => set({ savedConfig }),
}))
