import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { supportedLocales } from "@workspace/i18n/locales"
import { t } from "@/lib/i18n"

const srcDir = fileURLToPath(new URL("..", import.meta.url))

// Every `t(locale, "some.key")` in the API must resolve, otherwise users see
// the raw key as the error message
const usedKeys = [
  ...new Set(
    readdirSync(srcDir, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
      .flatMap((file) => [
        ...readFileSync(`${srcDir}/${file}`, "utf8").matchAll(
          /\bt\(\s*\w+,\s*"([a-z0-9_.]+)"/g
        ),
      ])
      .map((match) => match[1])
  ),
]

describe("API error messages", () => {
  it("finds the translation keys used by the routes", () => {
    expect(usedKeys.length).toBeGreaterThan(30)
  })

  it.each(supportedLocales)("are all translated in %s", (locale) => {
    const missing = usedKeys.filter((key) => t(locale, key) === key)
    expect(missing).toEqual([])
  })
})
