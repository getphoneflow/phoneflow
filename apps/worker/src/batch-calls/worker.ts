import { createWorker } from "@/lib/workers"
import { processBatchCall } from "./jobs/process-batch-call"

export const batchCallsWorker = createWorker("batch-calls", async (job) => {
  switch (job.name) {
    case "process-batch-call":
      return processBatchCall(job.data)
    default:
      throw new Error(`Unknown job: ${job.name}`)
  }
})
