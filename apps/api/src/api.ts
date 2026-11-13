import { httpInstrumentationMiddleware } from "@hono/otel"
import { Hono } from "hono"
import { cors } from "hono/cors"

import { auth } from "@/lib/auth/config"
import { env } from "@/lib/env"
import { localeMiddleware } from "@/lib/i18n"
import { agentRoutes } from "@/routes/agents"
import { batchCallRoutes } from "@/routes/batch-calls"
import { billingRoutes } from "@/routes/billing"
import { callRoutes } from "@/routes/calls"
import { contactRoutes } from "@/routes/contacts"
import { knowledgeBaseRoutes } from "@/routes/knowledge-base"
import { phoneNumberRoutes } from "@/routes/phone-numbers"
import { ssoRoutes } from "@/routes/sso"
import { tokenRoutes } from "@/routes/token"
import { userRoutes } from "@/routes/user"

const api = new Hono()

api.use(
  "*",
  httpInstrumentationMiddleware({
    serviceName: "api",
    getUrlFull: (c) => {
      const url = new URL(c.req.url)
      return `${url.origin}${url.pathname}`
    },
  })
)

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
api.route("/api/batch-calls", batchCallRoutes)
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

export default api
