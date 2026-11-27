import IORedis from "ioredis"

import { env } from "@/lib/env"
import { logger } from "@/lib/logger"

export const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

connection.on("error", (error) => {
  logger.warn({ err: error }, "Redis connection error")
})
