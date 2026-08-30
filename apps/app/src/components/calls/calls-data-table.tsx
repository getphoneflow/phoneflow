import { Link } from "@tanstack/react-router"
import {
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  sortFn_alphanumeric,
  sortFn_text,
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
  CallChannel,
  CallDirection,
  CallListItem,
  CallStatus,
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
import {
  formatCallCost,
  getCallCostBreakdown,
  parseCallCost,
} from "@/components/calls/call-cost-breakdown"
import { CallDetailSheet } from "@/components/calls/call-detail-sheet"
import { SortableHeader } from "@/components/sortable-header"

const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
})

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

const secondsFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const channelFilterOptions = [
  { value: "all", label: "All channels" },
  { value: "phone_call", label: "Phone" },
  { value: "web_call", label: "Web" },
]

const directionFilterOptions = [
  { value: "all", label: "All directions" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
]

const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In progress" },
]

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
    cell: ({ row }) => dateFormatter.format(new Date(row.original.startedAt)),
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
  columnHelper.accessor((row) => row.agent?.name ?? "", {
    id: "agent",
    header: ({ column }) => <SortableHeader column={column} title="Agent" />,
    cell: ({ row }) =>
      row.original.agent ? (
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
    cell: ({ row }) =>
      row.original.agentVersion
        ? `V${row.original.agentVersion.number}`
        : "Latest",
  }),
  columnHelper.display({
    id: "variables",
    header: "Variables",
    enableSorting: false,
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
  filters: {
    channel?: CallChannel
    direction?: CallDirection
    status?: CallStatus
  }
  onFiltersChange: (filters: {
    channel?: CallChannel
    direction?: CallDirection
    status?: CallStatus
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
  onFiltersChange,
  onPageChange,
  onPageSizeChange,
}: CallsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedCall, setSelectedCall] = useState<CallListItem | null>(null)

  const table = useTable({
    features,
    data: items,
    columns,
    manualPagination: true,
    rowCount: total,
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    state: {
      sorting,
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  })

  const channelFilter = filters.channel ?? "all"
  const directionFilter = filters.direction ?? "all"
  const statusFilter = filters.status ?? "all"

  return (
    <div>
      <div className="mb-5 flex items-center justify-end gap-2">
        <Select
          value={channelFilter}
          onValueChange={(value) =>
            onFiltersChange({
              channel: value === "all" ? undefined : (value as CallChannel),
            })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue>
              {
                channelFilterOptions.find(
                  (option) => option.value === channelFilter
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {channelFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={directionFilter}
          onValueChange={(value) =>
            onFiltersChange({
              direction: value === "all" ? undefined : (value as CallDirection),
            })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue>
              {
                directionFilterOptions.find(
                  (option) => option.value === directionFilter
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {directionFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onFiltersChange({
              status: value === "all" ? undefined : (value as CallStatus),
            })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue>
              {
                statusFilterOptions.find(
                  (option) => option.value === statusFilter
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
