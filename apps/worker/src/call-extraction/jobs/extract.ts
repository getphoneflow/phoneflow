import { createOpenAI } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { z } from "zod"

import type { CallExtractionJobResponse } from "@workspace/shared/api/call-extractions/types"
import type { ExtractCallPayload } from "@workspace/shared/jobs/call-extraction/types"
import { extractionValueSchema } from "@/call-extraction/utils/schema"
import { api } from "@/lib/api"
import { env } from "@/lib/env"

function openAiModelId(model: string) {
  const slash = model.indexOf("/")
  return model.slice(slash + 1)
}

export async function extract(payload: ExtractCallPayload) {
  const ids = payload.callExtractionIds.join(",")
  const input = await api.get<CallExtractionJobResponse>(
    `/calls/${payload.callId}/extraction?ids=${ids}`
  )
  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
  const results = []

  for (const extraction of input.extractions) {
    try {
      const result = await generateText({
        model: openai(openAiModelId(extraction.model)),
        output: Output.object({
          schema: z.object({
            value: extractionValueSchema(extraction.schema),
          }),
          name: "call_extraction",
          description: extraction.description,
        }),
        prompt: JSON.stringify(input.transcript),
      })
      results.push({
        id: extraction.id,
        name: extraction.name,
        status: "completed" as const,
        model: extraction.model,
        schema: extraction.schema,
        value: result.output.value,
      })
    } catch {
      results.push({
        id: extraction.id,
        name: extraction.name,
        status: "failed" as const,
        model: extraction.model,
        schema: extraction.schema,
        value: null,
      })
    }
  }

  await api.patch(`/calls/${payload.callId}/extraction`, {
    body: { results },
  })
}
