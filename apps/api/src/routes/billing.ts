import { Hono } from "hono"

import { db } from "@workspace/db/client"
import {
  confirmCheckoutRequestSchema,
  createCheckoutRequestSchema,
} from "@workspace/shared/api/billing/schemas"
import type {
  BillingPortalResponse,
  BillingResponse,
  CheckoutResponse,
  ConfirmCheckoutResponse,
} from "@workspace/shared/api/billing/types"
import { CREDIT_PACKS } from "@workspace/shared/constants/credits"
import { auth } from "@/lib/auth/config"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import {
  applyPaidCheckoutSession,
  ensureOrganizationStripeCustomer,
  getCreditSummary,
  listPurchases,
} from "@/lib/credits"
import { env } from "@/lib/env"
import { getCreditPackPriceId, isStripeConfigured, stripe } from "@/lib/stripe"
import { validator } from "@/lib/validator"

export const billingRoutes = new Hono()

billingRoutes.get("/", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")

  try {
    const [summary, purchases, org] = await Promise.all([
      getCreditSummary(organizationId),
      listPurchases(organizationId),
      db.query.organization.findFirst({
        where: {
          id: organizationId,
        },
        columns: {
          stripeCustomerId: true,
        },
      }),
    ])

    return c.json({
      ...summary,
      hasStripeCustomer: Boolean(org?.stripeCustomerId),
      configured: isStripeConfigured(),
      packs: CREDIT_PACKS.map((pack) => ({
        ...pack,
        available: Boolean(getCreditPackPriceId(pack.id)),
      })),
      purchases,
    } satisfies BillingResponse)
  } catch {
    return c.json({ error: "Failed to load billing" }, 500)
  }
})

billingRoutes.post(
  "/checkout",
  requireOrganization,
  requirePermission({ billing: ["purchase"] }),
  validator("json", createCheckoutRequestSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const { packId } = c.req.valid("json")

    if (!isStripeConfigured()) {
      return c.json({ error: "Billing is not configured" }, 503)
    }

    const priceId = getCreditPackPriceId(packId)

    if (!priceId) {
      return c.json({ error: "This credit pack is not available" }, 400)
    }

    const pack = CREDIT_PACKS.find((item) => item.id === packId)

    if (!pack) {
      return c.json({ error: "Credit pack not found" }, 404)
    }

    try {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      })

      const org = await db.query.organization.findFirst({
        where: {
          id: organizationId,
        },
        columns: {
          name: true,
        },
      })

      if (!org) {
        return c.json({ error: "Organization not found" }, 404)
      }

      const customerId = await ensureOrganizationStripeCustomer({
        organizationId,
        organizationName: org.name,
        email: session?.user.email,
      })

      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${env.FRONTEND_URL}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_URL}/settings/billing?checkout=canceled`,
        metadata: {
          organizationId,
          packId: pack.id,
          credits: String(pack.credits),
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
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      })

      const org = await db.query.organization.findFirst({
        where: {
          id: organizationId,
        },
        columns: {
          name: true,
        },
      })

      if (!org) {
        return c.json({ error: "Organization not found" }, 404)
      }

      const customerId = await ensureOrganizationStripeCustomer({
        organizationId,
        organizationName: org.name,
        email: session?.user.email,
      })

      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${env.FRONTEND_URL}/settings/billing`,
      })

      return c.json({ url: portal.url } satisfies BillingPortalResponse)
    } catch {
      return c.json({ error: "Failed to open billing portal" }, 500)
    }
  }
)
