import { describe, expect, it } from "vitest"

import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"
import {
  getModel,
  getModelPricePerMinute,
  getModels,
  getVoices,
} from "@workspace/shared/models/helpers"
import type { ModelKind } from "@workspace/shared/models/types"

const kinds: ModelKind[] = ["stt", "llm", "tts"]

describe("model catalog", () => {
  it.each(kinds)(
    "prices every %s model (calls are billed with these)",
    (kind) => {
      const models = getModels(kind)
      expect(models.length).toBeGreaterThan(0)
      for (const model of models) {
        expect(model.usdPerMinute, model.id).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(model.usdPerMinute), model.id).toBe(true)
        expect(getModelPricePerMinute(kind, model.id)).toBe(model.usdPerMinute)
        expect(getModel(kind, model.id)?.id).toBe(model.id)
      }
    }
  )

  it("only uses catalog models in the default agent template", () => {
    const config = createDefaultAgentConfig()
    expect(getModel("stt", config.stt.model)).toBeDefined()
    expect(getModel("llm", config.llm.model)).toBeDefined()
    expect(getModel("tts", config.tts.model)).toBeDefined()
  })

  it("every TTS model with voices has unique voice ids", () => {
    for (const model of getModels("tts")) {
      const ids = getVoices(model.id).map((voice) => voice.id)
      expect(new Set(ids).size, model.id).toBe(ids.length)
    }
  })
})
