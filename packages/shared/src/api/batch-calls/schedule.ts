export const DEFAULT_MAX_CONCURRENT_CALLS = 5
export const MAX_CONCURRENT_CALLS_LIMIT = 50

type WindowSchedule = {
  timezone: string
  days: number[]
  startTime: string
  endTime: string
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function localDayAndMinutes(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ""

  return {
    day: WEEKDAYS.indexOf(part("weekday")),
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  }
}

// Wall-clock comparison, so DST needs no offset arithmetic: a window keeps its
// local hours across a change. `days` names the day a window opens on, so Friday
// 22:00-02:00 still covers Saturday 01:00 without Saturday being listed.
export function isWithinBatchSchedule(schedule: WindowSchedule, now: Date) {
  const { day, minutes } = localDayAndMinutes(now, schedule.timezone)
  const start = toMinutes(schedule.startTime)
  const end = toMinutes(schedule.endTime)

  if (start < end) {
    return schedule.days.includes(day) && minutes >= start && minutes < end
  }

  if (minutes >= start) {
    return schedule.days.includes(day)
  }

  return minutes < end && schedule.days.includes((day + 6) % 7)
}
