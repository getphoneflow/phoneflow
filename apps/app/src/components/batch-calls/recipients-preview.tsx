import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import type { ParsedCsvRecipient } from "@/components/batch-calls/recipients-csv"
import { useTranslation } from "@/lib/i18n"

export function RecipientsPreview({
  columns,
  recipients,
}: {
  columns: string[]
  recipients: ParsedCsvRecipient[]
}) {
  const { t } = useTranslation()

  if (recipients.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border">
        <p className="text-sm text-muted-foreground">
          {t("components.batch_calls.recipients_preview.empty")}
        </p>
      </div>
    )
  }

  const previewColumns =
    columns.length > 0
      ? columns
      : ["phone_number", ...Object.keys(recipients[0]?.variables ?? {})]

  return (
    <div className="h-full overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {previewColumns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((recipient, index) => (
            <TableRow key={`${index}-${recipient.toNumber}`}>
              {previewColumns.map((column) => (
                <TableCell key={column}>
                  {column === "phone_number"
                    ? recipient.toNumber
                    : (recipient.variables?.[column] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
