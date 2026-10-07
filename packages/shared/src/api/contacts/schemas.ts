import { z } from "zod"

export const contactNumericFilterOperatorSchema = z.enum([
  "eq",
  "between",
  "gte",
  "lte",
])

export const contactListSortBySchema = z.enum([
  "latestCallAt",
  "firstCallAt",
  "callCount",
  "totalDurationMs",
])

export const contactListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .refine((value) => [10, 20, 30, 40, 50].includes(value))
      .default(10),
    q: z.string().trim().min(1).optional(),
    firstCallFrom: z.iso.datetime().optional(),
    firstCallTo: z.iso.datetime().optional(),
    latestCallFrom: z.iso.datetime().optional(),
    latestCallTo: z.iso.datetime().optional(),
    callCountOp: contactNumericFilterOperatorSchema.optional(),
    callCount: z.coerce.number().int().nonnegative().optional(),
    callCountMax: z.coerce.number().int().nonnegative().optional(),
    durationOp: contactNumericFilterOperatorSchema.optional(),
    duration: z.coerce.number().nonnegative().optional(),
    durationMax: z.coerce.number().nonnegative().optional(),
    sortBy: contactListSortBySchema.default("latestCallAt"),
    sortDir: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
