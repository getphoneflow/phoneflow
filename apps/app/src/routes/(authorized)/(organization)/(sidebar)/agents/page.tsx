import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import type { AgentsListResponse } from "@workspace/shared/api/agents/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { AgentsDataTable } from "@/components/agents/agents-data-table"
import { CreateAgentForm } from "@/components/agents/create-agent-form"
import { ImportAgentForm } from "@/components/agents/import-agent-form"
import { api } from "@/lib/api"

function queryOptions() {
  return {
    queryKey: ["agents", "list"],
    queryFn: () => api.get<AgentsListResponse>("/agents"),
  }
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/agents/"
)({
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
            <BreadcrumbPage>Agents</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex space-x-3">
        <ImportAgentForm />
        <CreateAgentForm />
      </div>
    </header>
  )
}

function Page() {
  const { data: agents } = useSuspenseQuery(queryOptions())

  return (
    <>
      <title>Agents - PhoneFlow</title>
      <Header />
      <div className="p-5 pt-0">
        <AgentsDataTable data={agents} />
      </div>
    </>
  )
}
