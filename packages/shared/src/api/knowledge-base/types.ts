import type { z } from "zod"

import type { indexKnowledgeBaseDocumentRequestSchema } from "./schemas"

export type IndexKnowledgeBaseDocumentRequest = z.infer<
  typeof indexKnowledgeBaseDocumentRequestSchema
>

export type KnowledgeBaseDocumentStatus = "processing" | "ready" | "failed"

export type KnowledgeBaseDocumentResponse = {
  id: string
  name: string
  status: KnowledgeBaseDocumentStatus
  byteSize: number
  createdAt: Date
  updatedAt: Date
}

export type KnowledgeBaseDocumentListResponse = KnowledgeBaseDocumentResponse[]

export type DeleteKnowledgeBaseDocumentResponse = {
  id: string
}

export type KnowledgeBaseDocumentFileResponse = {
  id: string
  organizationId: string
  name: string
  contentType: string
  fileBase64: string
}
