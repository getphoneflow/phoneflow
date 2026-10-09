import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { toast } from "@workspace/ui/components/sonner"
import { captureEvent } from "@/lib/analytics"
import { organization } from "@/lib/auth/client"
import { organizationsListQueryOptions } from "@/lib/auth/organization"

export const Route = createFileRoute("/(authorized)/select-organization/")({
  loader: async ({ context }) => {
    const organizations = await context.queryClient.ensureQueryData(
      organizationsListQueryOptions()
    )

    if (!organizations || organizations.length === 0) {
      throw redirect({ to: "/create-organization" })
    }

    if (organizations.length === 1) {
      const [only] = organizations
      const result = await organization.setActive({ organizationId: only.id })
      if (result.error) {
        throw new Error(result.error.message)
      }
      context.queryClient.removeQueries({ queryKey: ["full-organization"] })
      await context.queryClient.refetchQueries({ type: "active" })
      throw redirect({ to: "/" })
    }
  },
  component: Page,
})

function Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: organizations } = useSuspenseQuery(
    organizationsListQueryOptions()
  )

  const setActiveMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const result = await organization.setActive({ organizationId })
      if (result.error) {
        throw new Error(result.error.message)
      }
      return organizationId
    },
    onSuccess: async (organizationId) => {
      captureEvent("organization_switched", {
        organization_id: organizationId,
      })
      await queryClient.refetchQueries()
      navigate({ to: "/" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <title>Select organization - PhoneFlow</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Select organization</CardTitle>
            <CardDescription>
              Choose an organization to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 mb-6">
              {organizations?.map((org) => (
                <Button
                  key={org.id}
                  variant="outline"
                  className="justify-start"
                  disabled={setActiveMutation.isPending}
                  onClick={() => setActiveMutation.mutate(org.id)}
                >
                  {org.name}
                </Button>
              ))}
            </div>

            <Button
              render={<Link to="/create-organization" />}
              variant="ghost"
              className="w-full"
            >
              Create organization
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
