// biome-ignore-all assist/source/organizeImports: The SDK import must stay first so instrumentation is installed before Hono, BullMQ, and database clients load.
import { sdk } from "./instrumentation"

import { serve } from "@hono/node-server"

import api from "@/api"
import { env } from "@/lib/env"

const server = serve(
  {
    fetch: api.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  }
)

async function handleShutdown() {
  server.close()
  await sdk.shutdown()
  process.exit(0)
}

process.on("SIGTERM", () => handleShutdown())
process.on("SIGINT", () => handleShutdown())
