import { z } from "zod"

import { BACKGROUND_AUDIO_IDS } from "@workspace/shared/constants/background-audio"

const reservedVariableKeys = new Set([
  "date",
  "time",
  "timezone",
  "direction",
  "phone_number",
  "agent_number",
])

function requiredString(message: string) {
  return z.string().trim().min(1, message)
}

export const sttConfigSchema = z
  .object({
    model: requiredString("Speech-to-text model is required"),
    language: requiredString("Language is required").exactOptional(),
    keyterms: z
      .array(requiredString("Keyterm cannot be empty"))
      .exactOptional(),
    // Deepgram, xAI
    endpointingMs: z.number().int().nonnegative().exactOptional(),
    vadThreshold: z.number().min(0).max(1).exactOptional(),
    diarize: z.boolean().exactOptional(),
    // Deepgram Flux (STTv2)
    eagerEotThreshold: z.number().min(0.3).max(0.9).exactOptional(),
    eotThreshold: z.number().min(0.5).max(0.9).exactOptional(),
    eotTimeoutMs: z.number().int().positive().exactOptional(),
    mipOptOut: z.boolean().exactOptional(),
    // AssemblyAI
    mode: z.enum(["min_latency", "balanced", "max_accuracy"]).exactOptional(),
    minTurnSilence: z.number().int().nonnegative().exactOptional(),
    maxTurnSilence: z.number().int().nonnegative().exactOptional(),
    endOfTurnConfidenceThreshold: z.number().min(0).max(1).exactOptional(),
    voiceFocus: z.enum(["near-field", "far-field"]).exactOptional(),
    voiceFocusThreshold: z.number().min(0).max(1).exactOptional(),
    agentContextCarryover: z.boolean().exactOptional(),
    // Soniox
    endpointLatencyAdjustmentLevel: z.number().min(0).max(3).exactOptional(),
    languageHintsStrict: z.boolean().exactOptional(),
    // Inworld
    minEndOfTurnSilenceWhenConfident: z
      .number()
      .int()
      .nonnegative()
      .exactOptional(),
    enableVoiceProfile: z.boolean().exactOptional(),
    voiceProfileTopN: z.number().int().positive().exactOptional(),
    // xAI
    smartTurn: z.number().min(0).max(1).exactOptional(),
    smartTurnTimeout: z.number().int().positive().max(5000).exactOptional(),
  })
  .strict()

export const llmConfigSchema = z
  .object({
    model: requiredString("Language model is required"),
    temperature: z.number().min(0).max(2).exactOptional(),
    maxTokens: z.number().int().positive().exactOptional(),
    toolChoice: z.enum(["auto", "none", "required"]).exactOptional(),
    reasoningEffort: z
      .enum(["none", "minimal", "low", "medium", "high"])
      .exactOptional(),
  })
  .strict()

export const ttsConfigSchema = z
  .object({
    model: requiredString("Text-to-speech model is required"),
    voice: requiredString("Voice is required"),
    language: requiredString("Language is required").exactOptional(),
    // Deepgram
    mipOptOut: z.boolean().exactOptional(),
    // Fish Audio
    latencyMode: z.enum(["normal", "balanced", "low"]).exactOptional(),
    speed: z.number().positive().exactOptional(),
    volume: z.number().exactOptional(),
    emotion: z.array(requiredString("Emotion cannot be empty")).exactOptional(),
  })
  .strict()

export const turnHandlingConfigSchema = z
  .object({
    turnDetection: z.enum(["stt", "vad"]),
    endpointing: z.discriminatedUnion("mode", [
      z
        .object({
          mode: z.literal("fixed"),
          minDelay: z.number().int().nonnegative(),
          maxDelay: z.number().int().nonnegative(),
        })
        .strict(),
      z
        .object({
          mode: z.literal("dynamic"),
          minDelay: z.number().int().nonnegative(),
          maxDelay: z.number().int().nonnegative(),
          alpha: z.number().min(0).max(1),
        })
        .strict(),
    ]),
    preemptiveGeneration: z.discriminatedUnion("enabled", [
      z.object({ enabled: z.literal(false) }).strict(),
      z
        .object({
          enabled: z.literal(true),
          preemptiveTts: z.boolean(),
          maxSpeechDuration: z.number().int().positive(),
          maxRetries: z.number().int().positive(),
        })
        .strict(),
    ]),
    interruption: z.discriminatedUnion("enabled", [
      z.object({ enabled: z.literal(false) }).strict(),
      z
        .object({
          enabled: z.literal(true),
          discardAudioIfUninterruptible: z.boolean(),
          minDuration: z.number().int().nonnegative(),
          minWords: z.number().int().nonnegative(),
          falseInterruptionTimeout: z.number().int().nonnegative(),
          resumeFalseInterruption: z.boolean(),
        })
        .strict(),
    ]),
  })
  .strict()

