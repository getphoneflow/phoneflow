import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import { organization } from "@workspace/db/schema/auth"
import {
  confirmCheckoutRequestSchema,
  createCheckoutRequestSchema,
  updateAutoReloadRequestSchema,
} from "@workspace/shared/api/billing/schemas"
import type {
  AutoReloadResponse,
  BillingCreditsResponse,
  BillingInvoicesResponse,
  BillingPortalResponse,
  CheckoutResponse,
  ConfirmCheckoutResponse,
} from "@workspace/shared/api/billing/types"
import { MIN_CREDIT_PURCHASE_AMOUNT } from "@workspace/shared/constants/credits"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import {
  applyPaidCheckoutSession,
  organizationHasPaymentMethod,
} from "@/lib/credits"
import { env } from "@/lib/env"
import { stripe } from "@/lib/stripe"
import { validator } from "@/lib/validator"

export const billingRoutes = new Hono()

function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
}

billingRoutes.get("/", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")

  try {
    const org = await db.query.organization.findFirst({
      where: {
        id: organizationId,
      },
      columns: {
        creditBalance: true,
      },
    })

    return c.json({
      balance: Number(org?.creditBalance ?? 0),
    } satisfies BillingCreditsResponse)
  } catch {
    return c.json({ error: "Failed to load billing" }, 500)
  }
})

billingRoutes.get("/invoices", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")

  try {
    const org = await db.query.organization.findFirst({
      where: {
        id: organizationId,
      },
      columns: {
        stripeCustomerId: true,
      },
    })

    if (!org?.stripeCustomerId || !isStripeConfigured()) {
      return c.json([] satisfies BillingInvoicesResponse)
    }

    const stripeInvoices = await stripe.invoices.list({
      customer: org.stripeCustomerId,
    })

    return c.json(
      stripeInvoices.data.map((invoice) => ({
        id: invoice.id,
        createdAt: new Date(invoice.created * 1000).toISOString(),
        status: invoice.status ?? "unknown",
        amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
        url: invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? null,
      })) satisfies BillingInvoicesResponse
    )
  } catch {
    return c.json({ error: "Failed to load invoices" }, 500)
  }
})

billingRoutes.post(
  "/checkout",
  requireOrganization,
  requirePermission({ billing: ["purchase"] }),
  validator("json", createCheckoutRequestSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const amount = Math.round(c.req.valid("json").amount * 100) / 100

    if (amount < MIN_CREDIT_PURCHASE_AMOUNT) {
      return c.json(
        { error: `Minimum purchase is $${MIN_CREDIT_PURCHASE_AMOUNT}` },
        400
      )
    }

    if (!isStripeConfigured()) {
      return c.json({ error: "Billing is not configured" }, 503)
    }

    try {
      const org = await db.query.organization.findFirst({
        where: {
          id: organizationId,
        },
        columns: {
          stripeCustomerId: true,
        },
      })

      if (!org?.stripeCustomerId) {
        return c.json(
          { error: "Stripe customer not found for this organization" },
          400
        )
      }

      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: org.stripeCustomerId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: "Credits",
              },
            },
          },
        ],
        invoice_creation: {
          enabled: true,
        },
        payment_intent_data: {
          setup_future_usage: "off_session",
        },
        success_url: `${env.FRONTEND_URL}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_URL}/settings/billing?checkout=canceled`,
        metadata: {
          organizationId,
          credits: String(amount),
        },
        client_reference_id: organizationId,
      })

      if (!checkout.url) {
        return c.json({ error: "Failed to create checkout session" }, 500)
      }

      return c.json({ url: checkout.url } satisfies CheckoutResponse)
    } catch {
      return c.json({ error: "Failed to start checkout" }, 500)
    }
  }
)

billingRoutes.post(
  "/confirm",
  requireOrganization,
  requirePermission({ billing: ["purchase"] }),
  validator("json", confirmCheckoutRequestSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const { sessionId } = c.req.valid("json")

    if (!isStripeConfigured()) {
      return c.json({ error: "Billing is not configured" }, 503)
    }

    try {
      const checkout = await stripe.checkout.sessions.retrieve(sessionId)

      if (checkout.metadata?.organizationId !== organizationId) {
        return c.json({ error: "Checkout session not found" }, 404)
      }

      await applyPaidCheckoutSession(checkout)

      return c.json({ ok: true } satisfies ConfirmCheckoutResponse)
    } catch {
      return c.json({ error: "Failed to confirm checkout" }, 500)
    }
  }
)

billingRoutes.get(
  "/auto-reload",
  requireOrganization,
  requirePermission({ billing: ["purchase"] }),
  async (c) => {
    const organizationId = c.get("organizationId")

    try {
      const org = await db.query.organization.findFirst({
        where: {
          id: organizationId,
        },
        columns: {
          autoReloadEnabled: true,
          autoReloadAmount: true,
          autoReloadThreshold: true,
        },
      })

      if (!org) {
        return c.json({ error: "Organization not found" }, 404)
      }

      return c.json({
        enabled: org.autoReloadEnabled,
        amount: Number(org.autoReloadAmount),
        threshold: Number(org.autoReloadThreshold),
      } satisfies AutoReloadResponse)
    } catch {
      return c.json({ error: "Failed to load auto reload settings" }, 500)
    }
  }
)

billingRoutes.put(
  "/auto-reload",
  requireOrganization,
  requirePermission({ billing: ["purchase"] }),
  validator("json", updateAutoReloadRequestSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const { enabled, amount, threshold } = c.req.valid("json")

    if (!isStripeConfigured()) {
      return c.json({ error: "Billing is not configured" }, 503)
    }

    try {
      const org = await db.query.organization.findFirst({
        where: {
          id: organizationId,
        },
        columns: {
          stripeCustomerId: true,
        },
      })

      if (!org?.stripeCustomerId) {
        return c.json(
          { error: "Stripe customer not found for this organization" },
          400
        )
      }

      if (
        enabled &&
        !(await organizationHasPaymentMethod(org.stripeCustomerId))
      ) {
        return c.json(
          {
            error:
              "Add a payment method in Manage billing information before enabling auto reload",
          },
          400
        )
      }

      await db
        .update(organization)
        .set({
          autoReloadEnabled: enabled,
          autoReloadAmount: amount.toFixed(6),
          autoReloadThreshold: threshold.toFixed(6),
        })
        .where(eq(organization.id, organizationId))

      return c.json({
        enabled,
        amount,
        threshold,
      } satisfies AutoReloadResponse)
    } catch {
      return c.json({ error: "Failed to update auto reload settings" }, 500)
    }
  }
)

billingRoutes.post(
  "/portal",
  requireOrganization,
  requirePermission({ billing: ["purchase"] }),
  async (c) => {
    const organizationId = c.get("organizationId")

    if (!isStripeConfigured()) {
      return c.json({ error: "Billing is not configured" }, 503)
    }

    try {
      const org = await db.query.organization.findFirst({
        where: {
          id: organizationId,
        },
        columns: {
          stripeCustomerId: true,
        },
      })

      if (!org?.stripeCustomerId) {
        return c.json(
          { error: "Stripe customer not found for this organization" },
          400
        )
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: `${env.FRONTEND_URL}/settings/billing`,
      })

      return c.json({ url: portal.url } satisfies BillingPortalResponse)
    } catch {
      return c.json({ error: "Failed to open billing portal" }, 500)
    }
  }
)
