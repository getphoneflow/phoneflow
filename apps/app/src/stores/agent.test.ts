import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"
import type {
  AgentConfig,
  AgentTool,
  FlowEdgeConfig,
  FlowNodeConfig,
} from "@workspace/shared/api/agent-config/types"
import { areAgentConfigsEqual } from "@/components/flow/agent-config"
import { useAgentStore } from "@/stores/agent"

function store() {
  return useAgentStore.getState()
}

function load(
  config: AgentConfig = createDefaultAgentConfig(),
  readOnly = false
) {
  store().loadAgentConfig(config, readOnly)
}

// Mirrors the check the auto-save runs before sending a PATCH
function hasUnsavedChanges() {
  const { validation, savedConfig } = store()
  return (
    validation.success && !areAgentConfigsEqual(validation.data, savedConfig)
  )
}

// Edits closer than 400ms are merged into one undo step
function nextStep() {
  vi.advanceTimersByTime(500)
}

function conversationNode(
  id: string,
  overrides: Partial<FlowNodeConfig["data"]> = {}
): FlowNodeConfig {
  return {
    id,
    type: "conversation",
    position: { x: 0, y: 500 },
    data: {
      name: `Node ${id}`,
      instructions: { type: "prompt", text: "Ask for the order number" },
      ...overrides,
    },
  } as FlowNodeConfig
}

function webhookTool(id: string, name = `tool_${id}`): AgentTool {
  return {
    id,
    type: "webhook",
    name,
    description: "Look up an order",
    parameters: [],
    method: "GET",
    url: "https://example.com/orders",
    timeoutMs: 5000,
    maxRetries: 0,
    headers: [],
    queryParameters: [],
    body: "",
    responseVariables: [],
  }
}

function nodeIds() {
  return store().config.nodes.map((node) => node.id)
}

function edgeIds() {
  return store().config.edges.map((edge) => edge.id)
}

