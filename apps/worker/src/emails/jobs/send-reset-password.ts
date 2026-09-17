import sendEmail from "@workspace/email/send"
import ResetPasswordEmail from "@workspace/email/templates/auth/reset-password"
import type { SendResetPasswordPayload } from "@workspace/shared/jobs/emails/types"
import { env } from "@/lib/env"

export async function sendResetPassword(payload: SendResetPasswordPayload) {
  await sendEmail(
    env.EMAIL_FROM,
    payload.to,
    "Reset Password",
    ResetPasswordEmail({
      name: payload.name,
      url: payload.url,
    })
  )
}
