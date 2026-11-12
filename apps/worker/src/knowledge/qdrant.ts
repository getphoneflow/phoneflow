import { QdrantClient } from "@qdrant/js-client-rest"

import {
  EMBEDDING_DIMENSIONS,
  KNOWLEDGE_COLLECTION,
} from "@workspace/shared/knowledge/constants"
import { env } from "@/lib/env"

let client: QdrantClient | undefined
let ready: Promise<void> | undefined

function qdrant() {
  client ??= new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY || undefined,
  })
  return client
}

async function ensureCollection() {
  ready ??= (async () => {
    const existing = await qdrant().collectionExists(KNOWLEDGE_COLLECTION)
    if (existing.exists) return

    await qdrant().createCollection(KNOWLEDGE_COLLECTION, {
      vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
    })
    await qdrant().createPayloadIndex(KNOWLEDGE_COLLECTION, {
      field_name: "organizationId",
      field_schema: "keyword",
      wait: true,
    })
    await qdrant().createPayloadIndex(KNOWLEDGE_COLLECTION, {
      field_name: "documentId",
      field_schema: "keyword",
      wait: true,
    })
  })().catch((error) => {
    ready = undefined
    throw error
  })

  await ready
}

export type KnowledgePoint = {
  id: string
  vector: number[]
  organizationId: string
  documentId: string
  chunkIndex: number
  text: string
}

export async function replaceDocumentPoints(
  organizationId: string,
  documentId: string,
  points: KnowledgePoint[]
) {
  await ensureCollection()
  await deleteDocumentPoints(organizationId, documentId)
  if (points.length === 0) return

  await qdrant().upsert(KNOWLEDGE_COLLECTION, {
    wait: true,
    points: points.map((point) => ({
      id: point.id,
      vector: point.vector,
      payload: {
        organizationId: point.organizationId,
        documentId: point.documentId,
        chunkIndex: point.chunkIndex,
        text: point.text,
      },
    })),
  })
}

export async function deleteDocumentPoints(
  organizationId: string,
  documentId: string
) {
  const existing = await qdrant().collectionExists(KNOWLEDGE_COLLECTION)
  if (!existing.exists) return

  await qdrant().delete(KNOWLEDGE_COLLECTION, {
    wait: true,
    filter: {
      must: [
        { key: "organizationId", match: { value: organizationId } },
        { key: "documentId", match: { value: documentId } },
      ],
    },
  })
}
