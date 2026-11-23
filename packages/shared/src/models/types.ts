export type ModelKind = "stt" | "llm" | "tts"

export type SttConfig = {
  model: string
  language?: string
  keyterms?: string[]
  endpointingMs?: number
  vadThreshold?: number
  diarize?: boolean
  eagerEotThreshold?: number
  eotThreshold?: number
  eotTimeoutMs?: number
  mipOptOut?: boolean
  mode?: "min_latency" | "balanced" | "max_accuracy"
  minTurnSilence?: number
  maxTurnSilence?: number
  endOfTurnConfidenceThreshold?: number
  voiceFocus?: "near-field" | "far-field"
  voiceFocusThreshold?: number
  agentContextCarryover?: boolean
  endpointLatencyAdjustmentLevel?: number
  languageHintsStrict?: boolean
  minEndOfTurnSilenceWhenConfident?: number
  enableVoiceProfile?: boolean
  voiceProfileTopN?: number
  smartTurn?: number
  smartTurnTimeout?: number
}

export type LlmConfig = {
  model: string
  temperature?: number
  maxTokens?: number
  toolChoice?: "auto" | "none" | "required"
  reasoningEffort?:
    | "none"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | "xhigh"
    | "max"
}

export type TtsConfig = {
  model: string
  voice: string
  language?: string
  mipOptOut?: boolean
  latencyMode?: "normal" | "balanced" | "low"
  speed?: number
  volume?: number
  emotion?: string[]
}

export type ModelConfig = {
  stt: SttConfig
  llm: LlmConfig
  tts: TtsConfig
}

export type ParameterKey<Kind extends ModelKind> = Exclude<
  keyof ModelConfig[Kind],
  "model" | "voice"
>

export type EnumParameter<Value extends string = string> = {
  type: "enum"
  default: Value
  options?: readonly Value[]
}

export type NumberParameter = {
  type: "number" | "integer"
  default: number
  min?: number
  max?: number
  step?: number
}

export type BooleanParameter = {
  type: "boolean"
  default: boolean
}

export type StringsParameter = {
  type: "strings"
  default: readonly string[]
}

export type Parameter =
  | EnumParameter
  | NumberParameter
  | BooleanParameter
  | StringsParameter

export type CatalogParameters<Config> = {
  [Key in Exclude<keyof Config, "model" | "voice">]?:
    | (Config[Key] extends boolean | undefined
        ? BooleanParameter
        : Config[Key] extends number | undefined
          ? NumberParameter
          : Config[Key] extends string[] | undefined
            ? StringsParameter
            : EnumParameter<Exclude<Config[Key], undefined> & string>)
    | null
}

type AnyCatalogParameters = Partial<Record<string, Parameter | null>>

export type CatalogModel<Params = AnyCatalogParameters> = {
  name: string
  languages?: readonly string[]
  usdPerMinute: number
  latencyMs: number
  score: number
  turnTaking?: boolean
  parameters?: Params
}

export type CatalogProvider<Params = AnyCatalogParameters> = {
  name: string
  turnTaking?: boolean
  parameters: Params
  models: Record<string, CatalogModel<Params>>
}

export type ModelsCatalog = {
  stt: Record<string, CatalogProvider<CatalogParameters<SttConfig>>>
  llm: Record<string, CatalogProvider<CatalogParameters<LlmConfig>>>
  tts: Record<string, CatalogProvider<CatalogParameters<TtsConfig>>>
}
