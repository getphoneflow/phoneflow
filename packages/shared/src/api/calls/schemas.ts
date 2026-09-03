import { z } from "zod"

export const startWebCallRequestSchema = z
  .object({
    agentId: z.uuid(),
    agentVersionId: z.uuid().nullable(),
    livekitRoomName: z.string().trim().min(1),
    startedAt: z.iso.datetime(),
  })
  .strict()

export const startInboundCallRequestSchema = z
  .object({
    fromNumber: z.string(),
    toNumber: z.e164(),
    livekitRoomName: z.string().trim().min(1),
    startedAt: z.iso.datetime(),
  })
  .strict()

export const startOutboundCallRequestSchema = z
  .object({
    agentId: z.uuid(),
    agentVersionId: z.uuid().nullable(),
    fromNumber: z.e164(),
    toNumber: z.e164(),
    livekitRoomName: z.string().trim().min(1),
    startedAt: z.iso.datetime(),
    batchCallId: z.uuid().nullable(),
  })
  .strict()

export const unansweredCallRequestSchema = z
  .object({
    agentId: z.uuid(),
    agentVersionId: z.uuid().nullable(),
    fromNumber: z.e164(),
    toNumber: z.e164(),
    livekitRoomName: z.string().trim().min(1),
    startedAt: z.iso.datetime(),
    endedAt: z.iso.datetime(),
    batchCallId: z.uuid().nullable(),
  })
  .strict()

export const callTranscriptItemSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1),
    createdAt: z.number().int().nonnegative(),
  })
  .strict()

export const callTranscriptSchema = z.array(callTranscriptItemSchema)

export const completeCallRequestSchema = z
  .object({
    callId: z.uuid(),
    endedAt: z.iso.datetime(),
    status: z.enum(["completed"]),
    transcript: callTranscriptSchema,
    variables: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export const triggerOutboundCallRequestSchema = z
  .object({
    phoneNumberId: z.uuid(),
    toNumber: z.e164(),
    agentId: z.uuid(),
    agentVersionId: z.uuid().nullable().optional(),
    variables: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export const callListSortBySchema = z.enum(["startedAt", "duration", "cost"])

export const callNumericFilterOperatorSchema = z.enum([
  "eq",
  "between",
  "gte",
  "lte",
])

export const callListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .refine((value) => [10, 20, 30, 40, 50].includes(value))
      .default(10),
    channel: z.enum(["phone_call", "web_call"]).optional(),
    direction: z.enum(["inbound", "outbound"]).optional(),
    status: z.enum(["in_progress", "completed", "no_answer"]).optional(),
    startedAtFrom: z.iso.datetime().optional(),
    startedAtTo: z.iso.datetime().optional(),
    agentIds: z.union([z.string(), z.array(z.string())]).optional(),
    fromNumbers: z.union([z.string(), z.array(z.string())]).optional(),
    toNumbers: z.union([z.string(), z.array(z.string())]).optional(),
    costOp: callNumericFilterOperatorSchema.optional(),
    cost: z.coerce.number().nonnegative().optional(),
    costMax: z.coerce.number().nonnegative().optional(),
    durationOp: callNumericFilterOperatorSchema.optional(),
    duration: z.coerce.number().nonnegative().optional(),
    durationMax: z.coerce.number().nonnegative().optional(),
    batchId: z.uuid().optional(),
    sortBy: callListSortBySchema.default("startedAt"),
    sortDir: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
