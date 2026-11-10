import { beforeAll, describe, expect, it } from "vitest"

import i18n from "@/lib/i18n"
import {
  formatDate,
  formatDateTime,
  formatDurationMs,
  zonedDateTimeToIso,
  zonedDayBounds,
} from "@/lib/time"

const NY = "America/New_York"

beforeAll(async () => {
  await i18n.changeLanguage("en")
})

describe("zonedDateTimeToIso", () => {
  it.each([
    [
      "summer (EDT, UTC-4)",
      "2026-06-15T12:00:00Z",
      "09:30",
      NY,
      "2026-06-15T13:30:00.000Z",
    ],
    [
      "winter (EST, UTC-5)",
      "2026-01-15T12:00:00Z",
      "09:30",
      NY,
      "2026-01-15T14:30:00.000Z",
    ],
    [
      "half-hour offset",
      "2026-06-15T12:00:00Z",
      "00:00",
      "Asia/Kolkata",
      "2026-06-14T18:30:00.000Z",
    ],
    ["UTC", "2026-06-15T12:00:00Z", "23:15", "UTC", "2026-06-15T23:15:00.000Z"],
    [
      "with seconds",
      "2026-06-15T12:00:00Z",
      "10:15:30",
      "UTC",
      "2026-06-15T10:15:30.000Z",
    ],
    [
      "east of UTC",
      "2026-06-15T12:00:00Z",
      "12:00",
      "Europe/Madrid",
      "2026-06-15T10:00:00.000Z",
    ],
  ])(
    "converts wall-clock time to UTC: %s",
    (_, date, time, timeZone, expected) => {
      expect(zonedDateTimeToIso(new Date(date), time, timeZone)).toBe(expected)
    }
  )

  it("takes the calendar day as seen in the target time zone", () => {
    // 02:00 UTC on June 15 is still June 14 in New York
    const date = new Date("2026-06-15T02:00:00Z")
    expect(zonedDateTimeToIso(date, "12:00", NY)).toBe(
      "2026-06-14T16:00:00.000Z"
    )
  })

  it("handles times right after the DST switch", () => {
    // 2026-03-08: New York jumps from 02:00 EST to 03:00 EDT
    const day = new Date("2026-03-08T12:00:00Z")
    expect(zonedDateTimeToIso(day, "01:59", NY)).toBe(
      "2026-03-08T06:59:00.000Z"
    )
    expect(zonedDateTimeToIso(day, "03:00", NY)).toBe(
      "2026-03-08T07:00:00.000Z"
    )
  })
})

describe("zonedDayBounds", () => {
  function hours({ start, end }: { start: string; end: string }) {
    return (Date.parse(end) + 1000 - Date.parse(start)) / 3_600_000
  }

  it("covers a regular day", () => {
    const bounds = zonedDayBounds(new Date("2026-06-15T12:00:00Z"), NY)
    expect(bounds).toEqual({
      start: "2026-06-15T04:00:00.000Z",
      end: "2026-06-16T03:59:59.000Z",
    })
    expect(hours(bounds)).toBe(24)
  })

  it("covers the 23-hour spring-forward day", () => {
    const bounds = zonedDayBounds(new Date("2026-03-08T12:00:00Z"), NY)
    expect(bounds).toEqual({
      start: "2026-03-08T05:00:00.000Z",
      end: "2026-03-09T03:59:59.000Z",
    })
    expect(hours(bounds)).toBe(23)
  })

  it("covers the 25-hour fall-back day", () => {
    const bounds = zonedDayBounds(new Date("2026-11-01T12:00:00Z"), NY)
    expect(bounds).toEqual({
      start: "2026-11-01T04:00:00.000Z",
      end: "2026-11-02T04:59:59.000Z",
    })
    expect(hours(bounds)).toBe(25)
  })
})

describe("formatDurationMs", () => {
  it.each([
    [0, "0s"],
    [999, "0s"],
    [59_999, "59s"],
    [60_000, "1m 0s"],
    [125_000, "2m 5s"],
    [3_600_000, "1h 0m 0s"],
    [3_661_000, "1h 1m 1s"],
    [-5_000, "0s"],
  ])("%i ms -> %s", (ms, expected) => {
    expect(formatDurationMs(ms)).toBe(expected)
  })
})

describe("formatDate / formatDateTime", () => {
  const instant = "2026-06-15T02:00:00Z"

  it("formats in the given time zone, not the machine's", () => {
    expect(formatDate(instant, NY)).toBe("Jun 14, 2026")
    expect(formatDate(instant, "Asia/Tokyo")).toBe("Jun 15, 2026")
  })

  it("includes the zoned time", () => {
    const text = formatDateTime(instant, NY).replace(/\s/g, " ")
    expect(text).toContain("Jun 14, 2026")
    expect(text).toContain("10:00 PM")
  })

  it("follows the UI language", async () => {
    await i18n.changeLanguage("es")
    try {
      expect(formatDate(instant, NY)).toMatch(/14 jun 2026/)
    } finally {
      await i18n.changeLanguage("en")
    }
  })
})
