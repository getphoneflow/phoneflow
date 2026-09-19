/** @jsxRuntime automatic */
import { Button, Section, Text } from "react-email"

import EmailBase from "@workspace/email/components/base"

interface ResetPasswordEmailProps {
  name: string
  url: string
}

export default function ResetPasswordEmail({
  url,
  name,
}: ResetPasswordEmailProps) {
  return (
    <EmailBase preview="Reset your password">
      <Text>Hi {name},</Text>
      <Text>
        We received a request to reset your password. If this was you, you can
        set a new password here:
      </Text>
      <Section className="my-8 text-center">
        <Button href={url} className="rounded-lg bg-black px-6 py-2 text-white">
          Set new password
        </Button>
      </Section>
      <Text>
        If you didn't make this request, you can safely ignore this email.
      </Text>
    </EmailBase>
  )
}
