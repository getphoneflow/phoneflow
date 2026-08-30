import { zValidator } from "@hono/zod-validator"
import type { ZodError, ZodType } from "zod"

function zodIssuesToMessage(error: Pick<ZodError, "issues">) {
  return (
    error.issues.map((issue) => issue.message).join(", ") || "Validation failed"
  )
}

export function validator<TSchema extends ZodType>(
  target: "json" | "param" | "query",
  schema: TSchema
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: zodIssuesToMessage(result.error) }, 400)
    }
  })
}
