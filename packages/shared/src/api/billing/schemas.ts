import { z } from "zod"

import { MIN_CREDIT_PURCHASE_AMOUNT } from "@workspace/shared/constants/credits"

export const createCheckoutRequestSchema = z.object({
  amount: z
    .number()
    .min(
      MIN_CREDIT_PURCHASE_AMOUNT,
      "schemas.billing.create_checkout_request.amount.min"
    ),
})

export const confirmCheckoutRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
})

export const updateAutoReloadRequestSchema = z.object({
  enabled: z.boolean(),
  amount: z
    .number()
    .min(
      MIN_CREDIT_PURCHASE_AMOUNT,
      "schemas.billing.update_auto_reload_request.amount.min"
    ),
  threshold: z
    .number()
    .min(1, "schemas.billing.update_auto_reload_request.threshold.min"),
})
