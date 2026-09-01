import { queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { DeleteAccount } from "@/components/settings/account/delete-account"
import { SetNewPassword } from "@/components/settings/account/set-new-password"
import { UserInformation } from "@/components/settings/account/user-information"
import { listAccounts } from "@/lib/auth/client"
import { sessionQueryOptions } from "@/lib/auth/session"

function accountProvidersQueryOptions() {
  return queryOptions({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await listAccounts()
      if (error) {
        throw new Error(error.message)
      }
      return data ?? []
    },
  })
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings/account/"
)({
  component: Page,
})

function Page() {
  const { data: session } = useSuspenseQuery(sessionQueryOptions())
  const { data: accounts } = useSuspenseQuery(accountProvidersQueryOptions())

  if (!session) {
    return null
  }

  return (
    <>
      <title>Account settings</title>
      <div className="mx-auto max-w-lg space-y-8">
        <UserInformation
          name={session.user.name}
          email={session.user.email}
          timezone={session.user.timezone}
        />
        <SetNewPassword accounts={accounts} />
        <DeleteAccount email={session.user.email} />
      </div>
    </>
  )
}