export const backgroundAudioSchema = z
  .object({
    sound: z.enum(BACKGROUND_AUDIO_IDS),
    volume: z.number().min(0).max(1),
  })
  .strict()

export const callSettingsSchema = z
  .object({
    maxDurationSec: z.number().int().positive(),
    idleTimeoutSec: z.number().int().positive(),
    maxIdleMessages: z.number().int().positive(),
    endOnSilenceSec: z.number().int().positive(),
  })
  .strict()

export const flowNodeInstructionsSchema = z.object({
  type: z.enum(["prompt", "say"]),
  text: requiredString("Conversation instructions are required"),
})

const variableKeySchema = requiredString("Variable key is required")
  .regex(
    /^[a-z0-9_]+$/,
    "Variable key must be lowercase letters, numbers, or underscores"
  )
  .refine((key) => !reservedVariableKeys.has(key), "Variable key is reserved")

export const dynamicVariableSchema = z
  .object({
    key: variableKeySchema,
    defaultValue: z.string().exactOptional(),
  })
  .strict()

export const extractVariableSchema = z
  .object({
    key: variableKeySchema,
    type: z.enum(["string", "number", "boolean"]),
    description: z.string().trim(),
  })
  .strict()

export const endCallToolSchema = z
  .object({
    description: requiredString("Description is required"),
  })
  .strict()

export const ivrNavigationToolSchema = z
  .object({
    description: requiredString("Description is required"),
  })
  .strict()

export const extractVariablesToolSchema = z
  .object({
    variables: z
      .array(extractVariableSchema)
      .min(1, "Add at least one variable"),
  })
  .strict()
  .superRefine((value, ctx) => {
    const keys = new Set<string>()
    value.variables.forEach((variable, index) => {
      if (keys.has(variable.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["variables", index, "key"],
          message: "Duplicate variable key",
        })
      }
      keys.add(variable.key)
    })
  })

export const transferCallDestinationSchema = z
  .object({
    number: z.e164(),
    condition: requiredString("Condition is required"),
  })
  .strict()

export const transferCallToolSchema = z
  .object({
    destinations: z
      .array(transferCallDestinationSchema)
      .min(1, "Add at least one destination"),
  })
  .strict()
  .superRefine((value, ctx) => {
    const numbers = new Set<string>()
    value.destinations.forEach((destination, index) => {
      if (numbers.has(destination.number)) {
        ctx.addIssue({
          code: "custom",
          path: ["destinations", index, "number"],
          message: "Duplicate phone number",
        })
      }
      numbers.add(destination.number)
    })
  })

const toolParameterSchema = z
  .object({
    name: requiredString("Parameter name is required").regex(
      /^[a-z0-9_]+$/,
      "Use lowercase letters, numbers, or underscores"
    ),
    type: z.enum(["string", "number", "boolean"]),
    description: z.string(),
    required: z.boolean(),
  })
  .strict()

const toolKeyValueSchema = z
  .object({
    key: requiredString("Key is required"),
    value: requiredString("Value is required"),
  })
  .strict()

const responseVariableSchema = z
  .object({
    name: requiredString("Variable name is required")
      .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, or underscores")
      .refine(
        (name) => !reservedVariableKeys.has(name),
        "Variable name is reserved"
      ),
    path: requiredString("Response path is required"),
  })
  .strict()

const reservedToolNames = new Set([
  "end_call",
  "extract_variables",
  "send_dtmf",
  "transfer_call",
])

export const webhookToolSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("webhook"),
    name: requiredString("Tool name is required")
      .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, or underscores")
      .refine(
        (name) =>
          !reservedToolNames.has(name) && !name.startsWith("notify_condition_"),
        "Tool name is reserved"
      ),
    description: requiredString("Tool description is required"),
    parameters: z.array(toolParameterSchema),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    url: requiredString("URL is required"),
    timeoutMs: z.number().int().min(1000).max(600_000),
    maxRetries: z.number().int().min(0).max(5),
    headers: z.array(toolKeyValueSchema),
    queryParameters: z.array(toolKeyValueSchema),
    body: z.string().refine((value) => {
      try {
        if (value.trim()) JSON.parse(value)
        return true
      } catch {
        return false
      }
    }, "Body must be JSON"),
    responseVariables: z.array(responseVariableSchema),
  })
  .strict()

