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

import type { CallExtractionListResponse } from "@workspace/shared/api/call-extractions/types"
import {
  CALL_EXTRACTION_MODEL_LABELS,
  type CallExtractionModel,
} from "@workspace/shared/call-extraction/constants"
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
import { CallExtractionRowActions } from "@/components/call-extractions/call-extraction-row-actions"
import { SortableHeader } from "@/components/sortable-header"
import { api } from "@/lib/api"
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

const columnHelper = createColumnHelper<
  typeof features,
  CallExtractionListResponse[number]
>()

export function callExtractionsQueryOptions() {
  return {
    queryKey: ["call-extractions"],
    queryFn: () => api.get<CallExtractionListResponse>("/call-extractions"),
  }
}

function getColumns(t: TFunction) {
  return columnHelper.columns([
    columnHelper.accessor("name", {
      filterFn: "includesString",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          title={t("components.call_extractions.table.columns.name")}
        />
      ),
      cell: ({ row }) => row.original.name,
    }),
    columnHelper.accessor((row) => row.schema.type, {
      id: "format",
      enableSorting: false,
      header: () => t("components.call_extractions.table.columns.format"),
      cell: ({ row }) =>
        t(
          `components.call_extractions.form.format.options.${row.original.schema.type}`
        ),
    }),
    columnHelper.accessor("model", {
      enableSorting: false,
      header: () => t("components.call_extractions.table.columns.model"),
      cell: ({ row }) =>
        CALL_EXTRACTION_MODEL_LABELS[
          row.original.model as CallExtractionModel
        ] ?? row.original.model,
    }),
    columnHelper.accessor((row) => row.agents.length, {
      id: "agents",
      enableSorting: false,
      header: () => t("components.call_extractions.table.columns.agents"),
      cell: ({ row }) => row.original.agents.length,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => <CallExtractionRowActions extraction={row.original} />,
    }),
  ])
}

export function CallExtractionsDataTable({
  data,
}: {
  data: CallExtractionListResponse
}) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const { t } = useTranslation()
  const columns = getColumns(t)

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
            "components.call_extractions.table.search.placeholder"
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
                  <TableHead
                    key={header.id}
                    className={
                      header.column.id === "actions" ? "w-0" : undefined
                    }
                  >
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "actions" ? "w-0" : undefined
                      }
                    >
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
      <div className="mt-4 flex items-center justify-between">
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
          <span className="pr-2 text-sm font-medium">
            {t("components.call_extractions.table.page", {
              page: table.state.pagination.pageIndex + 1,
              count: table.getPageCount() || 1,
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
