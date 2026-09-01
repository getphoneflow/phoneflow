import {
  columnVisibilityFeature,
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleHelpIcon,
  Globe,
  Phone,
} from "lucide-react"
import { useState } from "react"

import type {
  CallListItem,
  CallListQuery,
  CallListSortBy,
} from "@workspace/shared/api/calls/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { AgentReferenceLink } from "@/components/agents/agent-reference-link"
import {
  formatCallCost,
  getCallCostBreakdown,
  parseCallCost,
} from "@/components/calls/call-cost-breakdown"
import { CallDetailSheet } from "@/components/calls/call-detail-sheet"
import { CallsFilters } from "@/components/calls/calls-filters"
import { formatAgentName } from "@/components/helpers"
import { SortableHeader } from "@/components/sortable-header"
import { UserDateTime } from "@/components/user-timezone-provider"

const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
})

const secondsFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function CostCell({ call }: { call: CallListItem }) {
  const totalCost = parseCallCost(call.totalCost)

  if (totalCost === null) {
    return null
  }

  return (
    <HoverCard>
      <HoverCardTrigger className="inline-flex items-center gap-1">
        {formatCallCost(totalCost)}
        <CircleHelpIcon className="size-3.5 text-muted-foreground" />
      </HoverCardTrigger>
      <HoverCardContent className="flex flex-col gap-2">
        {getCallCostBreakdown(call).map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-xs">{item.label}</span>
              {item.model ? (
                <div className="truncate text-xs text-muted-foreground">
                  {item.model}
                </div>
              ) : null}
            </div>
            <span className="text-xs">{formatCallCost(item.cost)}</span>
          </div>
        ))}
      </HoverCardContent>
    </HoverCard>
  )
}

const columnHelper = createColumnHelper<typeof features, CallListItem>()

const columns = columnHelper.columns([
  columnHelper.accessor("startedAt", {
    header: ({ column }) => <SortableHeader column={column} title="Started" />,
    cell: ({ row }) => <UserDateTime value={row.original.startedAt} />,
  }),
  columnHelper.accessor((row) => row.durationMs, {
    id: "duration",
    header: ({ column }) => <SortableHeader column={column} title="Duration" />,
    cell: ({ row }) =>
      row.original.durationMs === null
        ? null
        : `${secondsFormatter.format(row.original.durationMs / 1000)}s`,
  }),
  columnHelper.accessor((row) => parseCallCost(row.totalCost), {
    id: "cost",
    header: ({ column }) => <SortableHeader column={column} title="Cost" />,
    cell: ({ row }) => <CostCell call={row.original} />,
  }),
  columnHelper.accessor("channel", {
    header: "Channel",
    cell: ({ row }) => {
      const isPhone = row.original.channel === "phone_call"
      return (
        <Tooltip>
          <TooltipTrigger render={<div className="flex justify-center" />}>
            {isPhone ? (
              <Phone className="size-4" />
            ) : (
              <Globe className="size-4" />
            )}
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>
            {isPhone ? "Phone" : "Web"}
          </TooltipContent>
        </Tooltip>
      )
    },
  }),
  columnHelper.accessor("direction", {
    header: "Direction",
    cell: ({ row }) => {
      const isInbound = row.original.direction === "inbound"
      return (
        <Tooltip>
          <TooltipTrigger render={<div className="flex justify-center" />}>
            {isInbound ? (
              <ArrowDownRight className="size-4" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>
            {isInbound ? "Inbound" : "Outbound"}
          </TooltipContent>
        </Tooltip>
      )
    },
  }),
  columnHelper.display({
    id: "from",
    header: "From",
    cell: ({ row }) => row.original.fromNumber,
  }),
  columnHelper.display({
    id: "to",
    header: "To",
    cell: ({ row }) => row.original.toNumber,
  }),
  columnHelper.accessor((row) => formatAgentName(row.agent), {
    id: "agent",
    header: "Agent",
    cell: ({ row }) => (
      <AgentReferenceLink
        agentId={row.original.agentId}
        agent={row.original.agent}
      />
    ),
  }),
  columnHelper.display({
    id: "version",
    header: "Version",
    cell: ({ row }) =>
      row.original.agentVersion
        ? `V${row.original.agentVersion.number}`
        : "Latest",
  }),
  columnHelper.display({
    id: "variables",
    header: "Variables",
    cell: ({ row }) => Object.keys(row.original.variables ?? {}).length,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ row }) =>
      row.original.status === "in_progress" ? (
        <Badge variant="outline">In progress</Badge>
      ) : (
        <Badge variant="secondary">Completed</Badge>
      ),
  }),
])

type CallsDataTableProps = {
  items: CallListItem[]
  total: number
  page: number
  pageSize: number
  filters: Omit<CallListQuery, "page" | "pageSize" | "sortBy" | "sortDir">
  sortBy: CallListSortBy
  sortDir: "asc" | "desc"
  onFiltersChange: (
    filters: Omit<CallListQuery, "page" | "pageSize" | "sortBy" | "sortDir">
  ) => void
  onSortingChange: (sorting: {
    sortBy: CallListSortBy
    sortDir: "asc" | "desc"
  }) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function CallsDataTable({
  items,
  total,
  page,
  pageSize,
  filters,
  sortBy,
  sortDir,
  onFiltersChange,
  onSortingChange,
  onPageChange,
  onPageSizeChange,
}: CallsDataTableProps) {
  const [selectedCall, setSelectedCall] = useState<CallListItem | null>(null)
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
        onSortingChange({ sortBy: "startedAt", sortDir: "desc" })
        return
      }

      onSortingChange({
        sortBy: first.id as CallListSortBy,
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
      <CallsFilters filters={filters} onFiltersChange={onFiltersChange} />
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
                  onClick={() => setSelectedCall(row.original)}
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
      <div className="flex items-center justify-between mt-4">
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
          <span className="text-sm font-medium pr-2">
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
      {selectedCall && (
        <CallDetailSheet
          call={selectedCall}
          open
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCall(null)
            }
          }}
        />
      )}
    </div>
  )
}
