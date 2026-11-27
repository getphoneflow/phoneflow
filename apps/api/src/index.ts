import { serve } from "@hono/node-server"

import { db } from "@workspace/db/client"
import api from "@/api"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"
import { sdk } from "./instrumentation"

const server = serve(
  {
    fetch: api.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`)
  }
)

db.$client.on("error", (err) => {
  logger.warn({ err }, "Database connection error")
})

async function handleShutdown() {
  server.close()
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
