import type { z } from "zod"

import type {
  createApiKeyRequestSchema,
  updateApiKeyRequestSchema,
} from "./schemas"

export type ApiKeyPermissions = Record<string, string[]>

export type CreateApiKeyRequest = z.infer<typeof createApiKeyRequestSchema>
export type UpdateApiKeyRequest = z.infer<typeof updateApiKeyRequestSchema>

export type ApiKeyResponse = {
  id: string
  name: string | null
  start: string | null
  permissions: ApiKeyPermissions | null
  createdAt: string | Date
  expiresAt: string | Date | null
}

export type CreateApiKeyResponse = ApiKeyResponse & {
  key: string
}

export type ApiKeyListResponse = {
  apiKeys: ApiKeyResponse[]
  total: number
  limit?: number
  offset?: number
}
export type UpdateApiKeyResponse = ApiKeyResponse
export type DeleteApiKeyResponse = {
  success: boolean
}
