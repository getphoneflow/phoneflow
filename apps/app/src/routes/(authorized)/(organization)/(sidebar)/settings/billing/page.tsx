import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { z } from "zod"

import type { ConfirmCheckoutResponse } from "@workspace/shared/api/billing/types"
import { toast } from "@workspace/ui/components/sonner"
import { BillingPortal } from "@/components/settings/billing/billing-portal"
import { CreditBalance } from "@/components/settings/billing/credit-balance"
import { CreditPacks } from "@/components/settings/billing/credit-packs"
import { PurchaseHistory } from "@/components/settings/billing/purchase-history"
import { api } from "@/lib/api"
import { billingQueryOptions } from "@/lib/billing"

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

function Page() {
  const { checkout, session_id: sessionId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { data: billing } = useSuspenseQuery(billingQueryOptions())
  const handledCheckout = useRef<string | null>(null)

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

    const checkoutKey = `${checkout}:${sessionId ?? ""}`

    if (handledCheckout.current === checkoutKey) {
      return
    }

    handledCheckout.current = checkoutKey

    if (checkout === "canceled") {
      toast.message("Checkout canceled")
      void navigate({ search: {}, replace: true })
      return
    }

    if (sessionId) {
      confirmMutation.mutate(sessionId, {
        onSettled: () => {
          void navigate({ search: {}, replace: true })
        },
      })
    }
  }, [checkout, confirmMutation, navigate, sessionId])

  return (
    <>
      <title>Billing settings</title>
      <div className="mx-auto max-w-3xl space-y-8">
        <CreditBalance billing={billing} />
        <CreditPacks packs={billing.packs} configured={billing.configured} />
        <BillingPortal configured={billing.configured} />
        <PurchaseHistory purchases={billing.purchases} />
      </div>
    </>
  )
}
