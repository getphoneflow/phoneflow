import type {
  IndexKnowledgeDocumentRequest,
  KnowledgeDocumentSourceResponse,
} from "@workspace/shared/api/knowledge-documents/types"
import type { IndexKnowledgeDocumentPayload } from "@workspace/shared/jobs/knowledge-documents/types"
import { chunkMarkdown } from "@/knowledge/chunk"
import { EmbeddingError, embedTexts } from "@/knowledge/embed"
import { documentToMarkdown, PermanentParseError } from "@/knowledge/parse"
import { deleteDocumentPoints, replaceDocumentPoints } from "@/knowledge/qdrant"
import { api } from "@/lib/api"
import { ApiError } from "@/lib/api-error"

async function mark(documentId: string, body: IndexKnowledgeDocumentRequest) {
  try {
    await api.patch(`/knowledge-documents/${documentId}/index`, { body })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false
    throw error
  }
  return true
}

export async function indexKnowledgeDocument({
  documentId,
}: IndexKnowledgeDocumentPayload) {
  let source: KnowledgeDocumentSourceResponse
  try {
    source = await api.get<KnowledgeDocumentSourceResponse>(
      `/knowledge-documents/${documentId}/source`
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return
    throw error
  }

  await mark(documentId, { status: "indexing", error: null })

  try {
    const markdown =
      source.source === "text"
        ? (source.text ?? "")
        : await documentToMarkdown(
            Buffer.from(source.fileBase64 ?? "", "base64"),
            source.fileName ?? "document"
          )
    const chunks = chunkMarkdown(markdown)
    if (!chunks.length) {
      throw new PermanentParseError("This document has no extractable text.")
    }

    const vectors = await embedTexts(chunks)
    await replaceDocumentPoints(
      source.organizationId,
      source.id,
      chunks.map((text, chunkIndex) => ({
        id: crypto.randomUUID(),
        vector: vectors[chunkIndex] ?? [],
        organizationId: source.organizationId,
        documentId: source.id,
        chunkIndex,
        text,
      }))
    )

    const updated = await mark(documentId, {
      status: "ready",
      error: null,
      extractedMarkdown: markdown,
    })
    if (!updated) {
      await deleteDocumentPoints(source.organizationId, source.id)
    }
  } catch (error) {
    if (
      error instanceof PermanentParseError ||
      error instanceof EmbeddingError
    ) {
      await mark(documentId, { status: "failed", error: error.message })
      return
    }
    throw error
  }
}
