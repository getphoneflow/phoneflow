export const supportedLocales = ["en", "es"] as const

export type Locale = (typeof supportedLocales)[number]

export const defaultLocale: Locale = "en"

export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) {
    return defaultLocale
  }

  for (const locale of supportedLocales) {
    if (locale === value) {
      return locale
    }
  }

  return defaultLocale
}
