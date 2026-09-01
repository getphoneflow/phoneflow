import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { FieldLegend, FieldSet } from "@workspace/ui/components/field"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { InvitationsTable } from "@/components/settings/members/invitations-table"
import { MembersTable } from "@/components/settings/members/members-table"
import {
  organizationInvitationsQueryOptions,
  organizationMembersQueryOptions,
} from "@/lib/auth/organization"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings/members/"
)({
  component: Page,
})

function MembersSettingsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-5 flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-60 w-full rounded-md" />
      </div>
      <Skeleton className="h-50 w-full rounded-md" />
    </div>
  )
}

function Page() {
  return (
    <>
      <title>Members settings</title>
      <Suspense fallback={<MembersSettingsSkeleton />}>
        <MembersSettings />
      </Suspense>
    </>
  )
}

function MembersSettings() {
  const { data: members } = useSuspenseQuery(organizationMembersQueryOptions())
  const { data: invitations } = useSuspenseQuery(
    organizationInvitationsQueryOptions()
  )

  return (
    <div className="space-y-8">
      <MembersTable data={members} />
      <div>
        <FieldSet>
          <FieldLegend>Pending invitations</FieldLegend>
        </FieldSet>
        <InvitationsTable data={invitations} />
      </div>
    </div>
  )
}
