import { z } from "zod"

import { MAX_KNOWLEDGE_TEXT_CHARS } from "@workspace/shared/knowledge/constants"

export const knowledgeDocumentIdParamsSchema = z.object({
  id: z.uuid(),
})

export const createKnowledgeTextRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "schemas.knowledge_documents.name.required")
      .max(255, "schemas.knowledge_documents.name.max"),
    text: z
      .string()
      .trim()
      .min(1, "schemas.knowledge_documents.text.required")
      .max(MAX_KNOWLEDGE_TEXT_CHARS, "schemas.knowledge_documents.text.max"),
  })
  .strict()

export const indexKnowledgeDocumentRequestSchema = z
  .object({
    status: z.enum(["indexing", "ready", "failed"]),
    error: z.string().nullable().optional(),
    extractedMarkdown: z.string().nullable().optional(),
  })
  .strict()
