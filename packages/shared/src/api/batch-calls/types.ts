import type { z } from "zod"

import type {
  batchCallRecipientListQuerySchema,
  batchCallRecipientSchema,
  batchCallRecipientStatusSchema,
  batchCallScheduleSchema,
  createBatchCallRequestSchema,
} from "./schemas"

// `triggered` only exists on batches dispatched before pacing was introduced.
export type BatchCallStatus =
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "triggered"

export type BatchCallPauseReason =
  | "manual"
  | "insufficient_credits"
  | "phone_number_unavailable"

export type BatchCallSchedule = z.infer<typeof batchCallScheduleSchema>

export type BatchCallRecipientStatus = z.infer<
  typeof batchCallRecipientStatusSchema
>

export type BatchCallRecipientInput = z.infer<typeof batchCallRecipientSchema>

export type CreateBatchCallRequest = z.infer<
  typeof createBatchCallRequestSchema
>

export type CreateBatchCallResponse = {
  id: string
}

export type TriggerBatchCallResponse = {
  ok: true
}

export type BatchCallTickResponse = {
  status: BatchCallStatus
  nextDelayMs: number | null
}

export type BatchCallActionResponse = {
  ok: true
}

export type BatchCallListItem = {
  id: string
  organizationId: string
  name: string
  phoneNumberId: string
  agentId: string
  agentVersionId: string | null
  status: BatchCallStatus
  pauseReason: BatchCallPauseReason | null
  maxConcurrentCalls: number
  schedule: BatchCallSchedule | null
  scheduledAt: Date | null
  totalCount: number
  createdAt: Date
  updatedAt: Date
  phoneNumber: { number: string } | null
  agent: { name: string } | null
  agentVersion: { number: number } | null
}

export type BatchCallListResponse = BatchCallListItem[]

export type BatchCallRecipientCounts = Record<BatchCallRecipientStatus, number>

export type BatchCallDetailResponse = BatchCallListItem & {
  counts: BatchCallRecipientCounts
}

export type BatchCallRecipientListQuery = z.infer<
  typeof batchCallRecipientListQuerySchema
>

export type BatchCallRecipientListItem = {
  id: string
  toNumber: string
  status: BatchCallRecipientStatus
  callId: string | null
  error: string | null
  dialedAt: Date | null
  updatedAt: Date
}

export type BatchCallRecipientListResponse = {
  items: BatchCallRecipientListItem[]
  total: number
  page: number
  pageSize: number
}
