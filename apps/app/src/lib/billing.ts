import { queryOptions } from "@tanstack/react-query"

import type { BillingResponse } from "@workspace/shared/api/billing/types"
import { api } from "@/lib/api"

export function billingQueryOptions() {
  return queryOptions({
    queryKey: ["billing"],
    queryFn: () => api.get<BillingResponse>("/billing"),
  })
}

const creditsFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

export function formatCredits(value: number) {
  return creditsFormatter.format(value)
}
