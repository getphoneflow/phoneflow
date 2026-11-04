import { createFileRoute, redirect } from "@tanstack/react-router"

import { toast } from "@workspace/ui/components/sonner"
import { captureEvent } from "@/lib/analytics"
import { organization } from "@/lib/auth/client"
import { t } from "@/lib/i18n"

export const Route = createFileRoute("/(authorized)/join-organization/")({
  loader: async ({ context, location }) => {
    const invitationId = new URLSearchParams(location.searchStr).get(
      "invitationId"
    )

    if (!invitationId) {
      throw redirect({ to: "/" })
    }

    const result = await organization.acceptInvitation({ invitationId })

    if (result.error) {
      toast.error(result.error.message)
      throw redirect({ to: "/" })
    }

    captureEvent("organization_joined", {
      invitation_id: invitationId,
      organization_id: result.data?.member?.organizationId,
    })
    await context.queryClient.refetchQueries()
    toast.success(t("routes.join_organization.toasts.joined"))
    throw redirect({ to: "/" })
  },
})
