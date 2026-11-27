import { createWorker } from "@/lib/workers"
import { deleteKnowledgeBaseDocument } from "./jobs/delete"
import { indexKnowledgeBaseDocument } from "./jobs/index"

export const knowledgeBaseWorker = createWorker(
  "knowledge-base",
  async (job) => {
    switch (job.name) {
      case "index":
        return indexKnowledgeBaseDocument(job.data)
      case "delete":
        return deleteKnowledgeBaseDocument(job.data)
      default:
        throw new Error(`Unknown job: ${job.name}`)
    }
  }
)
