import { Link } from "@tanstack/react-router"
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

import type { PhoneNumberListResponse } from "@workspace/shared/api/phone-numbers/types"
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
import { formatAgentVersionLabel } from "@/components/helpers"
import { PhoneNumberRowActions } from "@/components/phone-numbers/phone-number-row-actions"
import { PhoneNumberSheet } from "@/components/phone-numbers/phone-number-sheet"
import { SortableHeader } from "@/components/sortable-header"

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

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

type PhoneNumber = PhoneNumberListResponse[number]

const columnHelper = createColumnHelper<typeof features, PhoneNumber>()

const columns = columnHelper.columns([
  columnHelper.accessor("number", {
    header: "Number",
    cell: ({ row }) => row.original.number,
  }),
  columnHelper.display({
    id: "agent",
    header: "Agent",
    cell: ({ row }) =>
      row.original.agent && row.original.agentId ? (
        <Link
          to="/agents/$agentId"
          params={{ agentId: row.original.agentId }}
          className="hover:underline"
        >
          {row.original.agent.name}
        </Link>
      ) : null,
  }),
  columnHelper.display({
    id: "version",
    header: "Version",
    cell: ({ row }) => {
      if (!row.original.agent) {
        return null
      }

      return formatAgentVersionLabel(row.original.agentVersion)
    },
  }),
  columnHelper.accessor("updatedAt", {
    header: ({ column }) => <SortableHeader column={column} title="Updated" />,
    cell: ({ row }) => dateFormatter.format(new Date(row.original.updatedAt)),
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: ({ row }) => <PhoneNumberRowActions phoneNumber={row.original} />,
  }),
])

export function PhoneNumbersDataTable({
  data,
}: {
  data: PhoneNumberListResponse
}) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [selected, setSelected] = useState<PhoneNumber | null>(null)

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
          value={(table.getColumn("number")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("number")?.setFilterValue(event.target.value)
          }
          placeholder="Search phone numbers..."
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
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "actions" ? "w-0" : undefined
                      }
                      onClick={
                        cell.column.id === "actions"
                          ? (event) => event.stopPropagation()
                          : undefined
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
                  No results
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
          <span className="text-sm font-medium">Rows per page</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium pr-2">
            Page {table.state.pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
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

      {selected && (
        <PhoneNumberSheet
          key={selected.id}
          phoneNumber={selected}
          open
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null)
            }
          }}
        />
      )}
    </div>
  )
}
