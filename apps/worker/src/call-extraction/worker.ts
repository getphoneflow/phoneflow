import { Worker } from "bullmq"
import { BullMQOtel } from "bullmq-otel"

import { extract } from "@/call-extraction/jobs/extract"
import { connection } from "@/lib/redis"

const telemetry = new BullMQOtel({
  tracerName: "worker",
  meterName: "worker",
  enableMetrics: true,
})

export const callExtractionWorker = new Worker(
  "call-extraction",
  async (job) => {
    switch (job.name) {
      case "extract":
        return extract(job.data)
      default:
        throw new Error(`Unknown job: ${job.name}`)
    }
  },
  { connection, telemetry }
)
