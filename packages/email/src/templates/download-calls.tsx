/** @jsxRuntime automatic */
import { Body, Html, Text } from "react-email"

import { useTranslation } from "@workspace/email/i18n"

export default function DownloadCallsEmail({ locale }: { locale: string }) {
  const t = useTranslation(locale)

  return (
    <Html>
      <Body>
        <Text>{t("download_calls.body")}</Text>
      </Body>
    </Html>
  )
}
