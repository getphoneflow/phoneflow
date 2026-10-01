import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import type { LlmField, SttField, TtsField } from "./types"

export const STT_DEFAULTS: {
  [Key in SttField]: NonNullable<AgentConfig["stt"][Key]>
} = {
  language: "en",
  keyterms: [],
  endpointingMs: 100,
  vadThreshold: 0.5,
  diarize: false,
  eagerEotThreshold: 0.5,
  eotThreshold: 0.7,
  eotTimeoutMs: 3000,
  mipOptOut: false,
  mode: "balanced",
  minTurnSilence: 0,
  maxTurnSilence: 3000,
  endOfTurnConfidenceThreshold: 0.5,
  voiceFocus: "near-field",
  voiceFocusThreshold: 0.5,
  agentContextCarryover: false,
  endpointLatencyAdjustmentLevel: 0,
  languageHintsStrict: false,
  minEndOfTurnSilenceWhenConfident: 200,
  enableVoiceProfile: true,
  voiceProfileTopN: 1,
  smartTurn: 0.5,
  smartTurnTimeout: 3000,
}

export const LLM_DEFAULTS: {
  [Key in LlmField]: NonNullable<AgentConfig["llm"][Key]>
} = {
  temperature: 0,
  maxTokens: 4096,
  toolChoice: "auto",
  reasoningEffort: "none",
}

export const TTS_DEFAULTS: {
  [Key in TtsField]: NonNullable<AgentConfig["tts"][Key]>
} = {
  language: "en",
  mipOptOut: false,
  latencyMode: "balanced",
  speed: 1,
  volume: 0,
  emotion: [],
}
