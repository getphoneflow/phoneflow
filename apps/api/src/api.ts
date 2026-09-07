import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { auth } from "@/lib/auth/config"
import { env } from "@/lib/env"
import { agentRoutes } from "@/routes/agents"
import { batchCallRoutes } from "@/routes/batch-calls"
import { billingRoutes } from "@/routes/billing"
import { callRoutes } from "@/routes/calls"
import { phoneNumberRoutes } from "@/routes/phone-numbers"
import { tokenRoutes } from "@/routes/token"

const api = new Hono()

api.use(
  "*",
  cors({
    origin: [env.FRONTEND_URL],
    credentials: true,
  })
)

if (env.NODE_ENV !== "production") {
  api.use(logger())
}

api.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})

api.route("/api/agents", agentRoutes)
api.route("/api/batch-calls", batchCallRoutes)
api.route("/api/calls", callRoutes)
api.route("/api/phone-numbers", phoneNumberRoutes)
api.route("/api/token", tokenRoutes)
if (env.IS_CLOUD) {
  api.route("/api/billing", billingRoutes)
}

export default api
