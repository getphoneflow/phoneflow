import { eq, sql } from "drizzle-orm"
import type Stripe from "stripe"

import { db } from "@workspace/db/client"
import { organization } from "@workspace/db/schema/auth"
import { creditPurchasesTable } from "@workspace/db/schema/credits"

function toAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

async function adjustOrganizationCredits(
  organizationId: string,
  delta: number
) {
  await db
    .update(organization)
    .set({
      creditBalance: sql`${organization.creditBalance} + ${delta.toFixed(6)}::numeric`,
    })
    .where(eq(organization.id, organizationId))
}

export async function getOrganizationCreditBalance(organizationId: string) {
  const org = await db.query.organization.findFirst({
    where: {
      id: organizationId,
    },
    columns: {
      creditBalance: true,
    },
  })

  return toAmount(org?.creditBalance)
}

export async function organizationHasCredits(organizationId: string) {
  return (await getOrganizationCreditBalance(organizationId)) > 0
}

export async function deductOrganizationCredits(
  organizationId: string,
  amount: number
) {
  if (!(amount > 0)) {
    return
  }

  await adjustOrganizationCredits(organizationId, -amount)
}

export async function applyPaidCheckoutSession(
  session: Stripe.Checkout.Session
) {
  if (session.mode !== "payment" || session.payment_status !== "paid") {
    return
  }

  const organizationId = session.metadata?.organizationId
  const credits = session.metadata?.credits

  if (!organizationId || !credits) {
    return
  }

  const amount = toAmount(credits)

  const existing = await db.query.creditPurchasesTable.findFirst({
    where: {
      stripeCheckoutSessionId: session.id,
    },
    columns: {
      id: true,
    },
  })

  if (existing) {
    return
  }

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  await db.insert(creditPurchasesTable).values({
    id: crypto.randomUUID(),
    organizationId,
    amount: amount.toFixed(6),
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntent,
  })

  await adjustOrganizationCredits(organizationId, amount)
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await applyPaidCheckoutSession(event.data.object)
  }
}
