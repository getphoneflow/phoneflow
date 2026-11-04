import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Suspense, useEffect } from "react"
import { z } from "zod"

import type { ConfirmCheckoutResponse } from "@workspace/shared/api/billing/types"
import { FieldLegend } from "@workspace/ui/components/field"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "@workspace/ui/components/sonner"
import { ManageBillingButton } from "@/components/billing/manage-billing-button"
import { BillingHistory } from "@/components/settings/billing/billing-history"
import { CreditBalance } from "@/components/settings/billing/credit-balance"
import { captureEvent } from "@/lib/analytics"
import { api } from "@/lib/api"
import { env } from "@/lib/env"
import { useTranslation } from "@/lib/i18n"

const billingSearchSchema = z.object({
  checkout: z.enum(["success", "canceled"]).optional(),
  session_id: z.string().optional(),
})

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings/billing/"
)({
  validateSearch: billingSearchSchema,
  beforeLoad: () => {
    if (!env.IS_CLOUD) {
      throw redirect({ to: "/settings/account" })
    }
  },
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
  const { t } = useTranslation()
  return (
    <>
      <title>{t("routes.settings.billing.page_title")}</title>
      <Suspense fallback={<BillingSettingsSkeleton />}>
        <BillingSettings />
      </Suspense>
    </>
  )
}

function BillingSettings() {
  const { t } = useTranslation()
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
      captureEvent("billing_credits_purchased")
      toast.success(t("routes.settings.billing.toasts.credits_added"))
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
      toast.message(t("routes.settings.billing.toasts.checkout_canceled"))
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
          <FieldLegend>{t("routes.settings.billing.history")}</FieldLegend>
          <ManageBillingButton />
        </div>
        <BillingHistory />
      </div>
    </div>
  )
}
