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
import { useTranslation } from "@/lib/i18n"

const invoiceStatusLabels: Record<string, string> = {
  draft: "components.settings.billing.billing_history.status.draft",
  open: "components.settings.billing.billing_history.status.open",
  paid: "components.settings.billing.billing_history.status.paid",
  uncollectible:
    "components.settings.billing.billing_history.status.uncollectible",
  void: "components.settings.billing.billing_history.status.void",
}

export function BillingHistory() {
  const { t } = useTranslation()
  const { data: invoices } = useSuspenseQuery(billingInvoicesQueryOptions())

  if (invoices.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>
            {t("components.settings.billing.billing_history.empty.title")}
          </EmptyTitle>
          <EmptyDescription>
            {t("components.settings.billing.billing_history.empty.description")}
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
            <TableHead>
              {t("components.settings.billing.billing_history.columns.created")}
            </TableHead>
            <TableHead>
              {t("components.settings.billing.billing_history.columns.amount")}
            </TableHead>
            <TableHead>
              {t("components.settings.billing.billing_history.columns.status")}
            </TableHead>
            <TableHead className="text-right pr-6">
              {t("components.settings.billing.billing_history.columns.invoice")}
            </TableHead>
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
                  {invoiceStatusLabels[invoice.status]
                    ? t(invoiceStatusLabels[invoice.status])
                    : invoice.status}
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
                    {t("components.settings.billing.billing_history.view")}
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
