import { zValidator } from "@hono/zod-validator"
import type { ZodError, ZodType } from "zod"

import { type Locale, t } from "@/lib/i18n"

function zodIssuesToMessage(error: Pick<ZodError, "issues">, locale: Locale) {
  return (
    error.issues
      .map((issue) =>
        t(locale, issue.message, {
          ...("params" in issue && issue.params),
          defaultValue: issue.message,
        })
      )
      .join(", ") || t(locale, "validator.failed")
  )
}

export function validator<TSchema extends ZodType>(
  target: "json" | "param" | "query",
  schema: TSchema
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: zodIssuesToMessage(result.error, c.get("locale")) },
        400
      )
    }
  })
}
