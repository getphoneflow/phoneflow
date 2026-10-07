import { createFileRoute } from "@tanstack/react-router"

import { RolesTable } from "@/components/settings/roles/roles-table"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings/roles/"
)({
  component: Page,
})

function Page() {
  return (
    <>
      <title>Roles settings - PhoneFlow</title>
      <RolesTable />
    </>
  )
}
