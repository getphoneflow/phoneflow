// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"
import type {
  AgentConfig,
  FlowNodeConfig,
} from "@workspace/shared/api/agent-config/types"
import type {
  AgentDetailResponse,
  UpdateAgentConfigRequest,
} from "@workspace/shared/api/agents/types"
import { toast } from "@workspace/ui/components/sonner"
import { AgentAutoSave } from "@/components/agents/agent-auto-save"
import { areAgentConfigsEqual } from "@/components/flow/agent-config"
import { api } from "@/lib/api"
import { useAgentStore } from "@/stores/agent"

vi.mock("@/lib/api", () => ({ api: { patch: vi.fn() } }))
vi.mock("@workspace/ui/components/sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const AGENT_ID = "agent-1"
function store() {
  return useAgentStore.getState()
}

const patch = vi.mocked(api.patch)

function renderAutoSave() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AgentAutoSave />
    </QueryClientProvider>
  )
}

function load(
  config: AgentConfig = createDefaultAgentConfig(),
  readOnly = false
) {
  act(() => {
    store().setAgent({ id: AGENT_ID } as AgentDetailResponse)
    store().loadAgentConfig(config, readOnly)
  })
}

function renameFirstNode(name: string) {
  act(() => {
    const [node] = store().config.nodes
    store().setNode({ ...node, data: { ...node.data, name } } as FlowNodeConfig)
  })
}

// Advances fake time and lets React Query settle the mutation
async function wait(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}

function sentConfig(call = 0) {
  const options = patch.mock.calls[call][1] as {
    body: UpdateAgentConfigRequest
  }
  return options.body.config
}

function hasUnsavedChanges() {
  const { validation, savedConfig } = store()
  return (
    validation.success && !areAgentConfigsEqual(validation.data, savedConfig)
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  patch.mockReset()
  patch.mockImplementation(async (_path, options) => options?.body)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("AgentAutoSave", () => {
  it("saves an edit once the user pauses for a second", async () => {
    load()
    renderAutoSave()

    renameFirstNode("Welcome")
    await wait(999)
    expect(patch).not.toHaveBeenCalled()

    await wait(1)
    expect(patch).toHaveBeenCalledTimes(1)
    expect(patch.mock.calls[0][0]).toBe(`/agents/${AGENT_ID}/config`)
    expect(sentConfig().nodes[0].data.name).toBe("Welcome")

    await wait(10)
    expect(hasUnsavedChanges()).toBe(false)
    expect(screen.getByText("Auto saved")).toBeTruthy()
  })

  it("sends one save with the latest config when edits keep coming", async () => {
    load()
    renderAutoSave()

    renameFirstNode("W")
    await wait(500)
    renameFirstNode("We")
    await wait(500)
    renameFirstNode("Welcome")
    await wait(1000)

    expect(patch).toHaveBeenCalledTimes(1)
    expect(sentConfig().nodes[0].data.name).toBe("Welcome")
  })

  it("does not save when nothing changed", async () => {
    load()
    renderAutoSave()

    await wait(5000)

    expect(patch).not.toHaveBeenCalled()
  })

  it("never saves a published version, which is read-only", async () => {
    load(createDefaultAgentConfig(), true)
    const { container } = renderAutoSave()

    renameFirstNode("Changed")
    await wait(5000)

    expect(patch).not.toHaveBeenCalled()
    expect(container.textContent).toBe("")
  })

  it("does not save an invalid config and asks the user to fix it", async () => {
    load()
    renderAutoSave()

    act(() => {
      const [edge] = store().config.edges
      store().setEdge({ ...edge, target: "missing-node" })
    })
    await wait(5000)

    expect(store().validation.success).toBe(false)
    expect(patch).not.toHaveBeenCalled()
    expect(screen.getByText("Fix error")).toBeTruthy()
  })

  it("shows the error and keeps the change unsaved when saving fails", async () => {
    patch.mockRejectedValue(new Error("Agent not found"))
    load()
    renderAutoSave()

    renameFirstNode("Welcome")
    await wait(1010)

    expect(patch).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith("Agent not found")
    expect(hasUnsavedChanges()).toBe(true)
  })
})