export const agentToolSchema = z.discriminatedUnion("type", [webhookToolSchema])

export const flowNodeConfigSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("conversation"),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z
      .object({
        name: requiredString("Conversation node name is required"),
        isStart: z.literal(true).optional(),
        startSpeaker: z.enum(["agent", "user"]).optional(),
        instructions: flowNodeInstructionsSchema,
        endCall: endCallToolSchema.optional(),
        extractVariables: extractVariablesToolSchema.optional(),
        ivrNavigation: ivrNavigationToolSchema.optional(),
        transferCall: transferCallToolSchema.optional(),
        toolIds: z.array(z.string().trim().min(1)).optional(),
      })
      .strict(),
  }),
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("end"),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z
      .object({
        name: requiredString("End node name is required"),
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
    variable: requiredString("Transition variable is required"),
    operator: expressionOperatorSchema,
    value: z.string().optional(),
  })
  .strict()
  .refine(
    (condition) =>
      valuelessOperators.has(condition.operator) ||
      (condition.value?.trim().length ?? 0) > 0,
    {
      message: "Value is required for this operator",
      path: ["value"],
    }
  )

export const flowEdgeConditionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("prompt"),
      prompt: requiredString("Transition prompt is required"),
    })
    .strict(),
  z
    .object({
      type: z.literal("expression"),
      match: z.enum(["all", "any"]),
      conditions: z
        .array(expressionConditionSchema)
        .min(1, "Add at least one transition condition"),
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
    turnHandling: turnHandlingConfigSchema,
    backgroundAudio: backgroundAudioSchema.exactOptional(),
    call: callSettingsSchema,
    globalPrompt: z.string(),
    timezone: z.string(),
    dynamicVariables: z.array(dynamicVariableSchema),
    tools: z.array(agentToolSchema),
    nodes: z.array(flowNodeConfigSchema).min(1, "Add at least one node"),
    edges: z.array(flowEdgeConfigSchema),
  })
  .superRefine((config, ctx) => {
    const toolIds = new Set<string>()
    const toolNames = new Set<string>()

    config.tools.forEach((tool, index) => {
      if (toolIds.has(tool.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "id"],
          message: "Duplicate tool",
        })
      }
      toolIds.add(tool.id)

      if (toolNames.has(tool.name)) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", index, "name"],
          message: "Duplicate tool name",
        })
      }
      toolNames.add(tool.name)

      if (tool.type !== "webhook") {
        return
      }

      const parameterNames = new Set<string>()
      tool.parameters.forEach((parameter, parameterIndex) => {
        if (parameterNames.has(parameter.name)) {
          ctx.addIssue({
            code: "custom",
            path: ["tools", index, "parameters", parameterIndex, "name"],
            message: "Duplicate parameter name",
          })
        }
        parameterNames.add(parameter.name)
      })

      const responseNames = new Set<string>()
      tool.responseVariables.forEach((variable, variableIndex) => {
        if (responseNames.has(variable.name)) {
          ctx.addIssue({
            code: "custom",
            path: ["tools", index, "responseVariables", variableIndex, "name"],
            message: "Duplicate response variable",
          })
        }
        responseNames.add(variable.name)
      })
    })

    const nodeIds = new Set<string>()
    let startCount = 0

    config.nodes.forEach((node, index) => {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", index],
          message: "Duplicate node",
        })
      }
      nodeIds.add(node.id)

      if (node.type === "conversation" && node.data.isStart === true) {
        startCount += 1
      }

      if (node.type === "conversation" && node.data.toolIds) {
        const seenToolIds = new Set<string>()
        node.data.toolIds.forEach((toolId, toolIndex) => {
          if (!toolIds.has(toolId)) {
            ctx.addIssue({
              code: "custom",
              path: ["nodes", index, "data", "toolIds", toolIndex],
              message: "Unknown tool",
            })
          }
          if (seenToolIds.has(toolId)) {
            ctx.addIssue({
              code: "custom",
              path: ["nodes", index, "data", "toolIds", toolIndex],
              message: "Duplicate tool",
            })
          }
          seenToolIds.add(toolId)
        })
      }
    })

    if (startCount === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["nodes"],
        message: "Add a start node to the flow",
      })
    } else if (startCount > 1) {
      config.nodes.forEach((node, index) => {
        if (node.type === "conversation" && node.data.isStart === true) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes", index],
            message: "Only one start node is allowed",
          })
        }
      })
    }

    const edgeIds = new Set<string>()
    const sourceTargetKeys = new Set<string>()
    const edgesBySource = new Map<string, number>()

    config.edges.forEach((edge, index) => {
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "Duplicate transition",
        })
      }
      edgeIds.add(edge.id)

      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "Transition is disconnected",
        })
      }

      const key = `${edge.source}-${edge.target}`
      if (sourceTargetKeys.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "Duplicate transition",
        })
      }
      sourceTargetKeys.add(key)
      edgesBySource.set(edge.source, (edgesBySource.get(edge.source) ?? 0) + 1)
    })

    config.edges.forEach((edge, index) => {
      if (
        edge.data.condition.type === "always" &&
        (edgesBySource.get(edge.source) ?? 0) > 1
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "Always transition must be the only transition on that node",
        })
      }
    })

    const knownVariables = new Set<string>(reservedVariableKeys)
    const dynamicKeys = new Set<string>()
    config.dynamicVariables.forEach((variable, index) => {
      if (dynamicKeys.has(variable.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["dynamicVariables", index, "key"],
          message: "Duplicate variable key",
        })
      }
      dynamicKeys.add(variable.key)
      knownVariables.add(variable.key)
    })

    const texts = [config.globalPrompt]
    const expressionKeys: string[] = []
    const webhookRequests: { parameters: string[]; texts: string[] }[] = []

    for (const node of config.nodes) {
      if (node.type !== "conversation") {
        continue
      }
      const data = node.data
      texts.push(data.instructions.text)
      if (data.endCall) {
        texts.push(data.endCall.description)
      }
      if (data.ivrNavigation) {
        texts.push(data.ivrNavigation.description)
      }
      for (const variable of data.extractVariables?.variables ?? []) {
        knownVariables.add(variable.key)
        texts.push(variable.description)
      }
      for (const destination of data.transferCall?.destinations ?? []) {
        texts.push(destination.condition)
      }
    }
    for (const edge of config.edges) {
      const condition = edge.data.condition
      if (condition.type === "prompt") {
        texts.push(condition.prompt)
      }
      if (condition.type === "expression") {
        expressionKeys.push(
          ...condition.conditions.map((entry) => entry.variable)
        )
      }
    }
    for (const tool of config.tools) {
      if (tool.type !== "webhook") {
        continue
      }
      for (const variable of tool.responseVariables) {
        knownVariables.add(variable.name)
      }
      texts.push(
        tool.description,
        ...tool.parameters.map((parameter) => parameter.description)
      )
      webhookRequests.push({
        parameters: tool.parameters.map((parameter) => parameter.name),
        texts: [
          tool.url,
          tool.body,
          ...tool.headers.flatMap((header) => [header.key, header.value]),
          ...tool.queryParameters.flatMap((parameter) => [
            parameter.key,
            parameter.value,
          ]),
        ],
      })
    }

    const reported = new Set<string>()
    const reportUnknown = (text: string, keys: Set<string>) => {
      for (const match of text.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/g)) {
        const key = match[1]
        if (!key || keys.has(key) || reported.has(key)) {
          continue
        }
        reported.add(key)
        ctx.addIssue({
          code: "custom",
          message: `Unknown variable "{{${key}}}"`,
        })
      }
    }

    for (const text of texts) {
      reportUnknown(text, knownVariables)
    }
    for (const key of expressionKeys) {
      const name = key.trim()
      if (!name || knownVariables.has(name) || reported.has(name)) {
        continue
      }
      reported.add(name)
      ctx.addIssue({
        code: "custom",
        message: /^[a-z0-9_]+$/.test(name)
          ? `Unknown variable "{{${name}}}"`
          : "Variable key must be lowercase letters, numbers, or underscores",
      })
    }
    for (const request of webhookRequests) {
      const keys = new Set([...knownVariables, ...request.parameters])
      for (const text of request.texts) {
        reportUnknown(text, keys)
      }
    }
  })
