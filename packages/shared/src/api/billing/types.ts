import type { z } from "zod"

import type {
  confirmCheckoutRequestSchema,
  createCheckoutRequestSchema,
  updateAutoReloadRequestSchema,
} from "./schemas"

export type CreateCheckoutRequest = z.infer<typeof createCheckoutRequestSchema>
export type ConfirmCheckoutRequest = z.infer<
  typeof confirmCheckoutRequestSchema
>
export type UpdateAutoReloadRequest = z.infer<
  typeof updateAutoReloadRequestSchema
>

export type BillingInvoice = {
  id: string
  createdAt: string
  status: string
  amount: number
  url: string | null
}

export type BillingCreditsResponse = {
  balance: number
}

export type BillingInvoicesResponse = BillingInvoice[]

export type AutoReloadResponse = {
  enabled: boolean
  amount: number
  threshold: number
}

export type CheckoutResponse = {
  url: string
}

export type BillingPortalResponse = {
  url: string
}

export type ConfirmCheckoutResponse = {
  ok: true
}
