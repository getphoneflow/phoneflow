import type { z } from "zod"

import type {
  addCallToDoNotCallRequestSchema,
  addDoNotCallRequestSchema,
  bulkAddDoNotCallRequestSchema,
  checkDoNotCallRequestSchema,
  doNotCallListQuerySchema,
} from "./schemas"

export type DoNotCallSource = "manual" | "import" | "call"

export type DoNotCallListQuery = z.infer<typeof doNotCallListQuerySchema>
export type AddDoNotCallRequest = z.infer<typeof addDoNotCallRequestSchema>
export type BulkAddDoNotCallRequest = z.infer<
  typeof bulkAddDoNotCallRequestSchema
>
export type CheckDoNotCallRequest = z.infer<typeof checkDoNotCallRequestSchema>
export type AddCallToDoNotCallRequest = z.infer<
  typeof addCallToDoNotCallRequestSchema
>

export type DoNotCallNumber = {
  id: string
  organizationId: string
  number: string
  source: DoNotCallSource
  reason: string | null
  callId: string | null
  createdBy: string | null
  createdAt: Date
}

export type DoNotCallListItem = DoNotCallNumber & {
  createdByUser: { name: string } | null
}

export type DoNotCallListResponse = {
  items: DoNotCallListItem[]
  total: number
  page: number
  pageSize: number
}

export type BulkAddDoNotCallResponse = {
  added: number
  alreadyListed: number
  duplicates: number
  invalid: string[]
}

export type CheckDoNotCallResponse = {
  numbers: string[]
}

export type AddCallToDoNotCallResponse = {
  ok: true
}

export type RemoveDoNotCallResponse = {
  ok: true
}
