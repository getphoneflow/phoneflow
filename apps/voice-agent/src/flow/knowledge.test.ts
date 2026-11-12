import { beforeEach, describe, expect, it, vi } from "vitest"

import { embedTexts } from "@/flow/embed"
import { retrieveKnowledge } from "@/flow/knowledge"
import { searchKnowledgeChunks } from "@/flow/qdrant"

vi.mock("@/flow/embed", () => ({
  embedTexts: vi.fn(async () => [[0.1, 0.2]]),
}))

vi.mock("@/flow/qdrant", () => ({
  searchKnowledgeChunks: vi.fn(async () => ["Open from 9 to 5."]),
}))

const input = {
  organizationId: "org-1",
  documentIds: ["doc-1", "doc-2"],
  instructionsType: "prompt" as const,
  query: "When are you open?",
}

describe("retrieveKnowledge", () => {
  beforeEach(() => {
    vi.mocked(searchKnowledgeChunks).mockResolvedValue(["Open from 9 to 5."])
    vi.mocked(embedTexts).mockResolvedValue([[0.1, 0.2]])
  })

  it("searches the node's documents in the call organization", async () => {
    const knowledge = await retrieveKnowledge(input)

    expect(searchKnowledgeChunks).toHaveBeenCalledWith({
      organizationId: "org-1",
      documentIds: ["doc-1", "doc-2"],
      vector: [0.1, 0.2],
    })
    expect(knowledge).toBe("## Related knowledge\n\nOpen from 9 to 5.")
  })

  it("returns nothing when the node has no documents", async () => {
    const knowledge = await retrieveKnowledge({ ...input, documentIds: [] })

    expect(knowledge).toBeNull()
    expect(searchKnowledgeChunks).not.toHaveBeenCalled()
  })

  it("does not retrieve for a say node", async () => {
    const knowledge = await retrieveKnowledge({
      ...input,
      instructionsType: "say",
    })

    expect(knowledge).toBeNull()
    expect(embedTexts).not.toHaveBeenCalled()
  })

  it("leaves the turn unchanged when search fails or finds nothing", async () => {
    vi.mocked(searchKnowledgeChunks).mockRejectedValueOnce(new Error("down"))
    await expect(retrieveKnowledge(input)).resolves.toBeNull()

    vi.mocked(searchKnowledgeChunks).mockResolvedValueOnce([])
    await expect(retrieveKnowledge(input)).resolves.toBeNull()
  })
})
