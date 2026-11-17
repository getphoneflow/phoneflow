import { queryOptions, useSuspenseQuery } from "@tanstack/react-query"
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

import type {
  ApiKeyListResponse,
  ApiKeyResponse,
} from "@workspace/shared/api/api-keys/types"
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
import { ApiKeyDialog } from "@/components/settings/api-keys/api-key-dialog"
import { ApiKeyRowActions } from "@/components/settings/api-keys/api-key-row-actions"
import { usePermissionLabels } from "@/components/settings/permission-fields"
import { UserDateTime } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

function apiKeysQueryOptions() {
  return queryOptions({
    queryKey: ["api-keys"],
    queryFn: () => api.get<ApiKeyListResponse>("/api-keys"),
  })
}

const features = tableFeatures({
  columnFilteringFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
})

function columnClass(columnId: string) {
  if (columnId === "name" || columnId === "start") {
    return "align-middle font-medium"
  }
  if (columnId === "permissions") {
    return "align-middle whitespace-normal text-muted-foreground"
  }
  if (columnId === "actions") {
    return "w-0 align-middle"
  }
  return "align-middle text-muted-foreground"
}

export function ApiKeysTable() {
  const { t } = useTranslation()
  const { resourceLabel, actionLabel } = usePermissionLabels()
  const { data } = useSuspenseQuery(apiKeysQueryOptions())
  const canCreate = useCheckPermission({ apiKey: ["create"] })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKeyResponse>()

  function summarizePermissions(permission: ApiKeyResponse["permissions"]) {
    const parts = Object.entries(permission ?? {})
      .filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length))
      .map(([resource, actions]) =>
        t("components.settings.roles.roles_table.permission_summary", {
          resource: resourceLabel(resource),
          actions: actions.map((action) => actionLabel(action)).join(", "),
        })
      )

    return parts.length > 0
      ? parts.join(", ")
      : t("components.settings.roles.roles_table.no_permissions")
  }

  const columnHelper = createColumnHelper<typeof features, ApiKeyResponse>()
  const columns = columnHelper.columns([
    columnHelper.accessor("name", {
      header: () =>
        t("components.settings.api_keys.api_keys_table.columns.name"),
      filterFn: "includesString",
      cell: ({ getValue }) => getValue() || "—",
    }),
    columnHelper.accessor("start", {
      header: () =>
        t("components.settings.api_keys.api_keys_table.columns.key"),
      cell: ({ getValue }) => {
        const start = getValue()
        return <span className="font-mono">{start ? `${start}...` : "—"}</span>
      },
    }),
    columnHelper.display({
      id: "permissions",
      header: () =>
        t("components.settings.api_keys.api_keys_table.columns.permissions"),
      cell: ({ row }) => summarizePermissions(row.original.permissions),
    }),
    columnHelper.accessor("createdAt", {
      header: () =>
        t("components.settings.api_keys.api_keys_table.columns.created"),
      cell: ({ getValue }) => <UserDateTime value={getValue()} />,
    }),
    columnHelper.accessor("expiresAt", {
      header: () =>
        t("components.settings.api_keys.api_keys_table.columns.expires"),
      cell: ({ getValue }) => {
        const value = getValue()
        return value ? (
          <UserDateTime value={value} />
        ) : (
          t("components.settings.api_keys.api_keys_table.never")
        )
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ApiKeyRowActions
          apiKey={row.original}
          onEdit={() => {
            setEditingKey(row.original)
            setDialogOpen(true)
          }}
        />
      ),
    }),
  ])

  const table = useTable({
    features,
    data: data.apiKeys,
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
            placeholder={t(
              "components.settings.api_keys.api_keys_table.search.placeholder"
            )}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <Button
          disabled={!canCreate}
          onClick={() => {
            setEditingKey(undefined)
            setDialogOpen(true)
          }}
        >
          <PlusIcon />
          {t("components.settings.api_keys.api_keys_table.create")}
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
      <ApiKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        apiKey={editingKey}
      />
    </div>
  )
}