beforeEach(() => {
  vi.useFakeTimers()
  load()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("loading", () => {
  it("loads a published version as read-only", () => {
    store().loadAgentVersionConfig(createDefaultAgentConfig(), {
      id: "v-1",
      number: 3,
    })

    expect(store()).toMatchObject({
      readOnly: true,
      activeVersionId: "v-1",
      activeVersionNumber: 3,
    })
  })

  it("reports flow errors of an invalid saved config without crashing", () => {
    const config = createDefaultAgentConfig()
    config.edges[0].target = "missing-node"
    load(config)

    expect(store().validation.success).toBe(false)
    expect(store().flowErrors.byEdgeId.edge).toHaveLength(1)
  })
})

describe("editing the flow", () => {
  it("adds a node, selects it and opens it in the side panel", () => {
    store().addNode(conversationNode("n2"))

    expect(nodeIds()).toEqual(["conversation", "end", "n2"])
    expect(store().config.nodes.find((n) => n.id === "n2")?.selected).toBe(true)
    expect(store().sidePanel).toMatchObject({
      kind: "node",
      node: { id: "n2" },
    })
    expect(hasUnsavedChanges()).toBe(true)
  })

  it("connects two nodes with a default prompt condition", () => {
    store().addNode(conversationNode("n2"))
    nextStep()
    store().onConnect({
      source: "conversation",
      target: "n2",
      sourceHandle: null,
      targetHandle: null,
    })

    const edge = store().config.edges.find((e) => e.target === "n2")
    expect(edge).toMatchObject({
      source: "conversation",
      data: { condition: { type: "prompt", prompt: "Transition condition" } },
      selected: true,
    })
    expect(store().sidePanel).toMatchObject({
      kind: "edge",
      edge: { id: edge?.id },
    })
    expect(store().validation.success).toBe(true)
  })

  it("does not create duplicate connections", () => {
    const connection = {
      source: "conversation",
      target: "end",
      sourceHandle: null,
      targetHandle: null,
    }
    store().onConnect(connection)
    expect(edgeIds()).toEqual(["edge"])
  })

  it("updates an edge condition and surfaces validation errors on that edge", () => {
    const [edge] = store().config.edges
    store().setEdge({
      ...edge,
      data: { condition: { type: "prompt", prompt: "  " } },
    } as FlowEdgeConfig)

    expect(store().validation.success).toBe(false)
    expect(store().flowErrors.byEdgeId.edge?.[0]).toBeTypeOf("string")
    expect(hasUnsavedChanges()).toBe(false) // invalid configs are never auto-saved
  })

  it("flags every start node when there is more than one", () => {
    store().addNode(conversationNode("n2", { isStart: true }))

    expect(Object.keys(store().flowErrors.byNodeId).sort()).toEqual([
      "conversation",
      "n2",
    ])
  })

  it("removing the selected node closes its side panel", () => {
    store().addNode(conversationNode("n2"))
    store().onNodesChange([{ type: "remove", id: "n2" }])

    expect(nodeIds()).toEqual(["conversation", "end"])
    expect(store().sidePanel).toEqual({ kind: "closed" })
  })

  it("flags edges left pointing to a removed node", () => {
    // React Flow sends the edge removals separately; until then the flow is invalid
    store().onNodesChange([{ type: "remove", id: "end" }])

    expect(store().validation.success).toBe(false)
    expect(store().flowErrors.byEdgeId.edge).toBeDefined()

    store().onEdgesChange([{ type: "remove", id: "edge" }])
    expect(edgeIds()).toEqual([])
  })

  it("does not record history for layout-only changes", () => {
    store().onNodesChange([
      { type: "dimensions", id: "end", dimensions: { width: 100, height: 40 } },
    ])
    expect(store().past).toEqual([])
    expect(hasUnsavedChanges()).toBe(false)
  })

  it("persists node moves", () => {
    store().onNodesChange([
      { type: "position", id: "end", position: { x: 10, y: 999 } },
    ])
    expect(store().validation.data?.nodes[1].position).toEqual({
      x: 10,
      y: 999,
    })
    expect(hasUnsavedChanges()).toBe(true)
  })

  it("strips editor-only fields from what gets saved", () => {
    store().selectNode(store().config.nodes[0])
    store().onNodesChange([
      { type: "dimensions", id: "end", dimensions: { width: 100, height: 40 } },
    ])

    expect(store().config.nodes[0].selected).toBe(true)
    const saved = store().validation.data?.nodes ?? []
    for (const node of saved) {
      expect(node).not.toHaveProperty("selected")
      expect(node).not.toHaveProperty("measured")
    }
  })
})

describe("read-only mode", () => {
  beforeEach(() => {
    store().loadAgentVersionConfig(createDefaultAgentConfig(), {
      id: "v-1",
      number: 1,
    })
  })

  it("ignores moves, removals and edge changes", () => {
    const before = store().validation.data
    store().onNodesChange([
      { type: "position", id: "end", position: { x: 1, y: 1 } },
    ])
    store().onNodesChange([{ type: "remove", id: "end" }])
    store().onEdgesChange([{ type: "remove", id: "edge" }])

    expect(nodeIds()).toEqual(["conversation", "end"])
    expect(edgeIds()).toEqual(["edge"])
    expect(store().validation.data).toEqual(before)
  })

  it("still applies measured dimensions so the canvas can lay out", () => {
    store().onNodesChange([
      { type: "dimensions", id: "end", dimensions: { width: 120, height: 50 } },
    ])
    expect(store().config.nodes.find((n) => n.id === "end")?.measured).toEqual({
      width: 120,
      height: 50,
    })
  })

  it("cannot undo", () => {
    store().undo()
    expect(nodeIds()).toEqual(["conversation", "end"])
  })
})

describe("undo / redo", () => {
  it("undoes and redoes an edit", () => {
    store().addNode(conversationNode("n2"))

    store().undo()
    expect(nodeIds()).toEqual(["conversation", "end"])
    expect(store().sidePanel).toEqual({ kind: "closed" })

    store().redo()
    expect(nodeIds()).toEqual(["conversation", "end", "n2"])
  })

  it("steps back one edit at a time", () => {
    store().addNode(conversationNode("n2"))
    nextStep()
    store().addNode(conversationNode("n3"))

    store().undo()
    expect(nodeIds()).toEqual(["conversation", "end", "n2"])
    store().undo()
    expect(nodeIds()).toEqual(["conversation", "end"])
  })

  it("coalesces rapid edits (e.g. typing) into a single step", () => {
    const [start] = store().config.nodes
    for (const name of ["W", "We", "Wel", "Welcome"]) {
      store().setNode({
        ...start,
        data: { ...start.data, name },
      } as FlowNodeConfig)
      vi.advanceTimersByTime(100)
    }

    store().undo()
    expect(store().config.nodes[0].data.name).toBe("Greeting")
  })

  it("drops the redo stack after a new edit", () => {
    store().addNode(conversationNode("n2"))
    store().undo()
    store().addNode(conversationNode("n3"))

    expect(store().future).toEqual([])
    store().redo()
    expect(nodeIds()).toEqual(["conversation", "end", "n3"])
  })

  it("starts a fresh history when another config is loaded", () => {
    store().addNode(conversationNode("n2"))
    load()
    expect(store().past).toEqual([])
    store().undo()
    expect(nodeIds()).toEqual(["conversation", "end"])
  })
})

describe("tools", () => {
  it("creates a tool and attaches it to the node", () => {
    store().selectNode(store().config.nodes[0])
    store().createTool(webhookTool("t1"), "conversation")

    expect(store().config.tools.map((t) => t.id)).toEqual(["t1"])
    const node = store().config.nodes[0]
    expect(node.type === "conversation" && node.data.toolIds).toEqual(["t1"])
    expect(store().sidePanel).toMatchObject({
      kind: "node",
      node: { id: "conversation" },
    })
    expect(store().validation.success).toBe(true)
  })

  it("edits a tool in place", () => {
    store().createTool(webhookTool("t1"), "conversation")
    store().editTool({ ...webhookTool("t1"), description: "Updated" })

    expect(store().config.tools).toHaveLength(1)
    expect(store().config.tools[0].description).toBe("Updated")
  })

  it("deletes a tool once no node uses it", () => {
    store().createTool(webhookTool("t1"), "conversation")
    store().removeTool("conversation", "t1")

    expect(store().config.tools).toEqual([])
    const node = store().config.nodes[0]
    expect(node.type === "conversation" && node.data.toolIds).toBeUndefined()
    expect(store().validation.success).toBe(true)
  })

  it("keeps a shared tool when it is removed from only one node", () => {
    store().addNode(conversationNode("n2"))
    store().createTool(webhookTool("t1"), "conversation")
    store().setNode(conversationNode("n2", { toolIds: ["t1"] }))
    expect(store().validation.success).toBe(true)

    store().removeTool("conversation", "t1")

    expect(store().config.tools.some((t) => t.id === "t1")).toBe(true)
    const n2 = store().config.nodes.find((n) => n.id === "n2")
    expect(n2?.type === "conversation" && n2.data.toolIds).toEqual(["t1"])
  })
})
