import { extract } from "@/call-extraction/jobs/extract"
import { createWorker } from "@/lib/workers"

export const callExtractionWorker = createWorker(
  "call-extraction",
  async (job) => {
    switch (job.name) {
      case "extract":
        return extract(job.data)
      default:
        throw new Error(`Unknown job: ${job.name}`)
    }
  }
)
