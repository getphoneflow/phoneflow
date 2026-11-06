import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import type { BatchCallDetailResponse } from "@workspace/shared/api/batch-calls/types"
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
import {
  BatchCallDetail,
  batchCallRefetchInterval,
} from "@/components/batch-calls/batch-call-detail"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/batch-calls/$batchCallId/"
)({
  component: Page,
})

function Page() {
  const { t } = useTranslation()
  const { batchCallId } = Route.useParams()
  const { data: batchCall } = useSuspenseQuery({
    queryKey: ["batch-calls", batchCallId],
    queryFn: () =>
      api.get<BatchCallDetailResponse>(`/batch-calls/${batchCallId}`),
    refetchInterval: (query) => batchCallRefetchInterval(query.state.data),
  })

  return (
    <>
      <title>
        {t("routes.batch_calls_detail.page_title", { name: batchCall.name })}
      </title>
      <header className="flex h-18 items-center gap-2 px-5">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/batch-calls" />}>
                {t("routes.batch_calls_detail.breadcrumb_parent")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{batchCall.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="p-5 pt-0">
        <BatchCallDetail batchCall={batchCall} />
      </div>
    </>
  )
}
