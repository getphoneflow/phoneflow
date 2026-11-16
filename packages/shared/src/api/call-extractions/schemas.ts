import { z } from "zod"

import {
  CALL_EXTRACTION_MODELS,
  DEFAULT_CALL_EXTRACTION_MODEL,
} from "@workspace/shared/call-extraction/constants"

export const callExtractionSchemaSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("boolean") }).strict(),
    z
      .object({
        type: z.literal("string"),
        choices: z
          .array(
            z
              .string()
              .trim()
              .min(1, "schemas.call_extraction.choice.required")
              .max(200, "schemas.call_extraction.choice.max")
          )
          .max(50),
      })
      .strict(),
    z
      .object({
        type: z.literal("number"),
        minimum: z.number().optional(),
        maximum: z.number().optional(),
      })
      .strict(),
  ])
  .superRefine((schema, ctx) => {
    if (schema.type === "string") {
      const seen = new Set<string>()
      schema.choices.forEach((choice, index) => {
        if (seen.has(choice)) {
          ctx.addIssue({
            code: "custom",
            message: "schemas.call_extraction.duplicate_choice",
            path: ["choices", index],
          })
        }
        seen.add(choice)
      })
    }

    if (
      schema.type === "number" &&
      schema.minimum !== undefined &&
      schema.maximum !== undefined &&
      schema.minimum > schema.maximum
    ) {
      ctx.addIssue({
        code: "custom",
        message: "schemas.call_extraction.bounds.range",
        path: ["maximum"],
      })
    }
  })

export const callExtractionRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "schemas.call_extraction.name.required")
      .max(255, "schemas.call_extraction.name.max"),
    description: z
      .string()
      .trim()
      .min(1, "schemas.call_extraction.description.required")
      .max(4000, "schemas.call_extraction.description.max"),
    model: z
      .enum(CALL_EXTRACTION_MODELS)
      .default(DEFAULT_CALL_EXTRACTION_MODEL),
    schema: callExtractionSchemaSchema,
    agentIds: z.array(z.uuid()).max(100),
  })
  .strict()

export const callExtractionIdParamsSchema = z.object({
  id: z.uuid(),
})

export const callExtractionJobQuerySchema = z.object({
  ids: z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(z.uuid()).min(1).max(100)),
})

export const callExtractionRunSchema = z
  .object({
    results: z.array(
      z
        .object({
          id: z.uuid(),
          name: z.string(),
          status: z.enum(["pending", "completed", "failed"]),
          model: z.string(),
          schema: callExtractionSchemaSchema,
          value: z.unknown().nullable(),
        })
        .strict()
    ),
  })
  .strict()
