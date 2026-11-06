import { Worker } from "bullmq"
import { BullMQOtel } from "bullmq-otel"

import { BATCH_CALL_TICK_JOB } from "@workspace/shared/jobs/batch-calls/tick"
import { connection } from "@/lib/redis"
import { processBatchCall } from "./jobs/process-batch-call"
import { tickBatchCallJob } from "./jobs/tick-batch-call"

const telemetry = new BullMQOtel({
  tracerName: "worker",
  meterName: "worker",
  enableMetrics: true,
})

export const batchCallsWorker = new Worker(
  "batch-calls",
  async (job) => {
    switch (job.name) {
      case "process-batch-call":
        return processBatchCall(job.data)
      case BATCH_CALL_TICK_JOB:
        return tickBatchCallJob(job.data)
      default:
        throw new Error(`Unknown job: ${job.name}`)
    }
  },
  // A tick places calls one at a time, so one worker slot per tick would make
  // running batches wait on each other.
  { connection, telemetry, concurrency: 10 }
)
