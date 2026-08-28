import { Link } from "@tanstack/react-router"
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
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
  Search,
} from "lucide-react"
import { useState } from "react"

import type { CallListResponse } from "@workspace/shared/api/calls/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { CallDetailSheet } from "@/components/calls/call-detail-sheet"
import { SortableHeader } from "@/components/sortable-header"

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

const secondsFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

function parseCost(value: string | null) {
  return value === null ? null : Number(value)
}

function exactFilterFn(
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: string
) {
  if (!filterValue || filterValue === "all") {
    return true
  }

  return row.getValue(columnId) === filterValue
}

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

function CostCell({ call }: { call: CallListResponse[number] }) {
  const totalCost = parseCost(call.totalCost)

  if (totalCost === null) {
    return null
  }

  const breakdown = [
    { label: "STT", model: call.sttModel, cost: parseCost(call.sttCost)! },
    { label: "LLM", model: call.llmModel, cost: parseCost(call.llmCost)! },
    { label: "TTS", model: call.ttsModel, cost: parseCost(call.ttsCost)! },
    { label: "Telephony", model: null, cost: parseCost(call.telephonyCost)! },
    { label: "Platform", model: null, cost: parseCost(call.platformCost)! },
  ].filter((item) => item.cost > 0)

  return (
    <HoverCard>
      <HoverCardTrigger className="inline-flex items-center gap-1">
        {usdFormatter.format(totalCost)}
        <CircleHelpIcon className="size-3.5 text-muted-foreground" />
      </HoverCardTrigger>
      <HoverCardContent className="flex flex-col gap-2">
        {breakdown.map((item) => (
          <div
            key={item.label}
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
            <span className="text-xs">{usdFormatter.format(item.cost)}</span>
          </div>
        ))}
      </HoverCardContent>
    </HoverCard>
  )
}

const columns: ColumnDef<CallListResponse[number]>[] = [
  {
    accessorKey: "startedAt",
    header: ({ column }) => <SortableHeader column={column} title="Started" />,
    cell: ({ row }) => dateFormatter.format(new Date(row.original.startedAt)),
  },
  {
    id: "duration",
    accessorFn: (row) => row.durationMs,
    header: ({ column }) => <SortableHeader column={column} title="Duration" />,
    cell: ({ row }) =>
      row.original.durationMs === null
        ? null
        : `${secondsFormatter.format(row.original.durationMs / 1000)}s`,
  },
  {
    id: "cost",
    accessorFn: (row) => parseCost(row.totalCost),
    header: ({ column }) => <SortableHeader column={column} title="Cost" />,
    cell: ({ row }) => <CostCell call={row.original} />,
  },
  {
    accessorKey: "channel",
    filterFn: exactFilterFn,
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
  },
  {
    accessorKey: "direction",
    filterFn: exactFilterFn,
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
  },
  {
    id: "from",
    header: "From",
    cell: ({ row }) => row.original.fromNumber,
  },
  {
    id: "to",
    header: "To",
    cell: ({ row }) => row.original.toNumber,
  },
  {
    id: "agent",
    accessorFn: (row) => row.agent?.name ?? "",
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
  },
  {
    id: "version",
    header: "Version",
    cell: ({ row }) =>
      row.original.agentVersion
        ? `V${row.original.agentVersion.number}`
        : "Latest",
  },
  {
    id: "variables",
    header: "Variables",
    enableSorting: false,
    cell: ({ row }) => Object.keys(row.original.variables ?? {}).length,
  },
  {
    accessorKey: "status",
    filterFn: exactFilterFn,
    header: "Status",
    cell: ({ row }) =>
      row.original.status === "in_progress" ? (
        <Badge variant="outline">In progress</Badge>
      ) : (
        <Badge variant="secondary">Completed</Badge>
      ),
  },
]

export function CallsDataTable({ data }: { data: CallListResponse }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedCall, setSelectedCall] = useState<
    CallListResponse[number] | null
  >(null)

  const table = useReactTable({
    data,
    columns,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      columnFilters,
      sorting,
    },
  })

  const channelFilter = table.getColumn("channel")?.getFilterValue() ?? "all"
  const directionFilter =
    table.getColumn("direction")?.getFilterValue() ?? "all"
  const statusFilter = table.getColumn("status")?.getFilterValue() ?? "all"

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <InputGroup className="max-w-xs">
          <InputGroupInput
            value={(table.getColumn("agent")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("agent")?.setFilterValue(event.target.value)
            }
            placeholder="Search calls..."
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <div className="flex items-center gap-2">
          <Select
            value={channelFilter}
            onValueChange={(value) =>
              table
                .getColumn("channel")
                ?.setFilterValue(value === "all" ? undefined : value)
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
              table
                .getColumn("direction")
                ?.setFilterValue(value === "all" ? undefined : value)
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
              table
                .getColumn("status")
                ?.setFilterValue(value === "all" ? undefined : value)
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
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
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
            value={`${table.getState().pagination.pageSize}`}
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
            Page {table.getState().pagination.pageIndex + 1} of{" "}
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
