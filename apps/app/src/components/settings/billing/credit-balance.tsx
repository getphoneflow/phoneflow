import { useSuspenseQuery } from "@tanstack/react-query"

import { AddCreditsButton } from "@/components/billing/add-credits-button"
import { AutoReloadButton } from "@/components/billing/auto-reload-button"
import { billingCreditsQueryOptions, formatCredits } from "@/lib/billing"

export function CreditBalance() {
  const { data: billing } = useSuspenseQuery(billingCreditsQueryOptions())

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Credit balance</p>
          <p className="text-3xl font-medium tracking-tight">
            {formatCredits(billing.balance)}
          </p>
          {billing.balance <= 0 ? (
            <p className="text-sm text-destructive">
              Buy credits to place or receive calls
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <AutoReloadButton />
          <AddCreditsButton />
        </div>
      </div>
    </div>
  )
}
