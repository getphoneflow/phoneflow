import { t } from "@workspace/email/i18n"
import sendEmail from "@workspace/email/send"
import ResetPasswordEmail from "@workspace/email/templates/auth/reset-password"
import type { SendResetPasswordPayload } from "@workspace/shared/jobs/emails/types"
import { env } from "@/lib/env"

export async function sendResetPassword(payload: SendResetPasswordPayload) {
  const { locale, name, url } = payload

  await sendEmail(
    env.EMAIL_FROM,
    payload.to,
    t(locale, "reset_password.subject"),
    ResetPasswordEmail({ locale, name, url })
  )
}
