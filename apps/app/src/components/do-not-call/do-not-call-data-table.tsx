import { Link } from "@tanstack/react-router"
import {
  columnVisibilityFeature,
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import type { DoNotCallListItem } from "@workspace/shared/api/do-not-call/types"
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
import { DoNotCallRowActions } from "@/components/do-not-call/do-not-call-row-actions"
import { UserDateTime } from "@/components/user-timezone-provider"
import { type TFunction, useTranslation } from "@/lib/i18n"

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
})

const columnHelper = createColumnHelper<typeof features, DoNotCallListItem>()

function getColumns(t: TFunction) {
  const sourceLabel = {
    manual: t("components.do_not_call.data_table.source.manual"),
    import: t("components.do_not_call.data_table.source.import"),
    call: t("components.do_not_call.data_table.source.call"),
  }

  return columnHelper.columns([
    columnHelper.accessor("number", {
      header: t("components.do_not_call.data_table.columns.number"),
      cell: ({ row }) => row.original.number,
    }),
    columnHelper.accessor("source", {
      header: t("components.do_not_call.data_table.columns.source"),
      cell: ({ row }) => {
        const badge = (
          <Badge variant="secondary">{sourceLabel[row.original.source]}</Badge>
        )

        return row.original.callId ? (
          <Link to="/calls" search={{ callId: row.original.callId }}>
            {badge}
          </Link>
        ) : (
          badge
        )
      },
    }),
    columnHelper.accessor("reason", {
      header: t("components.do_not_call.data_table.columns.reason"),
      cell: ({ row }) => row.original.reason,
    }),
    columnHelper.display({
      id: "createdBy",
      header: t("components.do_not_call.data_table.columns.created_by"),
      cell: ({ row }) => row.original.createdByUser?.name,
    }),
    columnHelper.accessor("createdAt", {
      header: t("components.do_not_call.data_table.columns.created_at"),
      cell: ({ row }) => <UserDateTime value={row.original.createdAt} />,
    }),
    columnHelper.display({
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DoNotCallRowActions entry={row.original} />
        </div>
      ),
    }),
  ])
}

type DoNotCallDataTableProps = {
  items: DoNotCallListItem[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function DoNotCallDataTable({
  items,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: DoNotCallDataTableProps) {
  const { t } = useTranslation()
  const columns = getColumns(t)

  const table = useTable({
    features,
    data: items,
    columns,
    manualPagination: true,
    rowCount: total,
    autoResetPageIndex: false,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  })

  return (
    <div>
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
                <TableRow key={row.id}>
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
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
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
            {t("common.table.page", {
              page,
              total: table.getPageCount() || 1,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(table.getPageCount())}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
