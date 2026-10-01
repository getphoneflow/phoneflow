import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import { MODELS } from "@workspace/shared/constants/models"
import { LLM_DEFAULTS, STT_DEFAULTS, TTS_DEFAULTS } from "./defaults"
import {
  getModelLanguages,
  getVoices,
  pickFirstVoice,
  splitModelId,
} from "./helpers"
import type { CatalogProvider } from "./types"

function providerFor<Field extends string>(
  providers: Record<string, CatalogProvider<Field>>,
  modelId: string
) {
  const { providerId, modelKey } = splitModelId(modelId)
  const provider = providers[providerId]
  const model = provider?.models[modelKey]
  if (!provider || !model) return undefined

  const fields = new Set(model.fields ?? provider.fields)
  const turnTaking = model.turnTaking ?? provider.turnTaking ?? false
  return { fields, turnTaking }
}

export function getSttCapabilities(modelId: string) {
  return providerFor(MODELS.stt, modelId)
}

export function getLlmCapabilities(modelId: string) {
  return providerFor(MODELS.llm, modelId)
}

export function getTtsCapabilities(modelId: string) {
  return providerFor(MODELS.tts, modelId)
}

function copyDefault<T>(value: T): T {
  if (Array.isArray(value)) return [...value] as T
  return value
}

function selectedFields<Field extends string>(
  current: Partial<Record<Field, unknown>>,
  defaults: Record<Field, unknown>,
  allowed: ReadonlySet<Field>
) {
  const selected: Partial<Record<Field, unknown>> = {}

  for (const field of allowed) {
    const currentValue = current[field]
    if (currentValue === undefined) {
      selected[field] = copyDefault(defaults[field])
      continue
    }
    selected[field] = currentValue
  }

  return selected
}

function languageFor(
  current: string | undefined,
  languages: readonly string[]
) {
  if (current && (languages.length === 0 || languages.includes(current))) {
    return current
  }

  const specific = languages.find((language) => language !== "multi")
  return specific ?? languages[0] ?? "en"
}

function ttsLanguages(model: string, voice: string) {
  const voiceLanguages = getVoices(model).find(
    (entry) => entry.id === voice
  )?.languages
  if (voiceLanguages?.length) return voiceLanguages
  return getModelLanguages("tts", model)
}

export function withSttModel<T extends AgentConfig>(
  config: T,
  model: string
): T {
  const capabilities = getSttCapabilities(model)
  const turnDetection =
    config.turnHandling.turnDetection === "stt" && !capabilities?.turnTaking
      ? "vad"
      : config.turnHandling.turnDetection

  const turnHandling = { ...config.turnHandling, turnDetection }

  if (!capabilities) {
    return { ...config, stt: { model }, turnHandling }
  }

  const stt = {
    model,
    ...selectedFields(config.stt, STT_DEFAULTS, capabilities.fields),
  } as AgentConfig["stt"]

  if (capabilities.fields.has("language")) {
    stt.language = languageFor(
      config.stt.language,
      getModelLanguages("stt", model)
    )
  }

  return { ...config, stt, turnHandling }
}

export function withLlmModel<T extends AgentConfig>(
  config: T,
  model: string
): T {
  const capabilities = getLlmCapabilities(model)
  if (!capabilities) return { ...config, llm: { model } }

  const llm = {
    model,
    ...selectedFields(config.llm, LLM_DEFAULTS, capabilities.fields),
  } as AgentConfig["llm"]

  return { ...config, llm }
}

function ttsFor(
  current: AgentConfig["tts"],
  model: string,
  voice: string
): AgentConfig["tts"] {
  const nextVoice = pickFirstVoice(model, voice) ?? voice
  const capabilities = getTtsCapabilities(model)
  if (!capabilities) return { model, voice: nextVoice }

  const tts = {
    model,
    voice: nextVoice,
    ...selectedFields(current, TTS_DEFAULTS, capabilities.fields),
  } as AgentConfig["tts"]

  if (capabilities.fields.has("language")) {
    tts.language = languageFor(current.language, ttsLanguages(model, nextVoice))
  }

  return tts
}

export function withTtsModel<T extends AgentConfig>(
  config: T,
  model: string
): T {
  return {
    ...config,
    tts: ttsFor(config.tts, model, config.tts.voice),
  }
}

export function withTtsVoice<T extends AgentConfig>(
  config: T,
  voice: string
): T {
  return {
    ...config,
    tts: ttsFor(config.tts, config.tts.model, voice),
  }
}
