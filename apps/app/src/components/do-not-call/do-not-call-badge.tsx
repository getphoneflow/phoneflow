import { Badge } from "@workspace/ui/components/badge"
import { useTranslation } from "@/lib/i18n"

export function DoNotCallBadge() {
  const { t } = useTranslation()

  return (
    <Badge variant="destructive">{t("components.do_not_call.badge")}</Badge>
  )
}
