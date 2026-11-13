import { createOpenAI } from "@ai-sdk/openai"
import { tool } from "@livekit/agents"
import { embedMany } from "ai"
import { z } from "zod"

import {
  KNOWLEDGE_BASE_COLLECTION,
  KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS,
  KNOWLEDGE_BASE_EMBEDDING_MODEL,
  KNOWLEDGE_BASE_TOP_K,
} from "@workspace/shared/knowledge/constants"
import { env } from "@/lib/env"
import { qdrant } from "@/lib/qdrant"

const DESCRIPTION = `Retrieve information from the knowledge base.
Call this when the user needs information that is not already in the conversation, or you are not sure you have enough detail to answer.`

export function createKnowledgeBaseTool({
  organizationId,
  documentIds,
}: {
  organizationId: string
  documentIds: string[]
}) {
  return tool({
    name: "knowledge_base",
    description: DESCRIPTION,
    parameters: z.object({
      query: z
        .string()
        .describe(
          "Short, targeted search string. Use concrete terms and intent, not the full user message."
        ),
    }),
    execute: async ({ query }) =>
      searchKnowledge({ organizationId, documentIds, query }),
  })
}

async function searchKnowledge({
  organizationId,
  documentIds,
  query,
}: {
  organizationId: string
  documentIds: string[]
  query: string
}) {
  const text = query.trim()

  try {
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })

    const { embeddings } = await embedMany({
      model: openai.embedding(KNOWLEDGE_BASE_EMBEDDING_MODEL),
      values: [text],
      dimensions: KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS,
    })

    const vector = embeddings[0]

    if (!vector) return "No relevant information found"

    const result = await qdrant.query(KNOWLEDGE_BASE_COLLECTION, {
      query: vector,
      limit: KNOWLEDGE_BASE_TOP_K,
      filter: {
        must: [
          { key: "organizationId", match: { value: organizationId } },
          { key: "documentId", match: { any: documentIds } },
        ],
      },
      with_payload: true,
    })

    const chunks = result.points.map((point) => point.payload?.text)

    return chunks.join("\n\n") || "No relevant information found"
  } catch {
    return "Knowledge base search failed"
  }
}
