import { and, eq, sql } from "drizzle-orm"
import type Stripe from "stripe"

import { db } from "@workspace/db/client"
import { organization } from "@workspace/db/schema/auth"
import { creditPurchasesTable } from "@workspace/db/schema/credits"
import { stripe } from "@/lib/stripe"

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
  void maybeTriggerAutoReload(organizationId)
}

export async function organizationHasPaymentMethod(customerId: string) {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  })

  return paymentMethods.data.length > 0
}

async function applyPaidAutoReloadInvoice(invoice: Stripe.Invoice) {
  if (invoice.status !== "paid" || invoice.metadata?.source !== "auto_reload") {
    return
  }

  const organizationId = invoice.metadata.organizationId
  const credits = invoice.metadata.credits

  if (!organizationId || !credits) {
    return
  }

  const paymentIntent =
    invoice.payments?.data?.[0]?.payment?.payment_intent ??
    (
      await stripe.invoicePayments.list({
        invoice: invoice.id,
        limit: 1,
      })
    ).data[0]?.payment?.payment_intent

  const stripePaymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id

  if (!stripePaymentIntentId) {
    return
  }

  const existing = await db.query.creditPurchasesTable.findFirst({
    where: {
      stripePaymentIntentId,
    },
    columns: {
      id: true,
    },
  })

  if (existing) {
    return
  }

  const amount = toAmount(credits)

  await db.insert(creditPurchasesTable).values({
    id: crypto.randomUUID(),
    organizationId,
    amount: amount.toFixed(6),
    stripeCheckoutSessionId: null,
    stripePaymentIntentId,
  })

  await adjustOrganizationCredits(organizationId, amount)
}

async function maybeTriggerAutoReload(organizationId: string) {
  const [locked] = await db
    .update(organization)
    .set({
      autoReloadInFlight: true,
    })
    .where(
      and(
        eq(organization.id, organizationId),
        eq(organization.autoReloadEnabled, true),
        eq(organization.autoReloadInFlight, false),
        sql`${organization.creditBalance} <= ${organization.autoReloadThreshold}`
      )
    )
    .returning({
      stripeCustomerId: organization.stripeCustomerId,
      autoReloadAmount: organization.autoReloadAmount,
    })

  if (!locked?.stripeCustomerId) {
    if (locked) {
      await db
        .update(organization)
        .set({ autoReloadInFlight: false })
        .where(eq(organization.id, organizationId))
    }
    return
  }

  try {
    const amount = toAmount(locked.autoReloadAmount)

    const paymentMethods = await stripe.paymentMethods.list({
      customer: locked.stripeCustomerId,
      type: "card",
      limit: 1,
    })
    const paymentMethodId = paymentMethods.data[0]?.id

    if (!paymentMethodId || !(amount > 0)) {
      return
    }

    await stripe.invoiceItems.create({
      customer: locked.stripeCustomerId,
      amount: Math.round(amount * 100),
      currency: "usd",
      description: "Credits",
    })

    const invoice = await stripe.invoices.create({
      customer: locked.stripeCustomerId,
      pending_invoice_items_behavior: "include",
      metadata: {
        organizationId,
        credits: String(amount),
        source: "auto_reload",
      },
    })

    const paidInvoice = await stripe.invoices.pay(invoice.id, {
      payment_method: paymentMethodId,
      expand: ["payments"],
    })

    if (paidInvoice.status === "paid") {
      await applyPaidAutoReloadInvoice(paidInvoice)
    }
  } catch (error) {
    console.error("Auto reload failed", error)
  } finally {
    await db
      .update(organization)
      .set({ autoReloadInFlight: false })
      .where(eq(organization.id, organizationId))
  }
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

  if (paymentIntent && typeof session.customer === "string") {
    try {
      const intent = await stripe.paymentIntents.retrieve(paymentIntent)
      const paymentMethodId =
        typeof intent.payment_method === "string"
          ? intent.payment_method
          : intent.payment_method?.id

      if (paymentMethodId) {
        await stripe.customers.update(session.customer, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        })
      }
    } catch (error) {
      console.error("Failed to set default payment method", error)
    }
  }
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await applyPaidCheckoutSession(event.data.object)
    return
  }

  if (event.type === "invoice.paid") {
    await applyPaidAutoReloadInvoice(event.data.object)
  }
}
