import { embedTexts } from "@/flow/embed"
import { searchKnowledgeChunks } from "@/flow/qdrant"

export async function retrieveKnowledge(input: {
  organizationId: string
  documentIds: string[]
  instructionsType: "prompt" | "say"
  query: string
}) {
  if (input.instructionsType === "say" || input.documentIds.length === 0) {
    return null
  }

  const query = input.query.trim()
  if (!query) return null

  try {
    const [vector] = await embedTexts([query])
    if (!vector) return null

    const chunks = await searchKnowledgeChunks({
      organizationId: input.organizationId,
      documentIds: input.documentIds,
      vector,
    })
    if (!chunks.length) return null

    return ["## Related knowledge", ...chunks].join("\n\n")
  } catch {
    return null
  }
}
