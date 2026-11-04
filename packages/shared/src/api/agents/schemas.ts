import { z } from "zod"

import { agentConfigSchema } from "@workspace/shared/api/agent-config/schemas"

const agentNameSchema = z
  .string()
  .trim()
  .min(1, "schemas.agents.agent_name.required")
  .max(64, "schemas.agents.agent_name.max")

export const agentIdParamsSchema = z.object({
  id: z.uuid(),
})

export const agentVersionParamsSchema = z.object({
  id: z.uuid(),
  number: z.coerce.number().int().positive(),
})

export const createAgentRequestSchema = z.object({
  name: agentNameSchema,
  config: agentConfigSchema,
})

export const updateAgentNameRequestSchema = z.object({
  name: agentNameSchema,
})

export const updateAgentConfigRequestSchema = z.object({
  config: agentConfigSchema,
})

export const publishAgentRequestSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
})
