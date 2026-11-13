import type { KnowledgeBaseDocumentFileResponse } from "@workspace/shared/api/knowledge-base/types"
import type { IndexKnowledgeBaseDocumentPayload } from "@workspace/shared/jobs/knowledge-base/types"
import { chunkMarkdown } from "@/knowledge-base/utils/chunk"
import { embedChunks } from "@/knowledge-base/utils/embed"
import { documentToMarkdown } from "@/knowledge-base/utils/markdown"
import { storeDocument } from "@/knowledge-base/utils/store"
import { api } from "@/lib/api"

export async function indexKnowledgeBaseDocument({
  documentId,
}: IndexKnowledgeBaseDocumentPayload) {
  try {
    const file = await api.get<KnowledgeBaseDocumentFileResponse>(
      `/knowledge-base/${documentId}/file`
    )

    const markdown = await documentToMarkdown(
      Buffer.from(file.fileBase64, "base64"),
      file.name
    )

    const chunks = chunkMarkdown(markdown)
    if (!chunks.length) {
      throw new Error("This document has no extractable text")
    }

    const embeddings = await embedChunks(chunks)

    await storeDocument({
      organizationId: file.organizationId,
      documentId: file.id,
      chunks,
      embeddings,
    })

    await api.patch(`/knowledge-base/${documentId}/index`, {
      body: { status: "ready" },
    })
  } catch {
    await api.patch(`/knowledge-base/${documentId}/index`, {
      body: { status: "failed" },
    })
  }
}
