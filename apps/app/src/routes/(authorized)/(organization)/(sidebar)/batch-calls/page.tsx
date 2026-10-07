import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"

import type { BatchCallListResponse } from "@workspace/shared/api/batch-calls/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { BatchCallsDataTable } from "@/components/batch-calls/batch-calls-data-table"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"

function batchCallsQueryOptions() {
  return {
    queryKey: ["batch-calls"],
    queryFn: () => api.get<BatchCallListResponse>("/batch-calls"),
  }
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/batch-calls/"
)({
  component: Page,
})

function Header() {
  const canCreate = useCheckPermission({ calls: ["create"] })

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
            <BreadcrumbPage>Batch calls</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <Button
          render={<Link to="/batch-calls/create" />}
          disabled={!canCreate}
        >
          <PlusIcon />
          Create batch call
        </Button>
      </div>
    </header>
  )
}

function Page() {
  const { data: batchCalls } = useSuspenseQuery(batchCallsQueryOptions())

  return (
    <>
      <title>Batch calls - PhoneFlow</title>
      <Header />
      <div className="p-5 pt-0">
        <BatchCallsDataTable data={batchCalls} />
      </div>
    </>
  )
}
