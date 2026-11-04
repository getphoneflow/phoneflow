import { supportedLocales } from "@workspace/i18n/locales"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useTranslation } from "@/lib/i18n"

type LanguageSelectProps = {
  id?: string
  disabled?: boolean
  className?: string
}

export function LanguageSelect({
  id,
  disabled,
  className,
}: LanguageSelectProps) {
  const { t, i18n } = useTranslation()

  return (
    <Select
      value={i18n.language}
      onValueChange={(value) => {
        if (value) {
          i18n.changeLanguage(value)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue>{t("languages.name")}</SelectValue>
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        align="start"
        className="max-h-72"
      >
        {supportedLocales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {t("languages.name", { lng: locale })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
