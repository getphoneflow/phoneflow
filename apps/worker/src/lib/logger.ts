import { createRequire } from "node:module"

const { pino } = createRequire(import.meta.url)("pino") as typeof import("pino")

const isProduction = process.env.NODE_ENV === "production"

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    redact: [
      "*.authorization",
      "*.cookie",
      "*.password",
      "*.sipPassword",
      "*.token",
      "*.apiKey",
    ],
  },
  !isProduction
    ? pino.transport({ target: "pino-pretty" })
    : process.env.OTEL_EXPORTER_OTLP_ENDPOINT
      ? { write() {} }
      : pino.destination(1)
)
