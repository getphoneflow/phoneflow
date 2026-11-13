import { Worker } from "bullmq"
import { BullMQOtel } from "bullmq-otel"

import { connection } from "@/lib/redis"
import { deleteKnowledgeBaseDocument } from "./jobs/delete"
import { indexKnowledgeBaseDocument } from "./jobs/index"

const telemetry = new BullMQOtel({
  tracerName: "worker",
  meterName: "worker",
  enableMetrics: true,
})

export const knowledgeBaseWorker = new Worker(
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
  },
  { connection, telemetry }
)
