import type { CallVariableValues } from "@workspace/shared/api/calls/types"
import { parseJsonObject } from "@/lib/json"

const VARIABLE_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/g
const SYSTEM_VARIABLES = new Set(["date", "time", "phone_number"])

function parseCallValues(raw: string | undefined) {
  const values: CallVariableValues = {}

  const parsed = parseJsonObject(raw)
  for (const [key, value] of Object.entries(parsed)) {
    if (/^[a-z0-9_]+$/.test(key) && typeof value === "string") {
      values[key] = value
    }
  }

  return values
}

export function createVariables(
  attributes: CallVariableValues,
  timezone: string
) {
  const values = parseCallValues(attributes.variable_values)

  const phoneNumber = attributes["sip.phoneNumber"]
  if (phoneNumber) {
    values.phone_number = phoneNumber
  }

  return {
    replace(text: string) {
      const now = new Date()
      values.date = now.toLocaleDateString("en-US", {
        timeZone: timezone,
        month: "long",
        day: "numeric",
        year: "numeric",
      })
      values.time = now.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })

      return text.replace(VARIABLE_PATTERN, (match, key: string) => {
        const value = values[key]
        return value === undefined ? match : value
      })
    },
    set(key: string, value: string) {
      values[key] = value
    },
    get(key: string) {
      return values[key]
    },
    snapshot() {
      const variables: CallVariableValues = {}
      for (const [key, value] of Object.entries(values)) {
        if (!SYSTEM_VARIABLES.has(key)) {
          variables[key] = value
        }
      }
      return variables
    },
  }
}

export type Variables = ReturnType<typeof createVariables>
