import type { BillingResponse } from "@workspace/shared/api/billing/types"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { formatCredits } from "@/lib/billing"

type CreditBalanceProps = {
  billing: BillingResponse
}

export function CreditBalance({ billing }: CreditBalanceProps) {
  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Credits</FieldLegend>
        <FieldDescription>
          Call costs are deducted from this balance as soon as a call ends
        </FieldDescription>
      </FieldSet>

      <div className="space-y-1">
        <p className="text-3xl font-medium tracking-tight">
          {formatCredits(billing.balance)}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatCredits(billing.used)} used of{" "}
          {formatCredits(billing.purchased)} purchased
        </p>
        {billing.balance <= 0 ? (
          <p className="text-sm text-destructive">
            Your credit balance is empty. Buy credits to place or receive calls.
          </p>
        ) : null}
      </div>
    </FieldGroup>
  )
}
