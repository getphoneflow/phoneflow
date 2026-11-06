import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useEffect, useState } from "react"

import { doNotCallListQuerySchema } from "@workspace/shared/api/do-not-call/schemas"
import type {
  DoNotCallListQuery,
  DoNotCallListResponse,
} from "@workspace/shared/api/do-not-call/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { AddDoNotCallDialog } from "@/components/do-not-call/add-do-not-call-dialog"
import { DoNotCallDataTable } from "@/components/do-not-call/do-not-call-data-table"
import { ImportDoNotCallDialog } from "@/components/do-not-call/import-do-not-call-dialog"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

function buildListPath(search: DoNotCallListQuery) {
  const params = new URLSearchParams()
  params.set("page", String(search.page))
  params.set("pageSize", String(search.pageSize))

  if (search.q) {
    params.set("q", search.q)
  }

  return `/do-not-call?${params.toString()}`
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/do-not-call/"
)({
  validateSearch: doNotCallListQuerySchema,
  component: Page,
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
              {t("routes.do_not_call.breadcrumb")}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex space-x-3">
        <Suspense fallback={<Skeleton className="h-9 w-64" />}>
          <ImportDoNotCallDialog />
          <AddDoNotCallDialog />
        </Suspense>
      </div>
    </header>
  )
}

function SearchInput() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [value, setValue] = useState(search.q ?? "")

  useEffect(() => {
    setValue(search.q ?? "")
  }, [search.q])

  useEffect(() => {
    const timeout = setTimeout(() => {
      const q = value.trim() || undefined
      if (q !== search.q) {
        navigate({ search: { ...search, q, page: 1 } })
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [value, search, navigate])

  return (
    <Input
      className="mb-4 max-w-sm"
      aria-label={t("routes.do_not_call.search_placeholder")}
      placeholder={t("routes.do_not_call.search_placeholder")}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  )
}

function Page() {
  const { t } = useTranslation()

  return (
    <>
      <title>{t("routes.do_not_call.page_title")}</title>
      <Header />
      <div className="p-5 pt-0">
        <SearchInput />
        <Suspense fallback={<Skeleton className="h-120 w-full rounded-md" />}>
          <DoNotCallTable />
        </Suspense>
      </div>
    </>
  )
}

function DoNotCallTable() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery({
    queryKey: ["do-not-call", "list", search],
    queryFn: () => api.get<DoNotCallListResponse>(buildListPath(search)),
  })

  return (
    <DoNotCallDataTable
      items={data.items}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      onPageChange={(page) => {
        navigate({ search: { ...search, page } })
      }}
      onPageSizeChange={(pageSize) => {
        navigate({ search: { ...search, pageSize, page: 1 } })
      }}
    />
  )
}
