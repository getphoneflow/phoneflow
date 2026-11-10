import { describe, expect, it } from "vitest"

import api from "../api"
import app from "../app"
import email from "../email"
import { defaultLocale, supportedLocales } from "../locales"
import shared from "../shared"

type Messages = { [key: string]: string | Messages }

function flattenKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}${key}`]
      : flattenKeys(value, `${prefix}${key}.`)
  )
}

function interpolations(message: string) {
  return [...message.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort()
}

function messageAt(messages: Messages, key: string) {
  return key
    .split(".")
    .reduce<string | Messages>(
      (node, part) => (node as Messages)[part],
      messages
    ) as string
}

describe.each([
  ["api", api],
  ["app", app],
  ["email", email],
  ["shared", shared],
] as const)("%s translations", (_, bundle) => {
  const reference = bundle[defaultLocale] as Messages
  const referenceKeys = flattenKeys(reference).sort()

  it.each(supportedLocales.filter((l) => l !== defaultLocale))(
    "%s has exactly the same keys as English",
    (locale) => {
      expect(flattenKeys(bundle[locale] as Messages).sort()).toEqual(
        referenceKeys
      )
    }
  )

  it.each(supportedLocales.filter((l) => l !== defaultLocale))(
    "%s keeps the same {{placeholders}} as English",
    (locale) => {
      const translated = bundle[locale] as Messages
      const mismatches = referenceKeys.filter(
        (key) =>
          interpolations(messageAt(reference, key)).join() !==
          interpolations(messageAt(translated, key) ?? "").join()
      )
      expect(mismatches).toEqual([])
    }
  )

  it("has no empty messages", () => {
    for (const locale of supportedLocales) {
      const messages = bundle[locale] as Messages
      const empty = flattenKeys(messages).filter(
        (key) => !messageAt(messages, key).trim()
      )
      expect(empty, locale).toEqual([])
    }
  })
})
