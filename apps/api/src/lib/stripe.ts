import Stripe from "stripe"

import type { CreditPackId } from "@workspace/shared/constants/credits"
import { env } from "@/lib/env"

export const stripe = new Stripe(env.STRIPE_SECRET_KEY)

const creditPackPriceIds: Record<CreditPackId, string> = {
  starter: env.STRIPE_PRICE_CREDITS_STARTER,
  growth: env.STRIPE_PRICE_CREDITS_GROWTH,
  scale: env.STRIPE_PRICE_CREDITS_SCALE,
}

export function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
}

export function getCreditPackPriceId(packId: CreditPackId) {
  return creditPackPriceIds[packId] || undefined
}
