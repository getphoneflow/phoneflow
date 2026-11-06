import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useState } from "react"

import type {
  BatchCallRecipientListResponse,
  BatchCallRecipientStatus,
} from "@workspace/shared/api/batch-calls/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  recipientErrorLabel,
  recipientStatusLabels,
} from "@/components/batch-calls/batch-call-status"
import { UserDateTime } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

const ALL_STATUSES = "all"

const RECIPIENT_STATUSES: BatchCallRecipientStatus[] = [
  "pending",
  "dialing",
  "in_progress",
  "completed",
  "no_answer",
  "failed",
  "cancelled",
]

export function BatchCallRecipientsTable({
  batchCallId,
  refetchInterval,
}: {
  batchCallId: string
  refetchInterval: number | false
}) {
  const { t } = useTranslation()
  const statusLabel = recipientStatusLabels(t)
  const [status, setStatus] = useState<BatchCallRecipientStatus | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data } = useQuery({
    queryKey: [
      "batch-calls",
      batchCallId,
      "recipients",
      status,
      page,
      pageSize,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (status) {
        params.set("status", status)
      }
      return api.get<BatchCallRecipientListResponse>(
        `/batch-calls/${batchCallId}/recipients?${params}`
      )
    },
    placeholderData: keepPreviousData,
    refetchInterval,
  })

  const items = data?.items ?? []
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))

  return (
    <div>
      <Select
        value={status ?? ALL_STATUSES}
        onValueChange={(value) => {
          setStatus(
            value === ALL_STATUSES ? null : (value as BatchCallRecipientStatus)
          )
          setPage(1)
        }}
      >
        <SelectTrigger className="mb-5 w-48">
          <SelectValue>
            {status
              ? statusLabel[status]
              : t("components.batch_calls.batch_call_detail.all_statuses")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>
            {t("components.batch_calls.batch_call_detail.all_statuses")}
          </SelectItem>
          {RECIPIENT_STATUSES.map((item) => (
            <SelectItem key={item} value={item}>
              {statusLabel[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("components.batch_calls.batch_call_detail.columns.to")}
              </TableHead>
              <TableHead>
                {t("components.batch_calls.batch_call_detail.columns.status")}
              </TableHead>
              <TableHead>
                {t(
                  "components.batch_calls.batch_call_detail.columns.dialed_at"
                )}
              </TableHead>
              <TableHead>
                {t("components.batch_calls.batch_call_detail.columns.error")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length ? (
              items.map((recipient) => (
                <TableRow key={recipient.id}>
                  <TableCell>{recipient.toNumber}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        recipient.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {statusLabel[recipient.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {recipient.dialedAt ? (
                      <UserDateTime value={recipient.dialedAt} />
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-md truncate whitespace-normal text-muted-foreground">
                    {recipient.error
                      ? recipientErrorLabel(recipient.error, t)
                      : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.table.no_results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm font-medium">
            {t("common.table.rows_per_page")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="pr-2 text-sm font-medium">
            {t("common.table.page", { page, total: pageCount })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(1)}
            disabled={page <= 1}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(page + 1)}
            disabled={page >= pageCount}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(pageCount)}
            disabled={page >= pageCount}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
