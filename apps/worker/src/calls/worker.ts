import { Queue, Worker } from "bullmq"
import { BullMQOtel } from "bullmq-otel"

import { connection } from "@/lib/redis"
import { reapStaleCalls } from "./jobs/reap-stale-calls"

const REAP_STALE_CALLS_EVERY_MS = 5 * 60 * 1000

const telemetry = new BullMQOtel({
  tracerName: "worker",
  meterName: "worker",
  enableMetrics: true,
})

export const callsQueue = new Queue("calls", { connection, telemetry })

export const callsWorker = new Worker(
  "calls",
  async (job) => {
    switch (job.name) {
      case "reap-stale-calls":
        return reapStaleCalls()
      default:
        throw new Error(`Unknown job: ${job.name}`)
    }
  },
  { connection, telemetry }
)

callsWorker.on("failed", (job, error) => {
  console.error(`[calls] ${job?.name} failed`, error)
})

export function scheduleStaleCallReaper() {
  return callsQueue.upsertJobScheduler(
    "reap-stale-calls",
    { every: REAP_STALE_CALLS_EVERY_MS },
    {
      name: "reap-stale-calls",
      opts: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    }
  )
}
