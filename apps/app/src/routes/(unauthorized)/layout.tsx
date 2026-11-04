import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { LanguageSelect } from "@/components/language-select"
import { sessionQueryOptions } from "@/lib/auth/session"

const searchSchema = z.object({
  email: z.email().optional(),
  redirect: z.string().optional(),
})

export const Route = createFileRoute("/(unauthorized)")({
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(
      sessionQueryOptions()
    )

    if (session) {
      throw redirect({ to: "/" })
    }
  },
  component: UnauthorizedLayout,
})

function UnauthorizedLayout() {
  return (
    <>
      <div className="fixed top-4 right-4">
        <LanguageSelect className="w-36" />
      </div>
      <Outlet />
    </>
  )
}
