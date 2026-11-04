import { t } from "@workspace/email/i18n"
import sendEmail from "@workspace/email/send"
import AcceptOrganizationInvitationEmail from "@workspace/email/templates/auth/accept-organization-invitation"
import type { SendOrganizationInvitationPayload } from "@workspace/shared/jobs/emails/types"
import { env } from "@/lib/env"

export async function sendOrganizationInvitation(
  payload: SendOrganizationInvitationPayload
) {
  const { locale, url, organizationName } = payload

  await sendEmail(
    env.EMAIL_FROM,
    payload.to,
    t(locale, "accept_organization_invitation.subject", {
      organization_name: organizationName,
    }),
    AcceptOrganizationInvitationEmail({ locale, url, organizationName })
  )
}
