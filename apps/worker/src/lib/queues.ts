import { Queue } from "bullmq"
import { BullMQOtel } from "bullmq-otel"

import { connection } from "@/lib/redis"

const telemetry = new BullMQOtel({
  tracerName: "worker",
  meterName: "worker",
  enableMetrics: true,
})

export const batchCallsQueue = new Queue("batch-calls", {
  connection,
  telemetry,
})
