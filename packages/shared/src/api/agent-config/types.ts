import type { z } from "zod"

import type {
  agentConfigSchema,
  agentToolSchema,
  backgroundAudioSchema,
  endCallToolSchema,
  expressionConditionSchema,
  expressionOperatorSchema,
  extractVariableSchema,
  extractVariablesToolSchema,
  flowEdgeConditionSchema,
  flowEdgeConfigSchema,
  flowNodeConfigSchema,
  flowNodeInstructionsSchema,
  ivrNavigationToolSchema,
  transferCallToolSchema,
  webhookToolSchema,
} from "./schemas"

export type AgentConfig = z.infer<typeof agentConfigSchema>
export type AgentTool = z.infer<typeof agentToolSchema>
export type WebhookTool = z.infer<typeof webhookToolSchema>
export type ToolParameter = WebhookTool["parameters"][number]
export type ToolKeyValue = WebhookTool["headers"][number]
export type ResponseVariable = WebhookTool["responseVariables"][number]
export type BackgroundAudio = z.infer<typeof backgroundAudioSchema>
export type FlowNodeInstructions = z.infer<typeof flowNodeInstructionsSchema>
export type EndCallTool = z.infer<typeof endCallToolSchema>
export type IvrNavigationTool = z.infer<typeof ivrNavigationToolSchema>
export type ExtractVariable = z.infer<typeof extractVariableSchema>
export type ExtractVariablesTool = z.infer<typeof extractVariablesToolSchema>
export type TransferCallTool = z.infer<typeof transferCallToolSchema>
export type FlowNodeConfig = z.infer<typeof flowNodeConfigSchema>
export type FlowConversationNode = Extract<
  FlowNodeConfig,
  { type: "conversation" }
>
export type FlowEndNode = Extract<FlowNodeConfig, { type: "end" }>
export type FlowEdgeConfig = z.infer<typeof flowEdgeConfigSchema>
export type FlowEdgeCondition = z.infer<typeof flowEdgeConditionSchema>
export type ExpressionCondition = z.infer<typeof expressionConditionSchema>
export type ExpressionOperator = z.infer<typeof expressionOperatorSchema>
