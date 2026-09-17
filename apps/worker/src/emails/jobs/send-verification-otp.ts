import sendEmail from "@workspace/email/send"
import VerificationOtpEmail from "@workspace/email/templates/auth/verification-otp"
import type { SendVerificationOtpPayload } from "@workspace/shared/jobs/emails/types"
import { env } from "@/lib/env"

export async function sendVerificationOtp(payload: SendVerificationOtpPayload) {
  await sendEmail(
    env.EMAIL_FROM,
    payload.to,
    "Verify your email",
    VerificationOtpEmail({
      otp: payload.otp,
    })
  )
}
