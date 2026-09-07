import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { AddCreditsButton } from "@/components/billing/add-credits-button"
import { billingCreditsQueryOptions, formatCredits } from "@/lib/billing"

function SidebarCreditsSkeleton() {
  return (
    <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
      <Skeleton className="h-22 w-full rounded-xl" />
    </div>
  )
}

function SidebarCreditsCard() {
  const { data: billing } = useSuspenseQuery(billingCreditsQueryOptions())

  return (
    <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
      <div className="w-full min-w-59 h-22 flex flex-col justify-between rounded-lg border border-sidebar-border p-3">
        <p className="text-sm text-muted-foreground">
          Credit balance:{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {formatCredits(billing.balance)}
          </span>
        </p>
        <AddCreditsButton size="sm" className="w-full" />
      </div>
    </div>
  )
}

export function SidebarCredits() {
  return (
    <Suspense fallback={<SidebarCreditsSkeleton />}>
      <SidebarCreditsCard />
    </Suspense>
  )
}
