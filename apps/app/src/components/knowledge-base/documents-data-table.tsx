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
  KnowledgeBaseDocumentListResponse,
  KnowledgeBaseDocumentResponse,
} from "@workspace/shared/api/knowledge-base/types"
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
import { KnowledgeBaseDocumentRowActions } from "@/components/knowledge-base/document-row-actions"
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

const columnHelper = createColumnHelper<
  typeof features,
  KnowledgeBaseDocumentResponse
>()

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getColumns(t: TFunction) {
  return columnHelper.columns([
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          title={t("components.knowledge_base.table.columns.name")}
        />
      ),
      cell: ({ row }) => row.original.name,
    }),
    columnHelper.accessor("status", {
      enableSorting: false,
      header: () => t("components.knowledge_base.table.columns.status"),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "failed" ? "destructive" : "secondary"
          }
        >
          {t(`components.knowledge_base.table.status.${row.original.status}`)}
        </Badge>
      ),
    }),
    columnHelper.accessor("byteSize", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          title={t("components.knowledge_base.table.columns.size")}
        />
      ),
      cell: ({ row }) => formatBytes(row.original.byteSize),
    }),
    columnHelper.accessor("createdAt", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          title={t("components.knowledge_base.table.columns.added")}
        />
      ),
      cell: ({ row }) => <UserDateTime value={row.original.createdAt} />,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <KnowledgeBaseDocumentRowActions document={row.original} />
      ),
    }),
  ])
}

export function KnowledgeBaseDocumentsDataTable({
  data,
}: {
  data: KnowledgeBaseDocumentListResponse
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
          placeholder={t("components.knowledge_base.table.search.placeholder")}
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
            {t("components.knowledge_base.table.page", {
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
