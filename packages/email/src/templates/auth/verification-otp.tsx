/** @jsxRuntime automatic */
import { Text } from "react-email"

import EmailBase from "@workspace/email/components/base"

interface VerificationOtpEmailProps {
  otp: string
}

export default function VerificationOtpEmail({
  otp,
}: VerificationOtpEmailProps) {
  return (
    <EmailBase preview="Verify your email address">
      <Text>
        Thanks for signing up. Use this code to verify your email address:
      </Text>
      <Text className="text-3xl my-8 text-center font-bold tracking-widest">
        {otp}
      </Text>
      <Text>
        If you didn't create an account, you can safely ignore this email.
      </Text>
    </EmailBase>
  )
}
