import { z } from "zod"

export const creditPackIdSchema = z.enum(["starter", "growth", "scale"])

export const createCheckoutRequestSchema = z.object({
  packId: creditPackIdSchema,
})

export const confirmCheckoutRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
})
