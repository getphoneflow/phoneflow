import { t } from "@workspace/email/i18n"
import sendEmail from "@workspace/email/send"
import VerificationOtpEmail from "@workspace/email/templates/auth/verification-otp"
import type { SendVerificationOtpPayload } from "@workspace/shared/jobs/emails/types"
import { env } from "@/lib/env"

export async function sendVerificationOtp(payload: SendVerificationOtpPayload) {
  const { locale, otp } = payload

  await sendEmail(
    env.EMAIL_FROM,
    payload.to,
    t(locale, "verification_otp.subject"),
    VerificationOtpEmail({ locale, otp })
  )
}
