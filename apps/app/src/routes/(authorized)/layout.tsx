import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { UserTimeZoneProvider } from "@/components/user-timezone-provider"
import { sessionQueryOptions } from "@/lib/auth/session"

export const Route = createFileRoute("/(authorized)")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(
      sessionQueryOptions()
    )

    if (!session) {
      throw redirect({
        to: "/signin",
        search: {
          redirect: `${location.pathname}${location.searchStr}`,
        },
      })
    }
  },
  component: Layout,
})

function Layout() {
  return (
    <UserTimeZoneProvider>
      <Outlet />
    </UserTimeZoneProvider>
  )
}
