import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { ApiKeysTable } from "@/components/settings/api-keys/api-keys-table"
import { useTranslation } from "@/lib/i18n"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings/api-keys/"
)({
  component: Page,
})

function ApiKeysSettingsSkeleton() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-70 w-full rounded-md" />
    </div>
  )
}

function Page() {
  const { t } = useTranslation()
  return (
    <>
      <title>{t("routes.settings.api_keys.page_title")}</title>
      <Suspense fallback={<ApiKeysSettingsSkeleton />}>
        <ApiKeysTable />
      </Suspense>
    </>
  )
}
