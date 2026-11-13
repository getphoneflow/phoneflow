import type { DeleteKnowledgeBaseDocumentPayload } from "@workspace/shared/jobs/knowledge-base/types"
import { deleteDocument } from "@/knowledge-base/utils/store"

export async function deleteKnowledgeBaseDocument({
  documentId,
  organizationId,
}: DeleteKnowledgeBaseDocumentPayload) {
  await deleteDocument({ organizationId, documentId })
}
