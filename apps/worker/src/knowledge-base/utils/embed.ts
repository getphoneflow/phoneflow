import { createOpenAI } from "@ai-sdk/openai"
import { embedMany } from "ai"

import {
  KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS,
  KNOWLEDGE_BASE_EMBEDDING_MODEL,
} from "@workspace/shared/knowledge/constants"
import { env } from "@/lib/env"

export async function embedChunks(chunks: string[]) {
  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })

  const { embeddings } = await embedMany({
    model: openai.embedding(KNOWLEDGE_BASE_EMBEDDING_MODEL),
    values: chunks,
    dimensions: KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS,
  })

  return embeddings
}
