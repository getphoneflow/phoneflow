import { createOpenAI } from "@ai-sdk/openai"
import { embedMany } from "ai"

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "@workspace/shared/knowledge/constants"
import { env } from "@/lib/env"

export class EmbeddingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EmbeddingError"
  }
}

export async function embedTexts(values: string[]) {
  if (!env.OPENAI_API_KEY) {
    throw new EmbeddingError(
      "OPENAI_API_KEY is not configured, so this document cannot be indexed."
    )
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

  if (embeddings.some((vector) => vector.length !== EMBEDDING_DIMENSIONS)) {
    throw new EmbeddingError("The embedding model returned an unexpected size.")
  }

  return embeddings
}
