import { z } from "zod"

import {
  isValidTimeZone,
  MAX_CONCURRENT_CALLS_LIMIT,
} from "@workspace/shared/api/batch-calls/schedule"

export const batchCallIdParamsSchema = z.object({
  id: z.uuid(),
})

export const batchCallRecipientSchema = z
  .object({
    toNumber: z.e164(),
    variables: z.record(z.string(), z.string()).optional(),
  })
  .strict()

const batchCallScheduleTimeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "schemas.batch_calls.schedule.time_format"
  )

export const batchCallScheduleSchema = z
  .object({
    timezone: z
      .string()
      .refine(isValidTimeZone, "schemas.batch_calls.schedule.timezone_invalid"),
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1, "schemas.batch_calls.schedule.days_required")
      .refine(
        (days) => new Set(days).size === days.length,
        "schemas.batch_calls.schedule.days_duplicate"
      ),
    startTime: batchCallScheduleTimeSchema,
    endTime: batchCallScheduleTimeSchema,
  })
  .strict()
  .refine((schedule) => schedule.startTime !== schedule.endTime, {
    path: ["endTime"],
    message: "schemas.batch_calls.schedule.empty_window",
  })

export const maxConcurrentCallsSchema = z
  .number("schemas.batch_calls.max_concurrent_calls.invalid")
  .int("schemas.batch_calls.max_concurrent_calls.invalid")
  .min(1, "schemas.batch_calls.max_concurrent_calls.invalid")
  .max(
    MAX_CONCURRENT_CALLS_LIMIT,
    "schemas.batch_calls.max_concurrent_calls.invalid"
  )

export const createBatchCallRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    phoneNumberId: z.uuid(),
    agentId: z.uuid(),
    agentVersionId: z.uuid().nullable().optional(),
    recipients: z.array(batchCallRecipientSchema).min(1).max(500),
    scheduledAt: z.iso.datetime().nullable().optional(),
    maxConcurrentCalls: maxConcurrentCallsSchema.optional(),
    schedule: batchCallScheduleSchema.nullable().optional(),
  })
  .strict()

export const batchCallRecipientStatusSchema = z.enum([
  "pending",
  "dialing",
  "in_progress",
  "completed",
  "no_answer",
  "failed",
  "cancelled",
])

export const batchCallRecipientListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .refine((value) => [10, 20, 30, 40, 50].includes(value))
      .default(10),
    status: batchCallRecipientStatusSchema.optional(),
  })
  .strict()
