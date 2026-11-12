import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import type { KnowledgeDocumentListResponse } from "@workspace/shared/api/knowledge-documents/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { AddKnowledgeDocumentForm } from "@/components/knowledge-documents/add-knowledge-document-form"
import { KnowledgeDocumentsDataTable } from "@/components/knowledge-documents/knowledge-documents-data-table"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

function queryOptions() {
  return {
    queryKey: ["knowledge-documents", "list"],
    queryFn: () =>
      api.get<KnowledgeDocumentListResponse>("/knowledge-documents"),
  }
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/knowledge-bases/"
)({
  component: Page,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(queryOptions()),
})

function Header() {
  const { t } = useTranslation()

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
            <BreadcrumbPage>
              {t("routes.knowledge_bases.breadcrumb")}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex space-x-3">
        <AddKnowledgeDocumentForm />
      </div>
    </header>
  )
}

function Page() {
  const { t } = useTranslation()
  const { data: documents } = useSuspenseQuery(queryOptions())

  return (
    <>
      <title>{t("routes.knowledge_bases.page_title")}</title>
      <Header />
      <div className="p-5 pt-0">
        <KnowledgeDocumentsDataTable data={documents} />
      </div>
    </>
  )
}
