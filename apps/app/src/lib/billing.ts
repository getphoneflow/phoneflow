import { queryOptions } from "@tanstack/react-query"

import type {
  AutoReloadResponse,
  BillingCreditsResponse,
  BillingInvoicesResponse,
} from "@workspace/shared/api/billing/types"
import { api } from "@/lib/api"

export function billingCreditsQueryOptions() {
  return queryOptions({
    queryKey: ["billing", "credits"],
    queryFn: () => api.get<BillingCreditsResponse>("/billing"),
  })
}

export function billingInvoicesQueryOptions() {
  return queryOptions({
    queryKey: ["billing", "invoices"],
    queryFn: () => api.get<BillingInvoicesResponse>("/billing/invoices"),
  })
}

export function autoReloadQueryOptions() {
  return queryOptions({
    queryKey: ["billing", "auto-reload"],
    queryFn: () => api.get<AutoReloadResponse>("/billing/auto-reload"),
  })
}

const creditsFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCredits(value: number) {
  return creditsFormatter.format(value)
}
