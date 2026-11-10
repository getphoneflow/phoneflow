/// <reference types="node" />

import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const sharedEn = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../../../i18n/locales/shared/en.json", import.meta.url)
    ),
    "utf8"
  )
)

describe("schema error messages", () => {
  // Validation messages are i18n keys shown to users
  it("all exist in the shared translations", () => {
    const apiDir = fileURLToPath(new URL("../api", import.meta.url))
    const sources = readdirSync(apiDir, { recursive: true })
      .filter((file) => String(file).endsWith("schemas.ts"))
      .map((file) => readFileSync(`${apiDir}/${file}`, "utf8"))
    const keys = new Set(
      sources.flatMap((source) =>
        [...source.matchAll(/"(schemas\.[a-z0-9_.]+)"/g)].map((m) => m[1])
      )
    )

    const missing = [...keys].filter((key) => {
      const message = key
        .split(".")
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown>)?.[part],
          sharedEn
        )
      return typeof message !== "string"
    })

    expect(keys.size).toBeGreaterThan(20)
    expect(missing).toEqual([])
  })
})
