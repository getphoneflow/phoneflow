import i18next from "i18next"

import email from "@workspace/i18n/email"
import { defaultLocale, supportedLocales } from "@workspace/i18n/locales"

const resources = {
  en: { translation: email.en },
  es: { translation: email.es },
}

const i18n = i18next.createInstance()

i18n.init({
  resources,
  fallbackLng: defaultLocale,
  supportedLngs: supportedLocales,
  interpolation: { escapeValue: false },
})

export function t(
  locale: string,
  key: string,
  options?: Record<string, string>
) {
  return i18n.getFixedT(locale)(key, options)
}

export function useTranslation(locale: string) {
  return i18n.getFixedT(locale)
}
