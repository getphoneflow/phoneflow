import { createOpenAI } from "@ai-sdk/openai"
import { embedMany } from "ai"

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "@workspace/shared/knowledge/constants"
import { env } from "@/lib/env"

export async function embedTexts(values: string[]) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
    ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
  })

  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values,
    dimensions: EMBEDDING_DIMENSIONS,
  })

  return embeddings
}
