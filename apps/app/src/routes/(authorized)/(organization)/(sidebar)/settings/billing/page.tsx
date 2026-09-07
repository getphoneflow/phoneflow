import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useEffect } from "react"
import { z } from "zod"

import type { ConfirmCheckoutResponse } from "@workspace/shared/api/billing/types"
import { FieldLegend } from "@workspace/ui/components/field"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "@workspace/ui/components/sonner"
import { ManageBillingButton } from "@/components/billing/manage-billing-button"
import { BillingHistory } from "@/components/settings/billing/billing-history"
import { CreditBalance } from "@/components/settings/billing/credit-balance"
import { api } from "@/lib/api"

const billingSearchSchema = z.object({
  checkout: z.enum(["success", "canceled"]).optional(),
  session_id: z.string().optional(),
})

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings/billing/"
)({
  validateSearch: billingSearchSchema,
  component: Page,
})

function BillingSettingsSkeleton() {
  return (
    <div className="mx-auto space-y-8">
      <Skeleton className="h-30 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

function Page() {
  return (
    <>
      <title>Billing settings</title>
      <Suspense fallback={<BillingSettingsSkeleton />}>
        <BillingSettings />
      </Suspense>
    </>
  )
}

function BillingSettings() {
  const { checkout, session_id: sessionId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post<ConfirmCheckoutResponse, { sessionId: string }>(
        "/billing/confirm",
        {
          body: { sessionId: id },
        }
      )
    },
    onSuccess: async () => {
      toast.success("Credits added to your balance")
      await queryClient.invalidateQueries({ queryKey: ["billing"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  useEffect(() => {
    if (!checkout) {
      return
    }

    navigate({ search: {}, replace: true })

    if (checkout === "canceled") {
      toast.message("Checkout canceled")
      return
    }

    if (sessionId) {
      confirmMutation.mutate(sessionId)
    }
  }, [checkout, sessionId])

  return (
    <div className="mx-auto space-y-8">
      <CreditBalance />
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <FieldLegend>Billing history</FieldLegend>
          <ManageBillingButton />
        </div>
        <BillingHistory />
      </div>
    </div>
  )
}
