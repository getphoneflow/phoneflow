import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { useState } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { CallExtractionForm } from "@/components/call-extractions/call-extraction-form"
import {
  CallExtractionsDataTable,
  callExtractionsQueryOptions,
} from "@/components/call-extractions/call-extractions-data-table"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/call-extractions/"
)({
  component: Page,
})

function Header() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const canCreate = useCheckPermission({ callExtraction: ["create"] })

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
              {t("routes.call_extractions.breadcrumb")}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <Button disabled={!canCreate} onClick={() => setOpen(true)}>
          <PlusIcon />
          {t("components.call_extractions.form.trigger")}
        </Button>
        <CallExtractionForm open={open} onOpenChange={setOpen} />
      </div>
    </header>
  )
}

function Page() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(callExtractionsQueryOptions())

  return (
    <>
      <title>{t("routes.call_extractions.page_title")}</title>
      <Header />
      <div className="p-5 pt-0">
        <CallExtractionsDataTable data={data} />
      </div>
    </>
  )
}
