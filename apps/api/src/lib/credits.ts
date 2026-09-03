import { eq, sum } from "drizzle-orm"
import type Stripe from "stripe"

import { db } from "@workspace/db/client"
import { organization } from "@workspace/db/schema/auth"
import { callsTable } from "@workspace/db/schema/calls"
import { creditPurchasesTable } from "@workspace/db/schema/credits"
import { getCreditPack } from "@workspace/shared/constants/credits"
import { stripe } from "@/lib/stripe"

function toAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  )
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent
  }

  return session.payment_intent?.id ?? null
}

export async function getCreditSummary(organizationId: string) {
  const [purchaseRow] = await db
    .select({ purchased: sum(creditPurchasesTable.amount) })
    .from(creditPurchasesTable)
    .where(eq(creditPurchasesTable.organizationId, organizationId))

  const [usageRow] = await db
    .select({ used: sum(callsTable.totalCost) })
    .from(callsTable)
    .where(eq(callsTable.organizationId, organizationId))

  const purchased = toAmount(purchaseRow?.purchased)
  const used = toAmount(usageRow?.used)

  return {
    purchased,
    used,
    balance: purchased - used,
  }
}

export async function organizationHasCredits(organizationId: string) {
  const { balance } = await getCreditSummary(organizationId)
  return balance > 0
}

export async function listPurchases(organizationId: string) {
  return db.query.creditPurchasesTable.findMany({
    where: {
      organizationId,
    },
    columns: {
      id: true,
      amount: true,
      packId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    limit: 50,
  })
}

export async function ensureOrganizationStripeCustomer({
  organizationId,
  organizationName,
  email,
}: {
  organizationId: string
  organizationName: string
  email?: string
}) {
  const org = await db.query.organization.findFirst({
    where: {
      id: organizationId,
    },
    columns: {
      stripeCustomerId: true,
    },
  })

  if (org?.stripeCustomerId) {
    return org.stripeCustomerId
  }

  const customer = await stripe.customers.create({
    name: organizationName,
    email,
    metadata: {
      organizationId,
    },
  })

  await db
    .update(organization)
    .set({
      stripeCustomerId: customer.id,
    })
    .where(eq(organization.id, organizationId))

  return customer.id
}

export async function applyPaidCheckoutSession(
  session: Stripe.Checkout.Session
) {
  if (session.mode !== "payment") {
    return
  }

  if (session.payment_status !== "paid") {
    return
  }

  const organizationId = session.metadata?.organizationId
  const packId = session.metadata?.packId
  const credits = session.metadata?.credits

  if (!organizationId || !packId || !credits) {
    return
  }

  const pack = getCreditPack(packId)
  const amount = (pack?.credits ?? toAmount(credits)).toFixed(6)

  try {
    await db.insert(creditPurchasesTable).values({
      id: crypto.randomUUID(),
      organizationId,
      amount,
      packId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId(session),
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return
    }

    throw error
  }
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await applyPaidCheckoutSession(event.data.object)
  }
}
