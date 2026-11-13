import { toMarkdownBytes } from "@firecrawl/anydoc"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api"
import { qdrant } from "@/lib/qdrant"
import { indexKnowledgeBaseDocument } from "./index"

vi.mock("@/lib/api", () => import("@/tests/mocks/api"))
vi.mock("@/lib/qdrant", () => ({
  qdrant: {
    collectionExists: vi.fn(async () => ({ exists: true })),
    createCollection: vi.fn(),
    createPayloadIndex: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
}))
vi.mock("ai", () => ({
  embedMany: vi.fn(async ({ values }: { values: string[] }) => ({
    embeddings: values.map(() => [0.1, 0.2]),
  })),
}))
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({
    embedding: () => "text-embedding-3-small",
  }),
}))
vi.mock("@firecrawl/anydoc", () => ({
  formatFromExtension: vi.fn(() => "pdf"),
  toMarkdownBytes: vi.fn(),
}))

const file = {
  id: "doc-1",
  organizationId: "org-1",
  name: "hours.md",
  contentType: "text/markdown",
  fileBase64: Buffer.from("# Hours\n\nOpen from 9 to 5.").toString("base64"),
}

describe("indexKnowledgeBaseDocument", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue(file)
    vi.mocked(api.patch).mockResolvedValue({ id: "doc-1" })
  })

  it("parses, chunks, and indexes the document", async () => {
    await indexKnowledgeBaseDocument({ documentId: "doc-1" })

    expect(qdrant.upsert).toHaveBeenCalledWith(
      "knowledge_chunks",
      expect.objectContaining({
        points: [
          expect.objectContaining({
            payload: {
              organizationId: "org-1",
              documentId: "doc-1",
              chunkIndex: 0,
              text: "# Hours\n\nOpen from 9 to 5.",
            },
          }),
        ],
      })
    )
    expect(api.patch).toHaveBeenCalledWith("/knowledge-base/doc-1/index", {
      body: { status: "ready" },
    })
  })

  it("marks the document failed when it cannot be parsed", async () => {
    vi.mocked(api.get).mockResolvedValue({ ...file, name: "scan.pdf" })
    vi.mocked(toMarkdownBytes).mockRejectedValueOnce(new Error("needs OCR"))

    await indexKnowledgeBaseDocument({ documentId: "doc-1" })

    expect(qdrant.upsert).not.toHaveBeenCalled()
    expect(api.patch).toHaveBeenCalledWith("/knowledge-base/doc-1/index", {
      body: { status: "failed" },
    })
  })

  it("marks the document failed when it was deleted", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Document not found"))

    await indexKnowledgeBaseDocument({ documentId: "doc-1" })

    expect(api.patch).toHaveBeenCalledWith("/knowledge-base/doc-1/index", {
      body: { status: "failed" },
    })
  })
})
