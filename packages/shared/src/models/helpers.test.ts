import { describe, expect, it } from "vitest"

import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"
import {
  getVoices,
  pickFirstVoice,
  splitModelId,
} from "@workspace/shared/models/helpers"

describe("model helpers", () => {
  it("splits provider and model key on the first slash only", () => {
    expect(splitModelId("openai/gpt-4o")).toEqual({
      providerId: "openai",
      modelKey: "gpt-4o",
    })
    expect(splitModelId("meta/llama/3.1")).toEqual({
      providerId: "meta",
      modelKey: "llama/3.1",
    })
  })

  describe("pickFirstVoice", () => {
    const model = createDefaultAgentConfig().tts.model
    const voices = getVoices(model)

    it("keeps the current voice if the model offers it", () => {
      expect(pickFirstVoice(model, voices[1]?.id)).toBe(voices[1]?.id)
    })

    it("falls back to the model's first voice otherwise", () => {
      expect(pickFirstVoice(model, "not-a-voice")).toBe(voices[0]?.id)
      expect(pickFirstVoice(model)).toBe(voices[0]?.id)
    })

    it("returns undefined for models without voices", () => {
      expect(pickFirstVoice("nope/model")).toBeUndefined()
    })
  })
})
