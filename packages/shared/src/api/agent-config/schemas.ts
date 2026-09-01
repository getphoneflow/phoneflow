import { z } from "zod"

import { BACKGROUND_AUDIO_IDS } from "@workspace/shared/constants/background-audio"

export const sttConfigSchema = z
  .object({
    model: z.string().trim().min(1),
    language: z.string().trim().min(1).exactOptional(),
  })
  .strict()

export const llmConfigSchema = z
  .object({
    model: z.string().trim().min(1),
  })
  .strict()

export const ttsConfigSchema = z
  .object({
    model: z.string().trim().min(1),
    voice: z.string().trim().min(1).exactOptional(),
    language: z.string().trim().min(1).exactOptional(),
  })
  .strict()

export const backgroundAudioSchema = z
  .object({
    sound: z.enum(BACKGROUND_AUDIO_IDS),
    volume: z.number().min(0).max(1),
  })
  .strict()

export const flowNodeInstructionsSchema = z.object({
  type: z.enum(["prompt", "say"]),
  text: z.string().trim().min(1),
})

export const extractVariableSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[a-z0-9_]+$/, "Invalid variable key"),
    description: z.string().trim(),
    type: z.enum(["string", "number", "boolean"]),
  })
  .strict()

export const flowNodeConfigSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("conversation"),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z
      .object({
        name: z.string().trim().min(1),
        isStart: z.literal(true).optional(),
        startSpeaker: z.enum(["agent", "user"]).optional(),
        instructions: flowNodeInstructionsSchema,
        extractVariables: z.array(extractVariableSchema).optional(),
      })
      .strict(),
  }),
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("end"),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z
      .object({
        name: z.string().trim().min(1),
      })
      .strict(),
  }),
])

export const expressionOperatorSchema = z.enum([
  "greater_than",
  "greater_or_equal",
  "less_than",
  "less_or_equal",
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "exists",
  "not_exists",
])

const valuelessOperators = new Set<z.infer<typeof expressionOperatorSchema>>([
  "exists",
  "not_exists",
])

export const expressionConditionSchema = z
  .object({
    variable: z.string().trim().min(1),
    operator: expressionOperatorSchema,
    value: z.string().optional(),
  })
  .strict()
  .refine(
    (condition) =>
      valuelessOperators.has(condition.operator) ||
      (condition.value?.trim().length ?? 0) > 0,
    {
      message: "Value is required for this operator.",
      path: ["value"],
    }
  )

export const flowEdgeConditionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("prompt"),
      prompt: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("expression"),
      match: z.enum(["all", "any"]),
      conditions: z.array(expressionConditionSchema).min(1),
    })
    .strict(),
  z.object({ type: z.literal("always") }).strict(),
])

export const flowEdgeConfigSchema = z.object({
  id: z.string().trim().min(1),
  source: z.string().trim().min(1),
  target: z.string().trim().min(1),
  data: z.object({
    condition: flowEdgeConditionSchema,
  }),
})

export const agentConfigSchema = z
  .object({
    stt: sttConfigSchema,
    llm: llmConfigSchema,
    tts: ttsConfigSchema,
    backgroundAudio: backgroundAudioSchema.exactOptional(),
    globalPrompt: z.string(),
    timezone: z.string().optional(),
    nodes: z.array(flowNodeConfigSchema).min(1),
    edges: z.array(flowEdgeConfigSchema),
  })
  .superRefine((config, ctx) => {
    const nodeIds = new Set<string>()
    let startNodeCount = 0

    config.nodes.forEach((node, index) => {
      // Node IDs must be unique
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", index],
          message: `Duplicate node id "${node.id}".`,
        })
      }
      nodeIds.add(node.id)

      if (node.type === "conversation" && node.data.isStart === true) {
        startNodeCount++
      }
    })

    // Exactly one start node
    if (startNodeCount !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["nodes"],
        message: `Flow must have exactly one start node, found ${startNodeCount}.`,
      })
    }

    const edgeIds = new Set<string>()
    const sourceTargetKeys = new Set<string>()
    const edgesBySource = new Map<string, number>()

    config.edges.forEach((edge, index) => {
      // Edge IDs must be unique
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: `Duplicate edge id "${edge.id}".`,
        })
      }
      edgeIds.add(edge.id)

      // Edge sources must reference existing nodes
      if (!nodeIds.has(edge.source)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "source"],
          message: `Edge "${edge.id}": source node "${edge.source}" does not exist.`,
        })
      }

      // Edge targets must reference existing nodes
      if (!nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "target"],
          message: `Edge "${edge.id}": target node "${edge.target}" does not exist.`,
        })
      }

      // Edges must be unique
      const key = `${edge.source}-${edge.target}`
      if (sourceTargetKeys.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: `Duplicate edge from "${edge.source}" to "${edge.target}".`,
        })
      }
      sourceTargetKeys.add(key)
      edgesBySource.set(edge.source, (edgesBySource.get(edge.source) ?? 0) + 1)
    })

    // No more edges if there is an always
    config.edges.forEach((edge, index) => {
      if (
        edge.data.condition.type === "always" &&
        (edgesBySource.get(edge.source) ?? 0) > 1
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message:
            "An always transition must be the only transition on a node.",
        })
      }
    })
  })
