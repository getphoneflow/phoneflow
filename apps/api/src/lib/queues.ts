import { Queue } from "bullmq"
import { BullMQOtel } from "bullmq-otel"

import { logger } from "@/lib/logger"
import { connection } from "@/lib/redis"

const telemetry = new BullMQOtel({
  tracerName: "api",
  meterName: "api",
  enableMetrics: true,
})

function createQueue(name: string) {
  const queue = new Queue(name, { connection, telemetry })
  queue.on("error", (error) => {
    logger.warn({ err: error, queue: name }, "Queue error")
  })
  return queue
}

export const emailsQueue = createQueue("emails")
export const batchCallsQueue = createQueue("batch-calls")
export const knowledgeBaseQueue = createQueue("knowledge-base")
export const callExtractionQueue = createQueue("call-extraction")
