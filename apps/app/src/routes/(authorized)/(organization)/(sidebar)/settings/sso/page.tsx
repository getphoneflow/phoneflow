import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { SsoSettings } from "@/components/settings/sso/sso-settings"
import { fullOrganizationQueryOptions } from "@/lib/auth/organization"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings/sso/"
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
      <title>Single sign-on - Phoneflow</title>
      <div className="mx-auto max-w-lg">
        <SsoSettings
          organizationId={activeOrganization.id}
          slug={activeOrganization.slug}
        />
      </div>
    </>
  )
}
