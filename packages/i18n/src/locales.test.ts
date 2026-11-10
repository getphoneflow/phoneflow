import { describe, expect, it } from "vitest"

import { resolveLocale } from "./locales"

describe("resolveLocale", () => {
  it.each([
    ["es", "es"],
    ["en", "en"],
    [undefined, "en"],
    [null, "en"],
    ["", "en"],
    ["fr", "en"],
  ])("resolves %j to %s", (input, expected) => {
    expect(resolveLocale(input)).toBe(expected)
  })
})
