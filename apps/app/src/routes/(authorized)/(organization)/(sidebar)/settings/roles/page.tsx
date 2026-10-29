import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { RolesTable } from "@/components/settings/roles/roles-table"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings/roles/"
)({
  component: Page,
})

function RolesSettingsSkeleton() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-9 w-30" />
      </div>
      <Skeleton className="h-70 w-full rounded-md" />
    </div>
  )
}

function Page() {
  return (
    <>
      <title>Roles settings - Phoneflow</title>
      <Suspense fallback={<RolesSettingsSkeleton />}>
        <RolesTable />
      </Suspense>
    </>
  )
}
