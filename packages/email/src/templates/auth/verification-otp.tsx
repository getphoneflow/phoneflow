/** @jsxRuntime automatic */
import { Text } from "react-email"

import EmailBase from "@workspace/email/components/base"
import { useTranslation } from "@workspace/email/i18n"

interface VerificationOtpEmailProps {
  locale: string
  otp: string
}

export default function VerificationOtpEmail({
  locale,
  otp,
}: VerificationOtpEmailProps) {
  const t = useTranslation(locale)

  return (
    <EmailBase preview={t("verification_otp.preview")}>
      <Text>{t("verification_otp.body")}</Text>
      <Text className="text-3xl my-8 text-center font-bold tracking-widest">
        {otp}
      </Text>
      <Text>{t("verification_otp.ignore")}</Text>
    </EmailBase>
  )
}
