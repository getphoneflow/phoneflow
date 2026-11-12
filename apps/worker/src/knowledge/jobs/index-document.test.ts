import { beforeEach, describe, expect, it, vi } from "vitest"

import { EmbeddingError } from "@/knowledge/embed"
import { indexKnowledgeDocument } from "@/knowledge/jobs/index-document"
import { PermanentParseError } from "@/knowledge/parse"
import { replaceDocumentPoints } from "@/knowledge/qdrant"
import { api } from "@/lib/api"
import { ApiError } from "@/lib/api-error"

vi.mock("@/lib/api", () => import("@/tests/mocks/api"))
vi.mock("@/knowledge/embed", () => ({
  embedTexts: vi.fn(async (values: string[]) => values.map(() => [0.1, 0.2])),
  EmbeddingError: class EmbeddingError extends Error {
    constructor(message: string) {
      super(message)
      this.name = "EmbeddingError"
    }
  },
}))
vi.mock("@/knowledge/parse", async () => {
  const actual =
    await vi.importActual<typeof import("@/knowledge/parse")>(
      "@/knowledge/parse"
    )
  return {
    ...actual,
    documentToMarkdown: vi.fn(),
  }
})
vi.mock("@/knowledge/qdrant", () => ({
  replaceDocumentPoints: vi.fn(),
  deleteDocumentPoints: vi.fn(),
}))

const source = {
  id: "doc-1",
  organizationId: "org-1",
  name: "Hours",
  source: "text" as const,
  fileName: null,
  contentType: "text/plain",
  text: "# Hours\n\nOpen from 9 to 5.",
  fileBase64: null,
}

describe("indexKnowledgeDocument", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue(source)
    vi.mocked(api.patch).mockResolvedValue({ id: "doc-1" })
  })

  it("embeds the document and upserts chunks for its organization", async () => {
    await indexKnowledgeDocument({ documentId: "doc-1" })

    expect(replaceDocumentPoints).toHaveBeenCalledWith("org-1", "doc-1", [
      expect.objectContaining({
        organizationId: "org-1",
        documentId: "doc-1",
        chunkIndex: 0,
        text: "# Hours\n\nOpen from 9 to 5.",
      }),
    ])
    expect(api.patch).toHaveBeenLastCalledWith(
      "/knowledge-documents/doc-1/index",
      {
        body: {
          status: "ready",
          error: null,
          extractedMarkdown: "# Hours\n\nOpen from 9 to 5.",
        },
      }
    )
  })

  it("marks a scanned document as failed and does not index it", async () => {
    const { documentToMarkdown } = await import("@/knowledge/parse")
    vi.mocked(api.get).mockResolvedValue({
      ...source,
      source: "file",
      fileName: "scan.pdf",
      fileBase64: "JVBERg==",
      text: null,
    })
    vi.mocked(documentToMarkdown).mockRejectedValue(
      new PermanentParseError(
        "This document needs OCR (pages 1), which is not supported."
      )
    )

    await indexKnowledgeDocument({ documentId: "doc-1" })

    expect(replaceDocumentPoints).not.toHaveBeenCalled()
    expect(api.patch).toHaveBeenLastCalledWith(
      "/knowledge-documents/doc-1/index",
      {
        body: {
          status: "failed",
          error: "This document needs OCR (pages 1), which is not supported.",
        },
      }
    )
  })

  it("marks the document failed when embeddings are not configured", async () => {
    const { embedTexts } = await import("@/knowledge/embed")
    vi.mocked(embedTexts).mockRejectedValueOnce(
      new EmbeddingError(
        "OPENAI_API_KEY is not configured, so this document cannot be indexed."
      )
    )

    await indexKnowledgeDocument({ documentId: "doc-1" })

    expect(replaceDocumentPoints).not.toHaveBeenCalled()
    expect(api.patch).toHaveBeenLastCalledWith(
      "/knowledge-documents/doc-1/index",
      {
        body: {
          status: "failed",
          error:
            "OPENAI_API_KEY is not configured, so this document cannot be indexed.",
        },
      }
    )
  })

  it("stops when the document was deleted", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError("missing", 404))

    await indexKnowledgeDocument({ documentId: "doc-1" })

    expect(api.patch).not.toHaveBeenCalled()
  })
})
