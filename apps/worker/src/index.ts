// biome-ignore-all assist/source/organizeImports: The SDK import must stay first so instrumentation is installed before BullMQ and Redis load.
import { sdk } from "./instrumentation"

import { batchCallsWorker } from "@/batch-calls/worker"
import { emailsWorker } from "@/emails/worker"
import { connection } from "@/lib/redis"

const workers = [emailsWorker, batchCallsWorker]

for (const worker of workers) {
  worker.on("ready", () => {
    console.log(`[${worker.name}] ready`)
  })
}

async function handleShutdown() {
  await Promise.all(workers.map((worker) => worker.close()))
  await connection.quit()
  await sdk.shutdown()
  process.exit(0)
}

process.on("SIGTERM", () => handleShutdown())
process.on("SIGINT", () => handleShutdown())
