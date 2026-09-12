import { MODELS } from "@workspace/shared/constants/models"
import { VOICES } from "@workspace/shared/constants/voices"
import type { ModelKind } from "./types"

type CatalogModel = {
  name: string
  languages?: readonly string[]
  usdPerMinute: number
  latencyMs: number
}

type CatalogProvider = {
  name: string
  models: Record<string, CatalogModel>
}

export type ModelOption = {
  id: string
  name: string
  providerId: string
  providerName: string
  usdPerMinute: number
  latencyMs: number
}

export type VoiceGender = "male" | "female"

export type Voice = {
  id: string
  name: string
  languages: string[]
  description: string
  gender: VoiceGender
  tags: string[]
}

function splitModelId(modelId: string) {
  const slash = modelId.indexOf("/")
  return {
    providerId: modelId.slice(0, slash),
    modelKey: modelId.slice(slash + 1),
  }
}

function getKindCatalog(kind: ModelKind) {
  return MODELS[kind] as Record<string, CatalogProvider>
}

export function getModelPricePerMinute(kind: ModelKind, modelId: string) {
  const { providerId, modelKey } = splitModelId(modelId)
  return getKindCatalog(kind)[providerId].models[modelKey].usdPerMinute
}

export function formatUsdPerMinute(usdPerMinute: number) {
  return `$${usdPerMinute.toFixed(3)}/min`
}

export function formatLatencyMs(latencyMs: number) {
  return `${Math.round(latencyMs)}ms`
}

export function getModels(kind: ModelKind): ModelOption[] {
  return Object.entries(getKindCatalog(kind)).flatMap(
    ([providerId, provider]) =>
      Object.entries(provider.models).map(([modelKey, model]) => ({
        id: `${providerId}/${modelKey}`,
        name: model.name,
        providerId,
        providerName: provider.name,
        usdPerMinute: model.usdPerMinute,
        latencyMs: model.latencyMs,
      }))
  )
}

const voicesByProvider = VOICES as Record<string, Record<string, Voice[]>>

export function getVoices(modelId: string): Voice[] {
  const { providerId, modelKey } = splitModelId(modelId)
  return voicesByProvider[providerId]?.[modelKey] ?? []
}

export function pickFirstVoice(modelId: string, voiceId?: string) {
  const voices = getVoices(modelId)
  if (voiceId && voices.some((voice) => voice.id === voiceId)) {
    return voiceId
  }

  return voices[0]?.id
}
