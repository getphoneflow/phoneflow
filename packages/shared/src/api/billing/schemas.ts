import { z } from "zod"

import { MIN_CREDIT_PURCHASE_AMOUNT } from "@workspace/shared/constants/credits"

export const createCheckoutRequestSchema = z.object({
  amount: z.coerce.number().min(MIN_CREDIT_PURCHASE_AMOUNT, {
    message: `Minimum purchase is $${MIN_CREDIT_PURCHASE_AMOUNT}`,
  }),
})

export const confirmCheckoutRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
})

export const updateAutoReloadRequestSchema = z.object({
  enabled: z.boolean(),
  amount: z.coerce.number().min(MIN_CREDIT_PURCHASE_AMOUNT, {
    message: `Minimum reload amount is $${MIN_CREDIT_PURCHASE_AMOUNT}`,
  }),
  threshold: z.coerce.number().min(1, {
    message: "Threshold must be 1 or greater",
  }),
})
