import type { z } from "zod"

import type { callTranscriptSchema } from "@workspace/shared/api/calls/schemas"
import type {
  callExtractionRequestSchema,
  callExtractionRunSchema,
  callExtractionSchemaSchema,
} from "./schemas"

export type CallExtractionSchema = z.infer<typeof callExtractionSchemaSchema>

export type CallExtractionRequest = z.infer<typeof callExtractionRequestSchema>

export type CallExtractionRun = z.infer<typeof callExtractionRunSchema>

export type CallExtractionResponse = {
  id: string
  name: string
  description: string
  model: string
  schema: CallExtractionSchema
  createdAt: Date
  updatedAt: Date
}

export type CallExtractionListResponse = (CallExtractionResponse & {
  agents: { agentId: string }[]
})[]

export type DeleteCallExtractionResponse = {
  id: string
}

export type RerunCallExtractionResponse = {
  ok: true
}

export type CallExtractionInput = {
  id: string
  name: string
  description: string
  model: string
  schema: CallExtractionSchema
}

export type CallExtractionJobResponse = {
  callId: string
  transcript: z.infer<typeof callTranscriptSchema>
  extractions: CallExtractionInput[]
}
