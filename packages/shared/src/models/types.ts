import type { AgentConfig } from "@workspace/shared/api/agent-config/types"

export type ModelKind = "stt" | "llm" | "tts"

export type SttField = Exclude<keyof AgentConfig["stt"], "model">
export type LlmField = Exclude<keyof AgentConfig["llm"], "model">
export type TtsField = Exclude<keyof AgentConfig["tts"], "model" | "voice">

export type CatalogModel<Field extends string> = {
  name: string
  languages?: readonly string[]
  usdPerMinute: number
  latencyMs: number
  turnTaking?: boolean
  fields?: readonly Field[]
}

export type CatalogProvider<Field extends string> = {
  name: string
  turnTaking?: boolean
  fields: readonly Field[]
  models: Record<string, CatalogModel<Field>>
}

export type ModelsCatalog = {
  stt: Record<string, CatalogProvider<SttField>>
  llm: Record<string, CatalogProvider<LlmField>>
  tts: Record<string, CatalogProvider<TtsField>>
}
