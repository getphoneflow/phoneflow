/** @jsxRuntime automatic */
import { Button, Section, Text } from "react-email"

import EmailBase from "@workspace/email/components/base"
import { useTranslation } from "@workspace/email/i18n"

interface ResetPasswordEmailProps {
  locale: string
  name: string
  url: string
}

export default function ResetPasswordEmail({
  locale,
  name,
  url,
}: ResetPasswordEmailProps) {
  const t = useTranslation(locale)

  return (
    <EmailBase preview={t("reset_password.preview")}>
      <Text>{t("reset_password.greeting", { name })}</Text>
      <Text>{t("reset_password.body")}</Text>
      <Section className="my-8 text-center">
        <Button href={url} className="rounded-lg bg-black px-6 py-2 text-white">
          {t("reset_password.cta")}
        </Button>
      </Section>
      <Text>{t("reset_password.ignore")}</Text>
    </EmailBase>
  )
}
