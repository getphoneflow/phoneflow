import type { DeleteKnowledgeDocumentPayload } from "@workspace/shared/jobs/knowledge-documents/types"
import { deleteDocumentPoints } from "@/knowledge/qdrant"

export async function deleteKnowledgeDocument({
  documentId,
  organizationId,
}: DeleteKnowledgeDocumentPayload) {
  await deleteDocumentPoints(organizationId, documentId)
}
