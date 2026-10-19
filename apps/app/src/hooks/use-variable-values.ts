import { useMemo, useState } from "react"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import type { CallVariableValues } from "@workspace/shared/api/calls/types"

const VARIABLE_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/g

const SYSTEM_VARIABLES = new Set(["date", "time", "phone_number"])

function extractKeys(text: string, keys: Set<string>) {
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const key = match[1]
    if (key && !SYSTEM_VARIABLES.has(key)) {
      keys.add(key)
    }
  }
}

function collectVariableKeys(config: AgentConfig) {
  const keys = new Set<string>()

  extractKeys(config.globalPrompt, keys)

  for (const node of config.nodes) {
    if (node.type === "conversation") {
      extractKeys(node.data.instructions.text, keys)
    }
  }

  for (const tool of config.tools) {
    if (tool.type === "webhook") {
      const known = new Set(keys)
      extractKeys(tool.description, keys)
      for (const parameter of tool.parameters) {
        extractKeys(parameter.description, keys)
      }
      extractKeys(tool.url, keys)
      for (const header of tool.headers) {
        extractKeys(header.key, keys)
        extractKeys(header.value, keys)
      }
      for (const parameter of tool.queryParameters) {
        extractKeys(parameter.key, keys)
        extractKeys(parameter.value, keys)
      }
      extractKeys(tool.body, keys)
      for (const parameter of tool.parameters) {
        if (!known.has(parameter.name)) {
          keys.delete(parameter.name)
        }
      }
    }
  }

  for (const edge of config.edges) {
    const condition = edge.data.condition
    if (condition.type === "prompt") {
      extractKeys(condition.prompt, keys)
    } else if (condition.type === "expression") {
      for (const entry of condition.conditions) {
        if (!SYSTEM_VARIABLES.has(entry.variable)) {
          keys.add(entry.variable)
        }
      }
    }
  }

  return [...keys].sort()
}

export type VariableValues = {
  keys: string[]
  values: CallVariableValues
  setValue: (key: string, value: string) => void
  reset: () => void
  toRecord: () => CallVariableValues | undefined
}

export function useVariableValues(
  config: AgentConfig | undefined
): VariableValues {
  const [values, setValues] = useState<CallVariableValues>({})

  const keys = useMemo(
    () => (config ? collectVariableKeys(config) : []),
    [config]
  )

  return {
    keys,
    values,
    setValue: (key, value) =>
      setValues((current) => ({ ...current, [key]: value })),
    reset: () => setValues({}),
    toRecord: () => {
      const entries = keys
        .filter((key) => (values[key] ?? "").length > 0)
        .map((key) => [key, values[key]] as const)

      return entries.length > 0 ? Object.fromEntries(entries) : undefined
    },
  }
}
