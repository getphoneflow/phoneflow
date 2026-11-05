import { useNavigate } from "@tanstack/react-router"
import {
  type ColumnFiltersState,
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react"
import { useState } from "react"

import type {
  BatchCallListItem,
  BatchCallListResponse,
  BatchCallStatus,
} from "@workspace/shared/api/batch-calls/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
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
import { AgentReferenceLink } from "@/components/agents/agent-reference-link"
import {
  formatAgentVersionLabel,
  formatPhoneNumber,
} from "@/components/helpers"
import { SortableHeader } from "@/components/sortable-header"
import { UserDateTime } from "@/components/user-timezone-provider"
import { type TFunction, useTranslation } from "@/lib/i18n"

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
})

const columnHelper = createColumnHelper<typeof features, BatchCallListItem>()

function getColumns(t: TFunction) {
  const statusLabel: Record<BatchCallStatus, string> = {
    scheduled: t(
      "components.batch_calls.batch_calls_data_table.status.scheduled"
    ),
    triggered: t(
      "components.batch_calls.batch_calls_data_table.status.triggered"
    ),
  }

  return columnHelper.columns([
    columnHelper.accessor("name", {
      header: t("components.batch_calls.batch_calls_data_table.columns.name"),
      cell: ({ row }) => row.original.name,
    }),
    columnHelper.accessor("status", {
      header: t("components.batch_calls.batch_calls_data_table.columns.status"),
      cell: ({ row }) => (
        <Badge variant="secondary">{statusLabel[row.original.status]}</Badge>
      ),
    }),
    columnHelper.display({
      id: "recipients",
      header: t(
        "components.batch_calls.batch_calls_data_table.columns.recipients"
      ),
      cell: ({ row }) =>
        row.original.doNotCallSkippedCount > 0
          ? t(
              "components.batch_calls.batch_calls_data_table.recipients_with_skipped",
              {
                total: row.original.totalCount,
                skipped: row.original.doNotCallSkippedCount,
              }
            )
          : row.original.totalCount,
    }),
    columnHelper.display({
      id: "from",
      header: t("components.batch_calls.batch_calls_data_table.columns.from"),
      cell: ({ row }) => (
        <span
          className={
            row.original.phoneNumber ? undefined : "text-muted-foreground"
          }
        >
          {formatPhoneNumber(row.original.phoneNumber, t)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "agent",
      header: t("components.batch_calls.batch_calls_data_table.columns.agent"),
      cell: ({ row }) => (
        <AgentReferenceLink
          agentId={row.original.agentId}
          agent={row.original.agent}
          agentVersionId={row.original.agentVersionId}
        />
      ),
    }),
    columnHelper.display({
      id: "version",
      header: t(
        "components.batch_calls.batch_calls_data_table.columns.version"
      ),
      cell: ({ row }) => formatAgentVersionLabel(row.original.agentVersion, t),
    }),
    columnHelper.accessor((row) => row.scheduledAt ?? row.createdAt, {
      id: "when",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          title={t(
            "components.batch_calls.batch_calls_data_table.columns.when"
          )}
        />
      ),
      cell: ({ row }) => (
        <UserDateTime
          value={row.original.scheduledAt ?? row.original.createdAt}
        />
      ),
    }),
  ])
}

export function BatchCallsDataTable({ data }: { data: BatchCallListResponse }) {
  const { t } = useTranslation()
  const columns = getColumns(t)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const navigate = useNavigate()

  const table = useTable({
    features,
    data,
    columns,
    getRowId: (row) => row.id,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      sorting,
    },
  })

  return (
    <div>
      <InputGroup className="mb-5 max-w-xs">
        <InputGroupInput
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          placeholder={t(
            "components.batch_calls.batch_calls_data_table.search_placeholder"
          )}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: "/calls",
                      search: { batchId: row.original.id },
                    })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.table.no_results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <Select
            value={`${table.state.pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm font-medium">
            {t("common.table.rows_per_page")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium pr-2">
            {t("common.table.page", {
              page: table.state.pagination.pageIndex + 1,
              total: table.getPageCount() || 1,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
