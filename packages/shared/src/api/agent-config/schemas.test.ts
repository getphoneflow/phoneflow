/// <reference types="node" />

import { describe, expect, it } from "vitest"

import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"
import { agentConfigSchema } from "@workspace/shared/api/agent-config/schemas"
import type { AgentConfig } from "@workspace/shared/api/agent-config/types"

type Node = AgentConfig["nodes"][number]
type Edge = AgentConfig["edges"][number]

function config(change: (config: AgentConfig) => void = () => {}) {
  const base = createDefaultAgentConfig()
  change(base)
  return base
}

function errors(value: AgentConfig) {
  const result = agentConfigSchema.safeParse(value)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

function conversation(
  id: string,
  data: Partial<Extract<Node, { type: "conversation" }>["data"]> = {}
): Node {
  return {
    id,
    type: "conversation",
    position: { x: 0, y: 0 },
    data: { name: id, instructions: { type: "prompt", text: "Talk" }, ...data },
  }
}

function edge(
  id: string,
  source: string,
  target: string,
  condition: Edge["data"]["condition"] = { type: "prompt", prompt: "Go" }
): Edge {
  return {
    id,
    source,
    target,
    data: { condition },
  }
}

function webhook(overrides: Record<string, unknown> = {}) {
  return {
    id: "tool-1",
    type: "webhook",
    name: "lookup_order",
    description: "Look up an order",
    parameters: [],
    method: "POST",
    url: "https://example.com/orders",
    timeoutMs: 5000,
    maxRetries: 0,
    headers: [],
    queryParameters: [],
    body: "",
    responseVariables: [],
    ...overrides,
  } as AgentConfig["tools"][number]
}

describe("agentConfigSchema", () => {
  it("accepts the default agent template", () => {
    expect(errors(config())).toEqual([])
  })

  describe("flow graph", () => {
    it("requires exactly one start node", () => {
      expect(
        errors(
          config((c) => {
            c.nodes = [conversation("a"), c.nodes[1]]
            c.edges = []
          })
        )
      ).toContain("schemas.agent_config.agent_config.nodes.start_required")

      expect(
        errors(
          config((c) => {
            c.nodes.push(conversation("second", { isStart: true }))
          })
        )
      ).toContain("schemas.agent_config.agent_config.nodes.start_only_one")
    })

    it("rejects duplicate node ids", () => {
      expect(
        errors(
          config((c) => {
            c.nodes.push(conversation("conversation"))
          })
        )
      ).toContain("schemas.agent_config.agent_config.nodes.duplicate")
    })

    it("rejects edges pointing at missing nodes", () => {
      expect(
        errors(
          config((c) => {
            c.edges.push(edge("e2", "conversation", "ghost"))
          })
        )
      ).toContain("schemas.agent_config.agent_config.edges.disconnected")
    })

    it("rejects duplicate edges between the same nodes", () => {
      expect(
        errors(
          config((c) => {
            c.edges.push(edge("e2", "conversation", "end"))
          })
        )
      ).toContain("schemas.agent_config.agent_config.edges.duplicate")
    })

    it("only allows an 'always' transition as the single exit of a node", () => {
      const withAlways = config((c) => {
        c.nodes.push(conversation("other"))
        c.edges = [
          edge("e1", "conversation", "end", { type: "always" }),
          edge("e2", "conversation", "other"),
        ]
      })
      expect(errors(withAlways)).toContain(
        "schemas.agent_config.agent_config.edges.always_alone"
      )

      const alone = config((c) => {
        c.edges = [edge("e1", "conversation", "end", { type: "always" })]
      })
      expect(errors(alone)).toEqual([])
    })

    it("requires a value for comparison operators but not for exists", () => {
      function withCondition(operator: string, value?: string) {
        return config((c) => {
          c.dynamicVariables = [{ key: "age" }]
          c.edges = [
            edge("e1", "conversation", "end", {
              type: "expression",
              match: "all",
              conditions: [{ variable: "age", operator, value } as never],
            }),
          ]
        })
      }

      expect(errors(withCondition("greater_than"))).toContain(
        "schemas.agent_config.expression_condition.value.required"
      )
      expect(errors(withCondition("greater_than", "18"))).toEqual([])
      expect(errors(withCondition("exists"))).toEqual([])
    })
  })

  describe("variables", () => {
    it("rejects {{variables}} that are never defined", () => {
      const result = config((c) => {
        c.globalPrompt = "Hello {{customer_name}}"
      })
      expect(errors(result)).toContain(
        "schemas.agent_config.agent_config.variables.unknown"
      )
    })

    it("accepts dynamic, extracted, reserved and webhook response variables", () => {
      const result = config((c) => {
        c.dynamicVariables = [{ key: "customer_name" }]
        c.tools = [
          webhook({
            responseVariables: [{ name: "order_status", path: "status" }],
          }),
        ]
        c.nodes[0] = conversation("conversation", {
          isStart: true,
          toolIds: ["tool-1"],
          extractVariables: {
            variables: [
              {
                key: "email",
                type: "string",
                description: "Email of {{customer_name}}",
              },
            ],
          },
        })
        c.globalPrompt =
          "Hi {{customer_name}} ({{email}}), today is {{date}}. Order: {{order_status}}"
      })
      expect(errors(result)).toEqual([])
    })

    it("rejects reserved names for user-defined variables", () => {
      expect(
        errors(
          config((c) => {
            c.dynamicVariables = [{ key: "date" }]
          })
        )
      ).toContain("schemas.agent_config.variable_key.reserved")
    })

    it("rejects duplicate dynamic variables", () => {
      expect(
        errors(
          config((c) => {
            c.dynamicVariables = [{ key: "a" }, { key: "a" }]
          })
        )
      ).toContain(
        "schemas.agent_config.agent_config.dynamic_variables.duplicate_key"
      )
    })

    it("lets webhook requests use their own parameters", () => {
      const result = config((c) => {
        c.tools = [
          webhook({
            url: "https://example.com/orders/{{order_id}}",
            parameters: [
              {
                name: "order_id",
                type: "string",
                description: "Order id",
                required: true,
              },
            ],
          }),
        ]
      })
      expect(errors(result)).toEqual([])
    })
  })

  describe("tools", () => {
    it("rejects duplicate tools and unknown tool references", () => {
      expect(
        errors(
          config((c) => {
            c.tools = [webhook(), webhook({ name: "other" })]
          })
        )
      ).toContain("schemas.agent_config.agent_config.tools.duplicate")

      expect(
        errors(
          config((c) => {
            c.nodes[0] = conversation("conversation", {
              isStart: true,
              toolIds: ["missing"],
            })
          })
        )
      ).toContain("schemas.agent_config.agent_config.nodes.unknown_tool")
    })

    it("rejects tool names that clash with built-in tools", () => {
      expect(
        errors(
          config((c) => {
            c.tools = [webhook({ name: "end_call" })]
          })
        )
      ).toContain("schemas.agent_config.webhook_tool.name.reserved")
    })

    it("requires the webhook body to be JSON", () => {
      expect(
        errors(
          config((c) => {
            c.tools = [webhook({ body: "{not json" })]
          })
        )
      ).toContain("schemas.agent_config.webhook_tool.body.json")
    })
  })
})
