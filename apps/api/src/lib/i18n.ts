import { createMiddleware } from "hono/factory"
import i18next from "i18next"

import api from "@workspace/i18n/api"
import {
  defaultLocale,
  type Locale,
  resolveLocale,
  supportedLocales,
} from "@workspace/i18n/locales"
import shared from "@workspace/i18n/shared"

const resources = {
  en: { translation: { ...shared.en, ...api.en } },
  es: { translation: { ...shared.es, ...api.es } },
}

const i18n = i18next.createInstance()

i18n.init({
  resources,
  fallbackLng: defaultLocale,
  supportedLngs: supportedLocales,
  interpolation: { escapeValue: false },
})

export function t(
  locale: Locale,
  key: string,
  options?: Record<string, unknown>
) {
  return i18n.getFixedT(locale)(key, options)
}

export const localeMiddleware = createMiddleware(async (c, next) => {
  c.set("locale", resolveLocale(c.req.header("Accept-Language")))
  await next()
})

declare module "hono" {
  interface ContextVariableMap {
    locale: Locale
  }
}

export { type Locale, resolveLocale }
