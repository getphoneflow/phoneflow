import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { z } from "zod"

import { callListQuerySchema } from "@workspace/shared/api/calls/schemas"
import type {
  CallListQuery,
  CallListResponse,
} from "@workspace/shared/api/calls/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { CallDetailSheet } from "@/components/calls/call-detail-sheet"
import { CallsDataTable } from "@/components/calls/calls-data-table"
import { CallsFilters } from "@/components/calls/calls-filters"
import { DownloadCallsDialog } from "@/components/calls/download-calls-dialog"
import { LiveCallSheet } from "@/components/calls/live-call-sheet"
import { api } from "@/lib/api"

const callsPageSearchSchema = callListQuerySchema.extend({
  callId: z.uuid().optional(),
  liveCallId: z.uuid().optional(),
})

function buildCallsListPath(search: CallListQuery) {
  const params = new URLSearchParams()
  params.set("page", String(search.page))
  params.set("pageSize", String(search.pageSize))
  params.set("sortBy", search.sortBy)
  params.set("sortDir", search.sortDir)

  if (search.channel) {
    params.set("channel", search.channel)
  }

  if (search.direction) {
    params.set("direction", search.direction)
  }

  if (search.status) {
    params.set("status", search.status)
  }

  if (search.startedAtFrom) {
    params.set("startedAtFrom", search.startedAtFrom)
  }

  if (search.startedAtTo) {
    params.set("startedAtTo", search.startedAtTo)
  }

  if (search.agentIds) {
    params.set(
      "agentIds",
      Array.isArray(search.agentIds)
        ? search.agentIds.join(",")
        : search.agentIds
    )
  }

  if (search.fromNumbers) {
    params.set(
      "fromNumbers",
      Array.isArray(search.fromNumbers)
        ? search.fromNumbers.join(",")
        : search.fromNumbers
    )
  }

  if (search.toNumbers) {
    params.set(
      "toNumbers",
      Array.isArray(search.toNumbers)
        ? search.toNumbers.join(",")
        : search.toNumbers
    )
  }

  if (search.costOp) {
    params.set("costOp", search.costOp)
  }

  if (search.cost !== undefined) {
    params.set("cost", String(search.cost))
  }

  if (search.costMax !== undefined) {
    params.set("costMax", String(search.costMax))
  }

  if (search.durationOp) {
    params.set("durationOp", search.durationOp)
  }

  if (search.duration !== undefined) {
    params.set("duration", String(search.duration))
  }

  if (search.durationMax !== undefined) {
    params.set("durationMax", String(search.durationMax))
  }

  if (search.batchId) {
    params.set("batchId", search.batchId)
  }

  return `/calls?${params.toString()}`
}

function queryOptions(search: CallListQuery) {
  return {
    queryKey: ["calls", search],
    queryFn: () => api.get<CallListResponse>(buildCallsListPath(search)),
  }
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/calls/"
)({
  validateSearch: callsPageSearchSchema,
  component: Page,
})

function Header() {
  return (
    <header className="flex h-18 items-center gap-2 px-5">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Calls</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex space-x-3">
        <DownloadCallsDialog />
      </div>
    </header>
  )
}

function Page() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <>
      <title>Calls - PhoneFlow</title>
      <Header />
      <div className="p-5 pt-0">
        <CallsFilters
          filters={search}
          onFiltersChange={(nextFilters) => {
            navigate({
              search: {
                ...search,
                ...nextFilters,
                page: 1,
              },
            })
          }}
        />
        <Suspense fallback={<Skeleton className="h-120 w-full rounded-md" />}>
          <CallsTable />
        </Suspense>
      </div>
    </>
  )
}

function CallsTable() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { callId, liveCallId, ...listQuery } = search
  const { data } = useSuspenseQuery(queryOptions(listQuery))
  const { sortBy, sortDir } = listQuery

  return (
    <>
      <CallsDataTable
        items={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        sortBy={sortBy}
        sortDir={sortDir}
        onCallSelect={(nextCallId) => {
          navigate({
            search: { ...search, callId: nextCallId, liveCallId: undefined },
          })
        }}
        onLiveCallSelect={(nextLiveCallId) => {
          navigate({
            search: {
              ...search,
              liveCallId: nextLiveCallId,
              callId: undefined,
            },
          })
        }}
        onSortingChange={(sorting) => {
          navigate({
            search: {
              ...search,
              ...sorting,
              page: 1,
            },
          })
        }}
        onPageChange={(page) => {
          navigate({
            search: {
              ...search,
              page,
            },
          })
        }}
        onPageSizeChange={(pageSize) => {
          navigate({
            search: {
              ...search,
              pageSize,
              page: 1,
            },
          })
        }}
      />
      <CallDetailSheet
        callId={callId}
        open={Boolean(callId)}
        onClose={() => {
          navigate({ search: { ...search, callId: undefined } })
        }}
      />
      <LiveCallSheet
        callId={liveCallId}
        open={Boolean(liveCallId)}
        onClose={() => {
          navigate({ search: { ...search, liveCallId: undefined } })
        }}
      />
    </>
  )
}
