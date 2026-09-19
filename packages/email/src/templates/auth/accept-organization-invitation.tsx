/** @jsxRuntime automatic */
import { Button, Section, Text } from "react-email"

import EmailBase from "@workspace/email/components/base"

interface AcceptOrganizationInvitationEmailProps {
  url: string
  organizationName: string
}

export default function AcceptOrganizationInvitationEmail({
  url,
  organizationName,
}: AcceptOrganizationInvitationEmailProps) {
  return (
    <EmailBase preview={`Accept invitation to join ${organizationName}`}>
      <Text>
        You have been invited to join {organizationName}. Click the button below
        to accept the invitation:
      </Text>
      <Section className="my-8 text-center">
        <Button href={url} className="rounded-lg bg-black px-6 py-2 text-white">
          Accept invitation
        </Button>
      </Section>
    </EmailBase>
  )
}
