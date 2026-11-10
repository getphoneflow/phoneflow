import { describe, expect, it } from "vitest"

import {
  PLATFORM_USD_PER_MINUTE,
  TELEPHONY_USD_PER_MINUTE,
} from "@workspace/shared/constants/rates"
import { getModels } from "@workspace/shared/models/helpers"
import { computeCallCosts } from "@/lib/call-cost"

const [stt] = getModels("stt")
const [llm] = getModels("llm")
const [tts] = getModels("tts")
const models = { sttModel: stt.id, llmModel: llm.id, ttsModel: tts.id }

describe("computeCallCosts", () => {
  it("charges each component per minute of call", () => {
    const costs = computeCallCosts({
      durationMs: 90_000,
      channel: "phone_call",
      ...models,
    })

    expect(costs.stt).toBeCloseTo(1.5 * stt.usdPerMinute, 10)
    expect(costs.llm).toBeCloseTo(1.5 * llm.usdPerMinute, 10)
    expect(costs.tts).toBeCloseTo(1.5 * tts.usdPerMinute, 10)
    expect(costs.telephony).toBeCloseTo(1.5 * TELEPHONY_USD_PER_MINUTE, 10)
    expect(costs.platform).toBeCloseTo(1.5 * PLATFORM_USD_PER_MINUTE, 10)
    expect(costs.total).toBeCloseTo(
      costs.stt + costs.llm + costs.tts + costs.telephony + costs.platform,
      10
    )
  })

  it("does not charge telephony for web calls", () => {
    const costs = computeCallCosts({
      durationMs: 60_000,
      channel: "web_call",
      ...models,
    })
    expect(costs.telephony).toBe(0)
    expect(costs.total).toBeCloseTo(
      stt.usdPerMinute +
        llm.usdPerMinute +
        tts.usdPerMinute +
        PLATFORM_USD_PER_MINUTE,
      10
    )
  })

  it("bills partial minutes proportionally (no rounding up)", () => {
    const oneSecond = computeCallCosts({
      durationMs: 1_000,
      channel: "phone_call",
      ...models,
    })
    const oneMinute = computeCallCosts({
      durationMs: 60_000,
      channel: "phone_call",
      ...models,
    })
    expect(oneSecond.total).toBeCloseTo(oneMinute.total / 60, 10)
  })

  it("costs nothing for a zero-length call", () => {
    expect(
      computeCallCosts({ durationMs: 0, channel: "phone_call", ...models })
        .total
    ).toBe(0)
  })
})
