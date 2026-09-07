import { useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { ExternalLinkIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { UserDateTime } from "@/components/user-timezone-provider"
import { billingInvoicesQueryOptions, formatCredits } from "@/lib/billing"

export function BillingHistory() {
  const { data: invoices } = useSuspenseQuery(billingInvoicesQueryOptions())

  if (invoices.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No invoices yet</EmptyTitle>
          <EmptyDescription>
            Invoices will appear here after you purchase credits
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Created</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right pr-6">Invoice</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <UserDateTime value={new Date(invoice.createdAt)} />
              </TableCell>
              <TableCell>{formatCredits(invoice.amount)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {invoice.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {invoice.url ? (
                  <a
                    href={invoice.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: "link", size: "sm" })
                    )}
                  >
                    <ExternalLinkIcon />
                    View
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
