import {
  columnVisibilityFeature,
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { cn } from "cn"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useState } from "react"

import type {
  ContactListItem,
  ContactListSortBy,
} from "@workspace/shared/api/contacts/types"
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
import { ContactDetailSheet } from "@/components/contacts/contact-detail-sheet"
import { SortableHeader } from "@/components/sortable-header"
import { UserDateTime } from "@/components/user-timezone-provider"
import { formatDurationMs } from "@/lib/time"

const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
})

const columnHelper = createColumnHelper<typeof features, ContactListItem>()

const columns = columnHelper.columns([
  columnHelper.accessor("phoneNumber", {
    header: "Phone",
    cell: ({ row }) => row.original.phoneNumber,
  }),
  columnHelper.accessor("firstName", {
    header: "First name",
    cell: ({ row }) => row.original.firstName,
  }),
  columnHelper.accessor("lastName", {
    header: "Last name",
    cell: ({ row }) => row.original.lastName,
  }),
  columnHelper.accessor("callCount", {
    header: ({ column }) => <SortableHeader column={column} title="Calls" />,
  }),
  columnHelper.accessor("totalDurationMs", {
    header: ({ column }) => (
      <SortableHeader column={column} title="Total time" />
    ),
    cell: ({ row }) => formatDurationMs(row.original.totalDurationMs),
  }),
  columnHelper.accessor("firstCallAt", {
    header: ({ column }) => (
      <SortableHeader column={column} title="First call" />
    ),
    cell: ({ row }) =>
      row.original.firstCallAt ? (
        <UserDateTime value={row.original.firstCallAt} />
      ) : null,
  }),
  columnHelper.accessor("latestCallAt", {
    header: ({ column }) => (
      <SortableHeader column={column} title="Last call" />
    ),
    cell: ({ row }) =>
      row.original.latestCallAt ? (
        <UserDateTime value={row.original.latestCallAt} />
      ) : null,
  }),
])

type ContactsDataTableProps = {
  items: ContactListItem[]
  total: number
  page: number
  pageSize: number
  sortBy: ContactListSortBy
  sortDir: "asc" | "desc"
  onSortingChange: (sorting: {
    sortBy: ContactListSortBy
    sortDir: "asc" | "desc"
  }) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function ContactsDataTable({
  items,
  total,
  page,
  pageSize,
  sortBy,
  sortDir,
  onSortingChange,
  onPageChange,
  onPageSizeChange,
}: ContactsDataTableProps) {
  const [selectedContact, setSelectedContact] =
    useState<ContactListItem | null>(null)
  const sorting: SortingState = [{ id: sortBy, desc: sortDir === "desc" }]

  const table = useTable({
    features,
    data: items,
    columns,
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
    autoResetPageIndex: false,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      const first = next[0]

      if (!first) {
        onSortingChange({ sortBy: "latestCallAt", sortDir: "desc" })
        return
      }

      onSortingChange({
        sortBy: first.id as ContactListSortBy,
        sortDir: first.desc ? "desc" : "asc",
      })
    },
    state: {
      sorting,
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
                <TableRow
                  key={row.id}
                  className={cn("cursor-pointer")}
                  onClick={() => setSelectedContact(row.original)}
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
                  No results
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
          <span className="text-sm font-medium">Rows per page</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="pr-2 text-sm font-medium">
            Page {page} of {table.getPageCount() || 1}
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
      {selectedContact && (
        <ContactDetailSheet
          contact={selectedContact}
          open
          onOpenChange={(open) => {
            if (!open) {
              setSelectedContact(null)
            }
          }}
        />
      )}
    </div>
  )
}
