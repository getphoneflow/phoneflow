import { zodResolver } from "@hookform/resolvers/zod"

import { t } from "@/lib/i18n"

function translateErrors(errors: object) {
  for (const error of Object.values(errors)) {
    if (!error || typeof error !== "object") continue
    if ("message" in error && typeof error.message === "string") {
      error.message = t(error.message, { defaultValue: error.message })
    } else {
      translateErrors(error)
    }
  }
}

export const zodResolverI18n = function zodResolverI18n(
  ...args: Parameters<typeof zodResolver>
) {
  const resolve = zodResolver(...args)
  return async function resolveI18n(
    ...resolverArgs: Parameters<typeof resolve>
  ) {
    const result = await resolve(...resolverArgs)
    translateErrors(result.errors)
    return result
  }
} as typeof zodResolver
