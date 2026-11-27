import { batchCallsWorker } from "@/batch-calls/worker"
import { callExtractionWorker } from "@/call-extraction/worker"
import { emailsWorker } from "@/emails/worker"
import { knowledgeBaseWorker } from "@/knowledge-base/worker"
import { logger } from "@/lib/logger"
import { connection } from "@/lib/redis"
import { sdk } from "./instrumentation"

const workers = [
  emailsWorker,
  batchCallsWorker,
  knowledgeBaseWorker,
  callExtractionWorker,
]

async function handleShutdown() {
  await Promise.all(workers.map((worker) => worker.close()))
  await connection.quit()
  await sdk.shutdown()
  process.exit(0)
}

async function handleFatalError(err: unknown) {
  logger.fatal({ err }, "Fatal error")
  await sdk.shutdown()
  process.exit(1)
}

process.on("SIGTERM", () => handleShutdown())
process.on("SIGINT", () => handleShutdown())
process.on("uncaughtException", handleFatalError)
process.on("unhandledRejection", handleFatalError)
