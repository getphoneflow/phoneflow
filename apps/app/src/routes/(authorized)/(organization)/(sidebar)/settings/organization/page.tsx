import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { DeleteOrganization } from "@/components/settings/organization/delete-organization"
import { OrganizationInformation } from "@/components/settings/organization/organization-information"
import { fullOrganizationQueryOptions } from "@/lib/auth/organization"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings/organization/"
)({
  component: Page,
})

function Page() {
  const { data: activeOrganization } = useSuspenseQuery(
    fullOrganizationQueryOptions()
  )

  if (!activeOrganization) {
    return null
  }

  return (
    <>
      <title>Organization settings - PhoneFlow</title>
      <div className="mx-auto max-w-lg space-y-8">
        <OrganizationInformation
          organizationId={activeOrganization.id}
          name={activeOrganization.name}
          slug={activeOrganization.slug}
        />
        <DeleteOrganization
          organizationId={activeOrganization.id}
          name={activeOrganization.name}
        />
      </div>
    </>
  )
}
