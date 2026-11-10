import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "@workspace/db/client"
import { organization } from "@workspace/db/schema/auth"
import { stripe } from "@/lib/stripe"
import {
  createOrganization,
  type TestOrganization,
} from "@/tests/factories/auth"
import { getCreditBalance } from "@/tests/factories/credits"
import { checkoutCompleted } from "@/tests/fixtures/stripe"

describe("billing", () => {
  let org: TestOrganization

  beforeEach(async () => {
    org = await createOrganization({ creditBalance: 10 })
  })

  it("shows the balance to any member", async () => {
    const member = await org.as("member")
    const res = await member.api.get("/api/billing")
    expect(res.body).toEqual({ balance: 10 })
  })

  it("creates a checkout session for the organization's Stripe customer", async () => {
    await db
      .update(organization)
      .set({ stripeCustomerId: "cus_checkout" })
      .where(eq(organization.id, org.id))
    const owner = await org.as("owner")

    const res = await owner.api.post("/api/billing/checkout", {
      body: {
        amount: 25,
      },
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ url: "https://checkout.example.com" })
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_checkout",
        metadata: { organizationId: org.id, credits: "25" },
      })
    )
  })

  it("rejects purchases below the minimum amount", async () => {
    const owner = await org.as("owner")
    const res = await owner.api.post("/api/billing/checkout", {
      body: {
        amount: 1,
      },
    })
    expect(res.status).toBe(400)
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it("confirms a paid checkout session of the organization", async () => {
    const owner = await org.as("owner")
    const session = checkoutCompleted(org.id).data.object
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValueOnce(
      session as never
    )

    const res = await owner.api.post("/api/billing/confirm", {
      body: {
        sessionId: "cs_1",
      },
    })

    expect(res.status).toBe(200)
    expect(await getCreditBalance(org.id)).toBe(35)
  })

  it("refuses to confirm another organization's checkout session", async () => {
    const other = await createOrganization()
    const owner = await org.as("owner")
    const session = checkoutCompleted(other.id).data.object
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValueOnce(
      session as never
    )

    const res = await owner.api.post("/api/billing/confirm", {
      body: {
        sessionId: "cs_1",
      },
    })

    expect(res.status).toBe(404)
    expect(await getCreditBalance(other.id)).toBe(100)
  })

  it("requires a saved card to enable auto-reload", async () => {
    await db
      .update(organization)
      .set({ stripeCustomerId: "cus_x" })
      .where(eq(organization.id, org.id))
    const owner = await org.as("owner")
    const settings = { enabled: true, amount: 20, threshold: 5 }

    const withoutCard = await owner.api.put("/api/billing/auto-reload", {
      body: settings,
    })
    expect(withoutCard.status).toBe(400)

    vi.mocked(stripe.paymentMethods.list).mockResolvedValueOnce({
      data: [{ id: "pm_card" }],
    } as never)
    const withCard = await owner.api.put("/api/billing/auto-reload", {
      body: settings,
    })
    expect(withCard.status).toBe(200)

    const saved = await owner.api.get("/api/billing/auto-reload")
    expect(saved.body).toEqual(settings)
  })
})
