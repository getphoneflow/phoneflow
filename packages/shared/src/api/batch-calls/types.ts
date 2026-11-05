import type { z } from "zod"

import type {
  batchCallRecipientSchema,
  createBatchCallRequestSchema,
} from "./schemas"

export type BatchCallStatus = "scheduled" | "triggered"

export type BatchCallRecipientInput = z.infer<typeof batchCallRecipientSchema>

export type CreateBatchCallRequest = z.infer<
  typeof createBatchCallRequestSchema
>

export type CreateBatchCallResponse = {
  id: string
  doNotCallCount: number
}

export type TriggerBatchCallResponse = {
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
  scheduledAt: Date | null
  totalCount: number
  doNotCallSkippedCount: number
  createdAt: Date
  updatedAt: Date
  phoneNumber: { number: string } | null
  agent: { name: string } | null
  agentVersion: { number: number } | null
}

export type BatchCallListResponse = BatchCallListItem[]
