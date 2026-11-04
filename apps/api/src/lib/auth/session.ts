import { createMiddleware } from "hono/factory"

import { auth } from "@/lib/auth/config"
import { t } from "@/lib/i18n"

export const requireSession = createMiddleware<{
  Variables: { userId: string }
}>(async (c, next) => {
  const locale = c.get("locale")
  const result = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!result) {
    return c.json({ error: t(locale, "auth.unauthorized") }, 401)
  }

  c.set("userId", result.user.id)

  await next()
})
