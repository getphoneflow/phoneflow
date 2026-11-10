import { createMiddleware } from "hono/factory"

import { env } from "@/lib/env"
import { t } from "@/lib/i18n"

export const requireAuthToken = createMiddleware(async (c, next) => {
  if (c.req.header("Authorization") !== `Bearer ${env.API_TOKEN}`) {
    return c.json({ error: t(c.get("locale"), "auth.unauthorized") }, 401)
  }

  await next()
})
