import { useMutation } from "@tanstack/react-query"

import type { BillingPortalResponse } from "@workspace/shared/api/billing/types"
import { Button } from "@workspace/ui/components/button"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"

type BillingPortalProps = {
  configured: boolean
}

export function BillingPortal({ configured }: BillingPortalProps) {
  const canPurchase = useCheckPermission({ billing: ["purchase"] })

  const portalMutation = useMutation({
    mutationFn: () =>
      api.post<BillingPortalResponse, never>("/billing/portal", {}),
    onSuccess: (data) => {
      window.location.href = data.url
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!canPurchase) {
    return null
  }

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Payment methods</FieldLegend>
        <FieldDescription>
          Update cards and invoices in the Stripe billing portal
        </FieldDescription>
      </FieldSet>

      <Button
        type="button"
        variant="outline"
        disabled={!configured || portalMutation.isPending}
        onClick={() => portalMutation.mutate()}
      >
        {portalMutation.isPending ? <Spinner /> : "Manage billing"}
      </Button>
    </FieldGroup>
  )
}
