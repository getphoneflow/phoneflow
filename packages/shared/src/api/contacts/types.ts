import type { z } from "zod"

import type { CallListItem } from "@workspace/shared/api/calls/types"
import type {
  contactListQuerySchema,
  contactListSortBySchema,
  contactNumericFilterOperatorSchema,
} from "./schemas"

export type ContactListQuery = z.infer<typeof contactListQuerySchema>
export type ContactListSortBy = z.infer<typeof contactListSortBySchema>
export type ContactNumericFilterOperator = z.infer<
  typeof contactNumericFilterOperatorSchema
>

export type ContactListItem = {
  id: string
  organizationId: string
  phoneNumber: string | null
  externalId: string | null
  firstName: string | null
  lastName: string | null
  callCount: number
  totalDurationMs: number
  firstCallAt: Date | null
  latestCallAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type ContactListResponse = {
  items: ContactListItem[]
  total: number
  page: number
  pageSize: number
}

export type ContactDetailResponse = ContactListItem & {
  calls: CallListItem[]
}

export type ContactDownloadResponse = ContactListItem[]

export type RequestContactDownloadResponse = {
  ok: true
}
