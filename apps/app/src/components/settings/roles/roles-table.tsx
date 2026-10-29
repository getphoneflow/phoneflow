import { useSuspenseQuery } from "@tanstack/react-query"
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PlusIcon,
  Search,
} from "lucide-react"
import { useState } from "react"

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
import {
  RoleDialog,
  resourceLabel,
} from "@/components/settings/roles/role-dialog"
import { RoleRowActions } from "@/components/settings/roles/role-row-actions"
import type { organization } from "@/lib/auth/client"
import { organizationRolesQueryOptions } from "@/lib/auth/organization"
import { useCheckPermission } from "@/lib/auth/permissions"

type OrganizationRole = NonNullable<
  Awaited<ReturnType<typeof organization.listRoles>>["data"]
>[number]

type RoleRow = {
  id: string
  name: string
  permission: Record<string, readonly string[] | undefined>
  source?: OrganizationRole
}

const features = tableFeatures({
  columnFilteringFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
})

function summarizePermissions(
  permission: Record<string, readonly string[] | undefined>
) {
  const parts = Object.entries(permission)
    .filter((entry): entry is [string, readonly string[]] =>
      Boolean(entry[1]?.length)
    )
    .map(
      ([resource, actions]) =>
        `${resourceLabel(resource)} (${actions.join(", ")})`
    )

  return parts.length > 0 ? parts.join(", ") : "No permissions"
}

function columnClass(columnId: string) {
  if (columnId === "name") {
    return "w-40 align-top font-medium"
  }

  if (columnId === "permissions") {
    return "whitespace-normal text-muted-foreground"
  }

  if (columnId === "actions") {
    return "w-0"
  }

  return undefined
}

export function RolesTable() {
  const { data: roles } = useSuspenseQuery(organizationRolesQueryOptions())
  const canCreate = useCheckPermission({ ac: ["create"] })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<OrganizationRole>()

  const data: RoleRow[] = [
    {
      id: "owner",
      name: "Owner",
      permission: {},
    },
    ...roles.map((role) => ({
      id: role.id,
      name: role.displayName,
      permission: role.permission,
      source: role,
    })),
  ]

  const columnHelper = createColumnHelper<typeof features, RoleRow>()
  const columns = columnHelper.columns([
    columnHelper.accessor("name", {
      header: "Role",
      filterFn: "includesString",
    }),
    columnHelper.display({
      id: "permissions",
      header: "Permissions",
      cell: ({ row }) =>
        row.original.id === "owner"
          ? "Full access. This role can't be changed."
          : summarizePermissions(row.original.permission),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const role = row.original.source
        if (!role) {
          return null
        }

        return (
          <RoleRowActions
            role={role}
            onEdit={() => {
              setEditingRole(role)
              setDialogOpen(true)
            }}
          />
        )
      },
    }),
  ])

  const table = useTable({
    features,
    data,
    columns,
    getRowId: (row) => row.id,
  })

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <InputGroup className="max-w-xs">
          <InputGroupInput
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            placeholder="Search roles..."
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <Button
          disabled={!canCreate}
          onClick={() => {
            setEditingRole(undefined)
            setDialogOpen(true)
          }}
        >
          <PlusIcon />
          Create role
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.id === "name"
                        ? "w-40"
                        : header.column.id === "actions"
                          ? "w-0"
                          : undefined
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
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={columnClass(cell.column.id)}
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
          <span className="text-sm font-medium">Rows per page</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="pr-2 text-sm font-medium">
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

      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editingRole}
      />
    </div>
  )
}
