import { KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS } from "@workspace/shared/knowledge/constants"
import { env } from "@/lib/env"
import { qdrant } from "@/lib/qdrant"

export async function storeDocument({
  organizationId,
  documentId,
  chunks,
  embeddings,
}: {
  organizationId: string
  documentId: string
  chunks: string[]
  embeddings: number[][]
}) {
  const existing = await qdrant.collectionExists(
    env.QDRANT_KNOWLEDGE_BASE_COLLECTION
  )
  if (!existing.exists) {
    await qdrant.createCollection(env.QDRANT_KNOWLEDGE_BASE_COLLECTION, {
      vectors: {
        size: KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS,
        distance: "Cosine",
      },
    })
    await qdrant.createPayloadIndex(env.QDRANT_KNOWLEDGE_BASE_COLLECTION, {
      field_name: "organizationId",
      field_schema: "keyword",
      wait: true,
    })
    await qdrant.createPayloadIndex(env.QDRANT_KNOWLEDGE_BASE_COLLECTION, {
      field_name: "documentId",
      field_schema: "keyword",
      wait: true,
    })
  }

  await qdrant.upsert(env.QDRANT_KNOWLEDGE_BASE_COLLECTION, {
    wait: true,
    points: chunks.map((text, chunkIndex) => ({
      id: crypto.randomUUID(),
      vector: embeddings[chunkIndex] ?? [],
      payload: { organizationId, documentId, chunkIndex, text },
    })),
  })
}

export async function deleteDocument({
  organizationId,
  documentId,
}: {
  organizationId: string
  documentId: string
}) {
  const existing = await qdrant.collectionExists(
    env.QDRANT_KNOWLEDGE_BASE_COLLECTION
  )
  if (!existing.exists) return

  await qdrant.delete(env.QDRANT_KNOWLEDGE_BASE_COLLECTION, {
    wait: true,
    filter: {
      must: [
        { key: "organizationId", match: { value: organizationId } },
        { key: "documentId", match: { value: documentId } },
      ],
    },
  })
}
