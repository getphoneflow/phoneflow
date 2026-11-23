import { z } from "zod"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import { MODELS } from "@workspace/shared/constants/models"
import { getVoices, pickFirstVoice, splitModelId } from "./helpers"
import type {
  CatalogModel,
  CatalogProvider,
  ModelConfig,
  ModelKind,
  Parameter,
  ParameterKey,
} from "./types"

export type ModelParameters<Kind extends ModelKind> = {
  parameters: Partial<Record<ParameterKey<Kind>, Parameter>>
  turnTaking: boolean
}

function findCatalogEntry(kind: ModelKind, modelId: string) {
  const { providerId, modelKey } = splitModelId(modelId)
  const providers = MODELS[kind] as Record<string, CatalogProvider>
  const provider = providers[providerId]
  const model = provider?.models[modelKey]
  if (!provider || !model) return undefined
  return { provider, model }
}

function getLanguages(
  kind: ModelKind,
  modelId: string,
  model: CatalogModel,
  voiceId: string | undefined
): readonly string[] {
  const modelLanguages = model.languages ?? []
  if (kind !== "tts") return modelLanguages

  const voices = getVoices(modelId)
  const voice = voices.find((voice) => voice.id === voiceId)
  if (voice && voice.languages.length > 0) return voice.languages

  const languages = new Set(modelLanguages)
  for (const voice of voices) {
    for (const language of voice.languages) {
      languages.add(language)
    }
  }
  return [...languages]
}

function pickDefaultLanguage(languages: readonly string[], preferred: string) {
  if (languages.includes(preferred)) return preferred

  const firstSpecific = languages.find((language) => language !== "multi")
  if (firstSpecific) return firstSpecific

  return languages[0] ?? preferred
}

export function getModelParameters<Kind extends ModelKind>(
  kind: Kind,
  modelId: string,
  voiceId?: string
): ModelParameters<Kind> | undefined {
  const entry = findCatalogEntry(kind, modelId)
  if (!entry) return undefined
  const { provider, model } = entry

  const parameters: Record<string, Parameter> = {}
  for (const [key, parameter] of Object.entries(provider.parameters)) {
    if (parameter) {
      parameters[key] = parameter
    }
  }
  for (const [key, parameter] of Object.entries(model.parameters ?? {})) {
    if (parameter === null) {
      delete parameters[key]
    } else if (parameter) {
      parameters[key] = parameter
    }
  }

  const language = parameters.language
  const languages = getLanguages(kind, modelId, model, voiceId)
  if (language?.type === "enum" && languages.length > 0) {
    parameters.language = {
      type: "enum",
      options: languages,
      default: pickDefaultLanguage(languages, language.default),
    }
  }

  return {
    parameters: parameters as ModelParameters<Kind>["parameters"],
    turnTaking: model.turnTaking ?? provider.turnTaking ?? false,
  }
}

function listParameters(
  parameters: Partial<Record<string, Parameter>>
): [string, Parameter][] {
  const list: [string, Parameter][] = []
  for (const [key, parameter] of Object.entries(parameters)) {
    if (parameter) {
      list.push([key, parameter])
    }
  }
  return list
}

export function parameterSchema(parameter: Parameter): z.ZodType {
  switch (parameter.type) {
    case "enum":
      return z.enum(parameter.options ?? [])
    case "boolean":
      return z.boolean()
    case "strings":
      return z.array(z.string().trim().min(1))
    case "number":
    case "integer": {
      let schema = z.number()
      if (parameter.type === "integer") {
        schema = schema.int()
      }
      if (parameter.min !== undefined) {
        schema = schema.min(parameter.min)
      }
      if (parameter.max !== undefined) {
        schema = schema.max(parameter.max)
      }
      return schema
    }
  }
}

export function isValidParameter(parameter: Parameter, value: unknown) {
  return parameterSchema(parameter).safeParse(value).success
}

function selectionSchema(
  kind: ModelKind,
  modelId: string,
  voiceId: string | undefined
) {
  const modelParameters = getModelParameters(kind, modelId, voiceId)
  if (!modelParameters) return undefined

  const shape: Record<string, z.ZodType> = { model: z.literal(modelId) }
  if (kind === "tts") {
    const voiceRequired = "schemas.agent_config.tts_config.voice.required"
    shape.voice = z.string(voiceRequired).trim().min(1, voiceRequired)
  }
  for (const [key, parameter] of listParameters(modelParameters.parameters)) {
    shape[key] = parameterSchema(parameter)
  }

  return z.strictObject(shape)
}

export function modelConfigSchema<Kind extends ModelKind>(kind: Kind) {
  const modelRequired = `schemas.agent_config.${kind}_config.model.required`

  const schema = z
    .looseObject({ model: z.string(modelRequired) })
    .transform((section, ctx) => {
      const voiceId =
        typeof section.voice === "string" ? section.voice : undefined
      const sectionSchema = selectionSchema(kind, section.model, voiceId)
      if (!sectionSchema) {
        ctx.addIssue({
          code: "custom",
          path: ["model"],
          message: modelRequired,
        })
        return z.NEVER
      }

      const result = sectionSchema.safeParse(section)
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            code: "custom",
            path: issue.path,
            message: issue.message,
          })
        }
        return z.NEVER
      }

      return result.data
    })

  return schema as unknown as z.ZodType<ModelConfig[Kind], ModelConfig[Kind]>
}

function buildModelConfig<Kind extends ModelKind>(
  kind: Kind,
  modelId: string,
  current: Record<string, unknown>
) {
  const voiceId = typeof current.voice === "string" ? current.voice : undefined
  const config: Record<string, unknown> = { model: modelId }
  if (kind === "tts") {
    config.voice = voiceId
  }

  const parameters =
    getModelParameters(kind, modelId, voiceId)?.parameters ?? {}
  for (const [key, parameter] of listParameters(parameters)) {
    const value = current[key]
    if (isValidParameter(parameter, value)) {
      config[key] = value
    } else {
      config[key] = parameter.default
    }
  }

  return config as ModelConfig[Kind]
}

export function withSttModel<T extends AgentConfig>(
  config: T,
  model: string
): T {
  let turnDetection = config.turnHandling.turnDetection
  const turnTaking = getModelParameters("stt", model)?.turnTaking ?? false
  if (turnDetection === "stt" && !turnTaking) {
    turnDetection = "vad"
  }

  return {
    ...config,
    stt: buildModelConfig("stt", model, config.stt),
    turnHandling: { ...config.turnHandling, turnDetection },
  }
}

export function withLlmModel<T extends AgentConfig>(
  config: T,
  model: string
): T {
  return {
    ...config,
    llm: buildModelConfig("llm", model, config.llm),
  }
}

export function withTtsModel<T extends AgentConfig>(
  config: T,
  model: string
): T {
  const voice = pickFirstVoice(model, config.tts.voice) ?? config.tts.voice
  return {
    ...config,
    tts: buildModelConfig("tts", model, { ...config.tts, voice }),
  }
}

export function withTtsVoice<T extends AgentConfig>(
  config: T,
  voice: string
): T {
  const model = config.tts.model
  const nextVoice = pickFirstVoice(model, voice) ?? voice
  return {
    ...config,
    tts: buildModelConfig("tts", model, { ...config.tts, voice: nextVoice }),
  }
}
