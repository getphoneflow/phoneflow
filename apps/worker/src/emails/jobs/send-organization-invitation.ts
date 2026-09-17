import sendEmail from "@workspace/email/send"
import AcceptOrganizationInvitationEmail from "@workspace/email/templates/auth/accept-organization-invitation"
import type { SendOrganizationInvitationPayload } from "@workspace/shared/jobs/emails/types"
import { env } from "@/lib/env"

export async function sendOrganizationInvitation(
  payload: SendOrganizationInvitationPayload
) {
  await sendEmail(
    env.EMAIL_FROM,
    payload.to,
    "Accept invitation to join " + payload.organizationName,
    AcceptOrganizationInvitationEmail({
      url: payload.url,
      organizationName: payload.organizationName,
    })
  )
}
