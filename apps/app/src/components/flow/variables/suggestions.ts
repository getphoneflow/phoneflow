import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import { useAgentStore } from "@/stores/agent"

const SYSTEM_KEYS = [
  "date",
  "time",
  "timezone",
  "direction",
  "phone_number",
  "agent_number",
] as const

const RESERVED_KEYS = new Set<string>(SYSTEM_KEYS)
const GROUP_LABELS = ["Inputs", "Extracted", "System", "Parameters"] as const

export type VariableSuggestion = {
  key: string
  label: string
  create?: boolean
}

export type VariableSuggestionGroup = {
  label: string
  items: VariableSuggestion[]
}

type VariableConfig = Pick<AgentConfig, "dynamicVariables" | "nodes" | "tools">

function knownVariables(config: VariableConfig) {
  const entries: { key: string; label: string }[] = []

  for (const variable of config.dynamicVariables ?? []) {
    entries.push({ key: variable.key, label: "Inputs" })
  }
  for (const key of SYSTEM_KEYS) {
    entries.push({ key, label: "System" })
  }
  for (const node of config.nodes) {
    if (node.type !== "conversation" || !node.data.extractVariables) {
      continue
    }
    for (const variable of node.data.extractVariables.variables) {
      entries.push({ key: variable.key, label: "Extracted" })
    }
  }
  for (const tool of config.tools) {
    if (tool.type !== "webhook") {
      continue
    }
    for (const variable of tool.responseVariables) {
      entries.push({ key: variable.name, label: "Extracted" })
    }
  }

  return entries
}

export function variableSuggestions(
  config: VariableConfig,
  query: string,
  extraKeys: string[] = []
) {
  const normalized = query.trim()
  const entries = knownVariables(config)
  const known = new Set(entries.map((entry) => entry.key))
  for (const key of extraKeys) {
    known.add(key)
  }

  const matches = (key: string) =>
    normalized.length === 0 || key.startsWith(normalized)
  const seen = new Set<string>()
  const grouped = new Map<string, VariableSuggestion[]>()

  function add(label: string, key: string) {
    if (!key || !matches(key) || seen.has(key)) {
      return
    }
    seen.add(key)
    const items = grouped.get(label) ?? []
    items.push({ key, label: key })
    grouped.set(label, items)
  }

  for (const entry of entries) {
    add(entry.label, entry.key)
  }
  for (const key of extraKeys) {
    add("Parameters", key)
  }

  const groups = GROUP_LABELS.flatMap((label) => {
    const items = grouped.get(label)
    return items ? [{ label, items }] : []
  })

  const createKey =
    /^[a-z0-9_]+$/.test(normalized) &&
    !RESERVED_KEYS.has(normalized) &&
    !known.has(normalized)
      ? normalized
      : undefined

  return { groups, createKey }
}

export function createInputVariable(key: string) {
  const { config, readOnly, setConfig } = useAgentStore.getState()
  if (readOnly || !/^[a-z0-9_]+$/.test(key) || RESERVED_KEYS.has(key)) {
    return
  }
  if (knownVariables(config).some((entry) => entry.key === key)) {
    return
  }

  setConfig({
    ...config,
    dynamicVariables: [...(config.dynamicVariables ?? []), { key }],
  })
}

const MENTION = /\{\{\s*([a-z0-9_]*)$/

export function mentionAt(value: string, caret: number) {
  const match = value.slice(0, caret).match(MENTION)
  if (!match) {
    return null
  }

  return {
    query: match[1] ?? "",
    start: caret - match[0].length,
  }
}

export function replaceMention(
  value: string,
  start: number,
  caret: number,
  key: string
) {
  const close = value.slice(caret).match(/^\s*\}\}/)
  const end = caret + (close?.[0].length ?? 0)
  const token = `{{${key}}}`

  return {
    next: `${value.slice(0, start)}${token}${value.slice(end)}`,
    cursor: start + token.length,
  }
}
