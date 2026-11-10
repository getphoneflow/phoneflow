import type Stripe from "stripe"

export function checkoutCompleted(
  organizationId: string,
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Event {
  return {
    id: `evt_${crypto.randomUUID()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_${crypto.randomUUID()}`,
        mode: "payment",
        payment_status: "paid",
        payment_intent: `pi_${crypto.randomUUID()}`,
        customer: "cus_test",
        metadata: { organizationId, credits: "25" },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event
}
