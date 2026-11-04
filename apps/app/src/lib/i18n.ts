import i18n, { type TFunction } from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next, Trans, useTranslation } from "react-i18next"

import app from "@workspace/i18n/app"
import { defaultLocale, supportedLocales } from "@workspace/i18n/locales"
import shared from "@workspace/i18n/shared"

const resources = {
  en: { translation: { ...shared.en, ...app.en } },
  es: { translation: { ...shared.es, ...app.es } },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLocale,
    supportedLngs: supportedLocales,
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["cookie", "navigator"],
      caches: ["cookie"],
    },
  })

export function t(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options)
}

export type { TFunction }
export { Trans, useTranslation }
export default i18n
