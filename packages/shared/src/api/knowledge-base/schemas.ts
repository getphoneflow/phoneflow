import { z } from "zod"

export const knowledgeBaseDocumentIdParamsSchema = z.object({
  id: z.uuid(),
})

export const indexKnowledgeBaseDocumentRequestSchema = z
  .object({
    status: z.enum(["ready", "failed"]),
  })
  .strict()
