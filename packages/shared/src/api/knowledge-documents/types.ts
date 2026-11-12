import type { z } from "zod"

import type {
  createKnowledgeTextRequestSchema,
  indexKnowledgeDocumentRequestSchema,
} from "./schemas"

export type CreateKnowledgeTextRequest = z.infer<
  typeof createKnowledgeTextRequestSchema
>
export type IndexKnowledgeDocumentRequest = z.infer<
  typeof indexKnowledgeDocumentRequestSchema
>

export type KnowledgeDocumentSource = "file" | "text"
export type KnowledgeDocumentStatus =
  | "pending"
  | "indexing"
  | "ready"
  | "failed"

export type KnowledgeDocumentResponse = {
  id: string
  name: string
  source: KnowledgeDocumentSource
  status: KnowledgeDocumentStatus
  error: string | null
  fileName: string | null
  byteSize: number
  createdAt: Date
  updatedAt: Date
}

export type KnowledgeDocumentListResponse = KnowledgeDocumentResponse[]

export type DeleteKnowledgeDocumentResponse = {
  id: string
}

export type KnowledgeDocumentSourceResponse = {
  id: string
  organizationId: string
  name: string
  source: KnowledgeDocumentSource
  fileName: string | null
  contentType: string | null
  text: string | null
  fileBase64: string | null
}
