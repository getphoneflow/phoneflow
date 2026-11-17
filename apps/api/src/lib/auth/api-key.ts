import { createMiddleware } from "hono/factory"

import { auth } from "@/lib/auth/config"
import { t } from "@/lib/i18n"

export function requireApiKey(permissions: Record<string, string[]>) {
  return createMiddleware<{
    Variables: { organizationId: string }
  }>(async (c, next) => {
    const locale = c.get("locale")
    const key = c.req.header("x-api-key")

    if (!key) {
      return c.json({ error: t(locale, "auth.unauthorized") }, 401)
    }

    const result = await auth.api.verifyApiKey({
      body: { key, permissions },
    })

    if (!result.valid || !result.key?.referenceId) {
      const code = result.error?.code
      if (code === "RATE_LIMITED") {
        return c.json({ error: t(locale, "auth.rate_limited") }, 429)
      }
      if (code === "KEY_NOT_FOUND") {
        return c.json({ error: t(locale, "auth.forbidden") }, 403)
      }
      return c.json({ error: t(locale, "auth.unauthorized") }, 401)
    }

    c.set("organizationId", result.key.referenceId)

    await next()
  })
}
