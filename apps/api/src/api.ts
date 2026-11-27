import { httpInstrumentationMiddleware } from "@hono/otel"
import { Hono } from "hono"
import { cors } from "hono/cors"

import { auth } from "@/lib/auth/config"
import { env } from "@/lib/env"
import { localeMiddleware } from "@/lib/i18n"
import { logger } from "@/lib/logger"
import { agentRoutes } from "@/routes/agents"
import { apiKeyRoutes } from "@/routes/api-keys"
import { batchCallRoutes } from "@/routes/batch-calls"
import { billingRoutes } from "@/routes/billing"
import { callExtractionRoutes } from "@/routes/call-extractions"
import { callRoutes } from "@/routes/calls"
import { contactRoutes } from "@/routes/contacts"
import { knowledgeBaseRoutes } from "@/routes/knowledge-base"
import { phoneNumberRoutes } from "@/routes/phone-numbers"
import { ssoRoutes } from "@/routes/sso"
import { tokenRoutes } from "@/routes/token"
import { userRoutes } from "@/routes/user"

const api = new Hono()

api.get("/health", (c) => c.json({ ok: true }))

api.use(
  "*",
  httpInstrumentationMiddleware({
    getUrlFull: (c) => {
      const url = new URL(c.req.url)
      return `${url.origin}${url.pathname}`
    },
  })
)

api.use("*", async (c, next) => {
  const start = performance.now()
  await next()
  const duration = performance.now() - start
  logger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Math.round(duration),
  })
})

api.use(
  "*",
  cors({
    origin: [env.FRONTEND_URL],
    credentials: true,
  })
)

api.use("*", localeMiddleware)

api.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})

api.route("/api/agents", agentRoutes)
api.route("/api/api-keys", apiKeyRoutes)
api.route("/api/batch-calls", batchCallRoutes)
api.route("/api/call-extractions", callExtractionRoutes)
api.route("/api/calls", callRoutes)
api.route("/api/contacts", contactRoutes)
api.route("/api/knowledge-base", knowledgeBaseRoutes)
api.route("/api/phone-numbers", phoneNumberRoutes)
api.route("/api/token", tokenRoutes)
api.route("/api/user", userRoutes)
if (env.IS_CLOUD) {
  api.route("/api/billing", billingRoutes)
  api.route("/api/sso", ssoRoutes)
}

api.onError((error, c) => {
  if ("getResponse" in error) return error.getResponse()

  logger.error({ err: error }, "Unhandled request error")
  return c.json({ error: "Internal Server Error" }, 500)
})

export default api
