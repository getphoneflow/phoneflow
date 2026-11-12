import { QdrantClient } from "@qdrant/js-client-rest"

import {
  KNOWLEDGE_COLLECTION,
  KNOWLEDGE_TOP_K,
} from "@workspace/shared/knowledge/constants"
import { env } from "@/lib/env"

let client: QdrantClient | undefined

function qdrant() {
  client ??= new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY || undefined,
  })
  return client
}

export async function searchKnowledgeChunks(input: {
  organizationId: string
  documentIds: string[]
  vector: number[]
}) {
  const result = await qdrant().query(KNOWLEDGE_COLLECTION, {
    query: input.vector,
    limit: KNOWLEDGE_TOP_K,
    filter: {
      must: [
        { key: "organizationId", match: { value: input.organizationId } },
        { key: "documentId", match: { any: input.documentIds } },
      ],
    },
    with_payload: true,
  })

  return result.points.flatMap((point) => {
    const text = point.payload?.text
    return typeof text === "string" && text ? [text] : []
  })
}
