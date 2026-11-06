import { z } from "zod"

const E164_PATTERN = /^\+[1-9]\d{6,14}$/

export const DO_NOT_CALL_BULK_MAX_ROWS = 10_000
export const DO_NOT_CALL_REASON_MAX_LENGTH = 500

// Every number stored in or compared against the list goes through here, so
// "+34 600-11-22-33", "0034600112233" and "+34600112233" are the same entry.
// A number with no country prefix is rejected: its country cannot be inferred.
export function normalizePhoneNumber(value: string) {
  const number = value
    .trim()
    .replace(/^tel:/i, "")
    .replace(/\(0\)/g, "")
    .replace(/[\s().\-/]|‎|‏|‪|‬/g, "")
    .replace(/^00/, "+")

  return E164_PATTERN.test(number) ? number : null
}

const reasonSchema = z
  .string()
  .trim()
  .max(DO_NOT_CALL_REASON_MAX_LENGTH, "schemas.do_not_call.reason.max")
  .nullable()
  .optional()

export const doNotCallIdParamsSchema = z.object({
  id: z.uuid(),
})

export const doNotCallListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .refine((value) => [10, 20, 30, 40, 50].includes(value))
      .default(10),
    q: z.string().trim().min(1).optional(),
  })
  .strict()

export const addDoNotCallRequestSchema = z
  .object({
    number: z.string().transform((value, ctx) => {
      const number = normalizePhoneNumber(value)

      if (!number) {
        ctx.addIssue({
          code: "custom",
          message: "schemas.do_not_call.number.invalid",
        })
        return z.NEVER
      }

      return number
    }),
    reason: reasonSchema,
  })
  .strict()

// Numbers are validated row by row in the route: a bad number is reported back
// instead of rejecting the rest of the file.
export const bulkAddDoNotCallRequestSchema = z
  .object({
    rows: z
      .array(
        z
          .object({
            number: z.string(),
            reason: reasonSchema,
          })
          .strict()
      )
      .min(1, "schemas.do_not_call.bulk.empty")
      .max(DO_NOT_CALL_BULK_MAX_ROWS, "schemas.do_not_call.bulk.max"),
  })
  .strict()

export const checkDoNotCallRequestSchema = z
  .object({
    numbers: z.array(z.string()).min(1).max(500),
  })
  .strict()

export const addCallToDoNotCallRequestSchema = z
  .object({
    callId: z.uuid(),
  })
  .strict()
