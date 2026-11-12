import { Worker } from "bullmq"
import { BullMQOtel } from "bullmq-otel"

import type {
  DeleteKnowledgeDocumentPayload,
  IndexKnowledgeDocumentPayload,
} from "@workspace/shared/jobs/knowledge-documents/types"
import { connection } from "@/lib/redis"
import { deleteKnowledgeDocument } from "./jobs/delete-document"
import { indexKnowledgeDocument } from "./jobs/index-document"

const telemetry = new BullMQOtel({
  tracerName: "worker",
  meterName: "worker",
  enableMetrics: true,
})

export const knowledgeDocumentsWorker = new Worker(
  "knowledge-documents",
  async (job) => {
    switch (job.name) {
      case "index-document":
        return indexKnowledgeDocument(job.data as IndexKnowledgeDocumentPayload)
      case "delete-document":
        return deleteKnowledgeDocument(
          job.data as DeleteKnowledgeDocumentPayload
        )
      default:
        throw new Error(`Unknown job: ${job.name}`)
    }
  },
  { connection, telemetry }
)
