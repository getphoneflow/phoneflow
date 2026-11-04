/** @jsxRuntime automatic */
import { Button, Section, Text } from "react-email"

import EmailBase from "@workspace/email/components/base"
import { useTranslation } from "@workspace/email/i18n"

interface AcceptOrganizationInvitationEmailProps {
  locale: string
  url: string
  organizationName: string
}

export default function AcceptOrganizationInvitationEmail({
  locale,
  url,
  organizationName,
}: AcceptOrganizationInvitationEmailProps) {
  const t = useTranslation(locale)

  return (
    <EmailBase
      preview={t("accept_organization_invitation.preview", {
        organization_name: organizationName,
      })}
    >
      <Text>
        {t("accept_organization_invitation.body", {
          organization_name: organizationName,
        })}
      </Text>
      <Section className="my-8 text-center">
        <Button href={url} className="rounded-lg bg-black px-6 py-2 text-white">
          {t("accept_organization_invitation.cta")}
        </Button>
      </Section>
    </EmailBase>
  )
}
