import { beforeAll, describe, expect, it } from "vitest"

import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"
import { agentConfigSchema } from "@workspace/shared/api/agent-config/schemas"
import {
  areAgentConfigsEqual,
  type EditorAgentConfig,
  validateAgentConfig,
} from "@/components/flow/agent-config"
import i18n from "@/lib/i18n"

beforeAll(async () => {
  await i18n.changeLanguage("en")
})

// A config as React Flow holds it, with selection and measurement fields
function editorConfig(): EditorAgentConfig {
  const config = createDefaultAgentConfig()
  return {
    ...config,
    nodes: config.nodes.map((node) => ({
      ...node,
      selected: node.id === "end",
      dragging: false,
      measured: { width: 200, height: 80 },
    })),
    edges: config.edges.map((edge) => ({ ...edge, selected: true })),
  } as EditorAgentConfig
}

describe("validateAgentConfig", () => {
  it("turns editor state into a config the API accepts (round trip)", () => {
    const { validation } = validateAgentConfig(editorConfig())

    expect(validation.success).toBe(true)
    const saved = validation.data
    expect(agentConfigSchema.safeParse(saved).success).toBe(true)
    expect(saved).toEqual(createDefaultAgentConfig())
    expect(
      areAgentConfigsEqual(saved as never, createDefaultAgentConfig())
    ).toBe(true)
  })

  it("attaches node errors to the node, translated", () => {
    const config = editorConfig()
    const greeting = config.nodes[0]
    if (greeting.type !== "conversation") throw new Error("unexpected fixture")
    greeting.data.name = ""

    const { flowErrors } = validateAgentConfig(config)

    expect(Object.keys(flowErrors.byNodeId)).toEqual(["conversation"])
    const [message] = flowErrors.byNodeId.conversation
    expect(message).not.toMatch(/^schemas\./)
  })

  it("attaches edge errors to the edge", () => {
    const config = editorConfig()
    config.edges[0].target = "nowhere"

    const { flowErrors } = validateAgentConfig(config)

    expect(Object.keys(flowErrors.byEdgeId)).toEqual(["edge"])
    expect(flowErrors.byNodeId).toEqual({})
  })

  it("reports config-wide problems as global errors", () => {
    const config = editorConfig()
    config.globalPrompt = "Hello {{customer_name}}"

    const { flowErrors } = validateAgentConfig(config)

    expect(flowErrors.global).toHaveLength(1)
    expect(flowErrors.global[0]).toContain("{{customer_name}}")
  })
})
