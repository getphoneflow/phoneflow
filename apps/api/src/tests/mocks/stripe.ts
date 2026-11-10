import { vi } from "vitest"

export const stripe = {
  customers: {
    create: vi.fn(async () => ({ id: `cus_${crypto.randomUUID()}` })),
    update: vi.fn(async () => ({})),
    retrieve: vi.fn(async () => ({})),
  },
  paymentMethods: {
    list: vi.fn(async () => ({ data: [] as { id: string }[] })),
  },
  paymentIntents: {
    retrieve: vi.fn(async () => ({ payment_method: "pm_test" })),
  },
  invoiceItems: {
    create: vi.fn(async () => ({})),
  },
  invoices: {
    create: vi.fn(async () => ({ id: "in_test" })),
    pay: vi.fn(async () => ({ id: "in_test", status: "open" })),
    list: vi.fn(async () => ({ data: [] })),
  },
  invoicePayments: {
    list: vi.fn(async () => ({ data: [] })),
  },
  checkout: {
    sessions: {
      create: vi.fn(async () => ({
        id: "cs_test",
        url: "https://checkout.example.com",
      })),
      retrieve: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(async () => ({ url: "https://billing.example.com" })),
    },
  },
  subscriptions: {
    list: vi.fn(async () => ({ data: [] })),
  },
  webhooks: {
    constructEventAsync: vi.fn(),
  },
}
