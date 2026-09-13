import { createMiddleware } from "hono/factory"

import { auth } from "@/lib/auth/config"

export const requireSession = createMiddleware<{
  Variables: { userId: string }
}>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!result) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  c.set("userId", result.user.id)

  await next()
})
