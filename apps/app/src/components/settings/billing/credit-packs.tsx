import { useMutation } from "@tanstack/react-query"

import type {
  BillingPack,
  CheckoutResponse,
} from "@workspace/shared/api/billing/types"
import type { CreditPackId } from "@workspace/shared/constants/credits"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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
import { formatCredits } from "@/lib/billing"

type CreditPacksProps = {
  packs: BillingPack[]
  configured: boolean
}

export function CreditPacks({ packs, configured }: CreditPacksProps) {
  const canPurchase = useCheckPermission({ billing: ["purchase"] })

  const checkoutMutation = useMutation({
    mutationFn: async (packId: CreditPackId) => {
      return api.post<CheckoutResponse, { packId: CreditPackId }>(
        "/billing/checkout",
        {
          body: { packId },
        }
      )
    },
    onSuccess: (data) => {
      window.location.href = data.url
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Buy credits</FieldLegend>
        <FieldDescription>
          Credits are USD and match the per-minute cost already stored on each
          call
        </FieldDescription>
      </FieldSet>

      {!configured ? (
        <p className="text-sm text-muted-foreground">
          Stripe is not configured, so credit purchases are unavailable.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {packs.map((pack) => {
          const isBuying =
            checkoutMutation.isPending && checkoutMutation.variables === pack.id

          return (
            <Card key={pack.id} size="sm">
              <CardHeader>
                <CardTitle>{pack.name}</CardTitle>
                <CardDescription>{pack.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-medium">
                  {formatCredits(pack.credits)}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  className="w-full"
                  disabled={
                    !canPurchase ||
                    !configured ||
                    !pack.available ||
                    checkoutMutation.isPending
                  }
                  onClick={() => checkoutMutation.mutate(pack.id)}
                >
                  {isBuying ? <Spinner /> : "Buy"}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </FieldGroup>
  )
}
