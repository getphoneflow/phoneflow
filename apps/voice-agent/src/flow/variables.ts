import type {
  CallDirection,
  CallVariableValues,
} from "@workspace/shared/api/calls/types"
import { parseJsonObject } from "@/lib/json"

const VARIABLE_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/g
const SYSTEM_VARIABLE_KEYS = new Set([
  "date",
  "time",
  "timezone",
  "direction",
  "phone_number",
  "agent_number",
])

type CreateVariablesInput = {
  timezone: string
  direction?: CallDirection
  fromNumber?: string
  toNumber?: string
  sipPhoneNumber?: string
  trunkPhoneNumber?: string
  variableValues?: string
  defaults?: { key: string; defaultValue?: string }[]
}

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

export function createVariables({
  timezone,
  direction,
  fromNumber,
  toNumber,
  sipPhoneNumber,
  trunkPhoneNumber,
  variableValues,
  defaults = [],
}: CreateVariablesInput) {
  const values = parseCallValues(variableValues)
  const callDirection = direction ?? "web"
  const phoneNumber =
    sipPhoneNumber || (direction === "outbound" ? toNumber : undefined)
  const agentNumber =
    direction === "outbound"
      ? fromNumber
      : direction === "inbound"
        ? trunkPhoneNumber
        : undefined

  for (const variable of defaults) {
    if (
      SYSTEM_VARIABLE_KEYS.has(variable.key) ||
      values[variable.key] !== undefined ||
      variable.defaultValue === undefined
    ) {
      continue
    }
    values[variable.key] = variable.defaultValue
  }

  values.timezone = timezone
  values.direction = callDirection
  if (phoneNumber) {
    values.phone_number = phoneNumber
  }
  if (agentNumber) {
    values.agent_number = agentNumber
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
        if (!SYSTEM_VARIABLE_KEYS.has(key)) {
          variables[key] = value
        }
      }
      return variables
    },
  }
}

export type Variables = ReturnType<typeof createVariables>
