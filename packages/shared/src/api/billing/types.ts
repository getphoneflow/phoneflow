import type { z } from "zod"

import type { CreditPackId } from "@workspace/shared/constants/credits"
import type {
  confirmCheckoutRequestSchema,
  createCheckoutRequestSchema,
} from "./schemas"

export type CreateCheckoutRequest = z.infer<typeof createCheckoutRequestSchema>
export type ConfirmCheckoutRequest = z.infer<
  typeof confirmCheckoutRequestSchema
>

export type BillingPack = {
  id: CreditPackId
  name: string
  description: string
  credits: number
  available: boolean
}

export type CreditPurchase = {
  id: string
  amount: string
  packId: string
  createdAt: Date
}

export type BillingResponse = {
  balance: number
  purchased: number
  used: number
  hasStripeCustomer: boolean
  configured: boolean
  packs: BillingPack[]
  purchases: CreditPurchase[]
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
