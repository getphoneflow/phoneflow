import { type Processor, Worker } from "bullmq"
import { BullMQOtel } from "bullmq-otel"

import { logger } from "@/lib/logger"
import { connection } from "@/lib/redis"

const telemetry = new BullMQOtel({
  tracerName: "worker",
  meterName: "worker",
  enableMetrics: true,
})

export function createWorker(name: string, processor: Processor) {
  const worker = new Worker(name, processor, { connection, telemetry })
  worker.on("ready", () => {
    logger.info({ queue: name }, "Worker ready")
  })
  worker.on("error", (error) => {
    logger.warn({ err: error, queue: name }, "Worker error")
  })
  worker.on("failed", (job, error) => {
    logger.error(
      { err: error, queue: name, job: job?.name, jobId: job?.id },
      "Job failed"
    )
  })
  return worker
}
