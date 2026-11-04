import { useSuspenseQuery } from "@tanstack/react-query"

import { AddCreditsButton } from "@/components/billing/add-credits-button"
import { AutoReloadButton } from "@/components/billing/auto-reload-button"
import { billingCreditsQueryOptions, formatCredits } from "@/lib/billing"
import { useTranslation } from "@/lib/i18n"

export function CreditBalance() {
  const { t } = useTranslation()
  const { data: billing } = useSuspenseQuery(billingCreditsQueryOptions())

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t("components.settings.billing.credit_balance.title")}
          </p>
          <p className="text-3xl font-medium tracking-tight">
            {formatCredits(billing.balance)}
          </p>
          {billing.balance <= 0 ? (
            <p className="text-sm text-destructive">
              {t("components.settings.billing.credit_balance.empty")}
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
