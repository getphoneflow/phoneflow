export const CALL_EXTRACTION_MODELS = [
  "openai/gpt-5.4-mini",
  "openai/gpt-5.4-nano",
  "openai/gpt-5.4",
  "openai/gpt-5.6-luna",
] as const

export const DEFAULT_CALL_EXTRACTION_MODEL = "openai/gpt-5.4-mini"

export type CallExtractionModel = (typeof CALL_EXTRACTION_MODELS)[number]

export const CALL_EXTRACTION_MODEL_LABELS: Record<CallExtractionModel, string> =
  {
    "openai/gpt-5.4-mini": "GPT-5.4 mini",
    "openai/gpt-5.4-nano": "GPT-5.4 nano",
    "openai/gpt-5.4": "GPT-5.4",
    "openai/gpt-5.6-luna": "GPT-5.6 Luna",
  }
