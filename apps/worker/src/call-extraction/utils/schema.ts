import { z } from "zod"

import type { CallExtractionSchema } from "@workspace/shared/api/call-extractions/types"

function withBounds(
  schema: z.ZodNumber,
  bounds: { minimum?: number; maximum?: number }
) {
  let next = schema
  if (bounds.minimum !== undefined) next = next.min(bounds.minimum)
  if (bounds.maximum !== undefined) next = next.max(bounds.maximum)
  return next
}

export function extractionValueSchema(schema: CallExtractionSchema) {
  switch (schema.type) {
    case "boolean":
      return z.boolean().nullable()
    case "string":
      return schema.choices && schema.choices.length > 0
        ? z.enum(schema.choices as [string, ...string[]]).nullable()
        : z.string().nullable()
    case "number":
      return withBounds(z.number(), schema).nullable()
  }
}
