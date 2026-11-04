import { Queue } from "bullmq"
import { BullMQOtel } from "bullmq-otel"

import { connection } from "@/lib/redis"

const telemetry = new BullMQOtel({
  tracerName: "api",
  meterName: "api",
  enableMetrics: true,
})

export const emailsQueue = new Queue("emails", { connection, telemetry })

export const batchCallsQueue = new Queue("batch-calls", {
  connection,
  telemetry,
})
