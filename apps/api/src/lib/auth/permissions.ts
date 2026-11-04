import { createMiddleware } from "hono/factory"

import { auth } from "@/lib/auth/config"
import { t } from "@/lib/i18n"

export function requirePermission(permissions: Record<string, string[]>) {
  return createMiddleware(async (c, next) => {
    const locale = c.get("locale")
    const result = await auth.api.hasPermission({
      headers: c.req.raw.headers,
      body: { permissions },
    })

    if (!result.success) {
      return c.json({ error: t(locale, "auth.forbidden") }, 403)
    }

    await next()
  })
}
