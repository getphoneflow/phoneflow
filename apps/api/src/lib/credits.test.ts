import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "@workspace/db/client"
import { organization } from "@workspace/db/schema/auth"
import { deductOrganizationCredits, handleStripeEvent } from "@/lib/credits"
import { stripe } from "@/lib/stripe"
import {
  createOrganization,
  getOrganization,
  type TestOrganization,
} from "@/tests/factories/auth"
import { getCreditBalance } from "@/tests/factories/credits"
import { checkoutCompleted } from "@/tests/fixtures/stripe"

async function enableAutoReload(
  organizationId: string,
  { amount = 20, threshold = 5 } = {}
) {
  await db
    .update(organization)
    .set({
      stripeCustomerId: "cus_auto",
      autoReloadEnabled: true,
      autoReloadAmount: amount.toFixed(6),
      autoReloadThreshold: threshold.toFixed(6),
    })
    .where(eq(organization.id, organizationId))
}

describe("credits", () => {
  let org: TestOrganization

  beforeEach(async () => {
    org = await createOrganization({ creditBalance: 10 })
  })

  describe("Stripe checkout events", () => {
    it("adds the purchased credits", async () => {
      await handleStripeEvent(checkoutCompleted(org.id))
      expect(await getCreditBalance(org.id)).toBe(35)
    })

    it("credits a session once even if Stripe delivers it again", async () => {
      const event = checkoutCompleted(org.id)

      await handleStripeEvent(event)
      await handleStripeEvent(event)
      await handleStripeEvent({
        ...event,
        type: "checkout.session.async_payment_succeeded",
      } as Stripe.Event)

      expect(await getCreditBalance(org.id)).toBe(35)
    })

    it("credits a session once when deliveries race", async () => {
      // Concurrent deliveries (webhook + the confirm endpoint, or Stripe
      // retries) may lose on the unique constraint and throw; Stripe retries
      // those. What matters is that the session is credited exactly once
      for (let round = 1; round <= 5; round++) {
        const event = checkoutCompleted(org.id)
        await Promise.allSettled(
          Array.from({ length: 4 }, () => handleStripeEvent(event))
        )

        expect(await getCreditBalance(org.id)).toBe(10 + 25 * round)
      }
    })

    it.each([
      ["unpaid sessions", { payment_status: "unpaid" }],
      ["subscription sessions", { mode: "subscription" }],
      ["sessions without metadata", { metadata: {} }],
    ] as const)("ignores %s", async (_, overrides) => {
      await handleStripeEvent(
        checkoutCompleted(org.id, overrides as Partial<Stripe.Checkout.Session>)
      )
      expect(await getCreditBalance(org.id)).toBe(10)
    })

    it("saves the card as the default payment method for auto-reload", async () => {
      vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
        payment_method: "pm_card",
      } as never)

      await handleStripeEvent(
        checkoutCompleted(org.id, { customer: "cus_123" })
      )

      expect(stripe.customers.update).toHaveBeenCalledWith("cus_123", {
        invoice_settings: { default_payment_method: "pm_card" },
      })
    })

    it("still credits the purchase if saving the card fails", async () => {
      vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValueOnce(
        new Error("boom")
      )
      vi.spyOn(console, "error").mockImplementation(() => {})

      await handleStripeEvent(checkoutCompleted(org.id))

      expect(await getCreditBalance(org.id)).toBe(35)
    })
  })

  describe("auto-reload", () => {
    function mockSuccessfulReload(paymentIntent = `pi_${crypto.randomUUID()}`) {
      vi.mocked(stripe.paymentMethods.list).mockResolvedValueOnce({
        data: [{ id: "pm_card" }],
      } as never)
      vi.mocked(stripe.invoices.pay).mockImplementationOnce((async () => ({
        id: "in_auto",
        status: "paid",
        metadata: {
          organizationId: org.id,
          credits: "20",
          source: "auto_reload",
        },
        payments: { data: [{ payment: { payment_intent: paymentIntent } }] },
      })) as never)
    }

    it("tops up once when a charge drops the balance below the threshold", async () => {
      await enableAutoReload(org.id, { amount: 20, threshold: 5 })
      mockSuccessfulReload()

      await deductOrganizationCredits(org.id, 6) // 10 -> 4

      await vi.waitFor(async () =>
        expect(await getCreditBalance(org.id)).toBe(24)
      )
      expect(stripe.invoiceItems.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_auto",
          amount: 2000,
          currency: "usd",
        })
      )
      await vi.waitFor(async () =>
        expect((await getOrganization(org.id)).autoReloadInFlight).toBe(false)
      )
    })

    it("does not charge while the balance is above the threshold", async () => {
      await enableAutoReload(org.id, { threshold: 5 })

      await deductOrganizationCredits(org.id, 1) // 10 -> 9

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(stripe.invoices.create).not.toHaveBeenCalled()
      expect(await getCreditBalance(org.id)).toBe(9)
    })

    it("does not charge when auto-reload is disabled", async () => {
      await deductOrganizationCredits(org.id, 9.5)

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(stripe.invoices.create).not.toHaveBeenCalled()
      expect(await getCreditBalance(org.id)).toBe(0.5)
    })

    it("charges only once when several calls end at the same time", async () => {
      await enableAutoReload(org.id, { amount: 20, threshold: 5 })
      mockSuccessfulReload()

      await Promise.all([
        deductOrganizationCredits(org.id, 3),
        deductOrganizationCredits(org.id, 3),
        deductOrganizationCredits(org.id, 3),
      ]) // 10 -> 1

      await vi.waitFor(async () =>
        expect(await getCreditBalance(org.id)).toBe(21)
      )
      await vi.waitFor(async () =>
        expect((await getOrganization(org.id)).autoReloadInFlight).toBe(false)
      )
      expect(stripe.invoices.pay).toHaveBeenCalledTimes(1)
    })

    it("ignores zero or negative deductions", async () => {
      await deductOrganizationCredits(org.id, 0)
      await deductOrganizationCredits(org.id, -5)
      expect(await getCreditBalance(org.id)).toBe(10)
    })
  })
})
