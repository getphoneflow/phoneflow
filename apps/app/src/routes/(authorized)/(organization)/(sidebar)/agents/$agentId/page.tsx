import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Suspense, useLayoutEffect } from "react"

import type {
  AgentConfigResponse,
  AgentDetailResponse,
} from "@workspace/shared/api/agents/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { AgentAutoSave } from "@/components/agents/agent-auto-save"
import { AgentNameField } from "@/components/agents/agent-name-field"
import { AgentVersionSelector } from "@/components/agents/agent-version-selector"
import { PublishAgentForm } from "@/components/agents/publish-agent-form"
import { TestAgentButton } from "@/components/agents/test-agent-button"
import Canvas from "@/components/flow/canvas"
import { FlowSidePanel } from "@/components/flow/sidepanel"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useAgentStore } from "@/stores/agent"

function agentQueryOptions(agentId: string) {
  return {
    queryKey: ["agents", "detail", agentId],
    queryFn: () => api.get<AgentDetailResponse>(`/agents/${agentId}`),
  }
}

function agentConfigQueryOptions(agentId: string) {
  return {
    queryKey: ["agents", "config", agentId],
    queryFn: () => api.get<AgentConfigResponse>(`/agents/${agentId}/config`),
  }
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/agents/$agentId/"
)({
  component: Page,
})

function AgentEditorSkeleton() {
  return (
    <>
      <header className="flex h-18 shrink-0 items-center gap-3 px-5">
        <Skeleton className="size-6" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-40" />
        <div className="ml-auto flex space-x-3">
          <Skeleton className="h-9 w-18" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-23" />
        </div>
      </header>
      <Skeleton className="size-full rounded-none" />
    </>
  )
}

function Header() {
  return (
    <header className="flex h-18 shrink-0 items-center gap-2 px-5">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <Link to="/agents">
              <BreadcrumbLink>Agents</BreadcrumbLink>
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>
              <AgentNameField />
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center space-x-3">
        <AgentAutoSave />
        <TestAgentButton />
        <AgentVersionSelector />
        <PublishAgentForm />
      </div>
    </header>
  )
}

function Page() {
  return (
    <Suspense fallback={<AgentEditorSkeleton />}>
      <AgentEditor />
    </Suspense>
  )
}

function AgentEditor() {
  const { agentId } = Route.useParams()
  const { data: agent } = useSuspenseQuery(agentQueryOptions(agentId))
  const { data: agentConfig } = useSuspenseQuery(
    agentConfigQueryOptions(agentId)
  )
  const canUpdateAgent = useCheckPermission({ agent: ["update"] })
  const setAgent = useAgentStore((state) => state.setAgent)
  const loadAgentConfig = useAgentStore((state) => state.loadAgentConfig)
  const name = useAgentStore((state) => state.agent.name)

  useLayoutEffect(() => {
    setAgent(agent)
  }, [agent, setAgent])

  useLayoutEffect(() => {
    loadAgentConfig(agentConfig, !canUpdateAgent)
  }, [agentId, agentConfig, canUpdateAgent, loadAgentConfig])

  return (
    <>
      <title>{name}</title>
      <Header />
      <Canvas />
      <FlowSidePanel />
    </>
  )
}
