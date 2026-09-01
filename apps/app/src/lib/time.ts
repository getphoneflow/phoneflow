export const TIME_ZONES = Intl.supportedValuesOf("timeZone")

type Instant = string | Date | number

function toDate(value: Instant) {
  return value instanceof Date ? value : new Date(value)
}

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
) {
  return Number(parts.find((part) => part.type === type)?.value)
}

function zonedParts(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
}

function toUtcInstant(wallClockUtc: number, timeZone: string) {
  const offset = (instant: number) => {
    const parts = zonedParts(new Date(instant), timeZone)
    return (
      Date.UTC(
        getPart(parts, "year"),
        getPart(parts, "month") - 1,
        getPart(parts, "day"),
        getPart(parts, "hour"),
        getPart(parts, "minute"),
        getPart(parts, "second")
      ) - instant
    )
  }

  const first = wallClockUtc - offset(wallClockUtc)
  return wallClockUtc - offset(first)
}

export function formatDateTime(value: Instant, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(toDate(value))
}

export function formatDate(value: Instant, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(toDate(value))
}

export function zonedDateTimeToIso(date: Date, time: string, timeZone: string) {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const [hours, minutes, seconds = 0] = time.split(":").map(Number)
  const wallClockUtc = Date.UTC(
    getPart(dateParts, "year"),
    getPart(dateParts, "month") - 1,
    getPart(dateParts, "day"),
    hours,
    minutes,
    seconds
  )

  return new Date(toUtcInstant(wallClockUtc, timeZone)).toISOString()
}

export function zonedDayBounds(date: Date, timeZone: string) {
  return {
    start: zonedDateTimeToIso(date, "00:00:00", timeZone),
    end: zonedDateTimeToIso(date, "23:59:59", timeZone),
  }
}
