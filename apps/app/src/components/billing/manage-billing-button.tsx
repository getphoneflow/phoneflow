import { useMutation } from "@tanstack/react-query"
import { ExternalLinkIcon } from "lucide-react"

import type { BillingPortalResponse } from "@workspace/shared/api/billing/types"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"

export function ManageBillingButton() {
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

  return (
    <Button
      type="button"
      variant="outline"
      disabled={!canPurchase || portalMutation.isPending}
      onClick={() => portalMutation.mutate()}
    >
      {portalMutation.isPending ? (
        <Spinner className="mx-23" />
      ) : (
        <>
          <ExternalLinkIcon />
          Manage billing information
        </>
      )}
    </Button>
  )
}
