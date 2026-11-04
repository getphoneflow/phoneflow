import { createMiddleware } from "hono/factory"

import { auth } from "@/lib/auth/config"
import { t } from "@/lib/i18n"

export const requireOrganization = createMiddleware<{
  Variables: { organizationId: string }
}>(async (c, next) => {
  const locale = c.get("locale")
  const result = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!result) {
    return c.json({ error: t(locale, "auth.unauthorized") }, 401)
  }

  const organizationId = result.session.activeOrganizationId

  if (!organizationId) {
    return c.json({ error: t(locale, "auth.no_active_organization") }, 400)
  }

  c.set("organizationId", organizationId)

  await next()
})
