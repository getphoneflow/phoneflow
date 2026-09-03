import type { CreditPurchase } from "@workspace/shared/api/billing/types"
import { getCreditPack } from "@workspace/shared/constants/credits"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { UserDateTime } from "@/components/user-timezone-provider"
import { formatCredits } from "@/lib/billing"

type PurchaseHistoryProps = {
  purchases: CreditPurchase[]
}

export function PurchaseHistory({ purchases }: PurchaseHistoryProps) {
  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Purchase history</FieldLegend>
        <FieldDescription>
          Completed Stripe checkouts that added credits to this organization
        </FieldDescription>
      </FieldSet>

      {purchases.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>No purchases yet</EmptyTitle>
            <EmptyDescription>
              Bought credits will show up here after checkout completes
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pack</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>
                    {getCreditPack(purchase.packId)?.name ?? purchase.packId}
                  </TableCell>
                  <TableCell>
                    {formatCredits(Number(purchase.amount))}
                  </TableCell>
                  <TableCell>
                    <UserDateTime value={purchase.createdAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </FieldGroup>
  )
}
