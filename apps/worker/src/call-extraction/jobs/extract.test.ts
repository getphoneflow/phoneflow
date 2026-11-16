import { generateText } from "ai"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api"
import { extract } from "./extract"

vi.mock("@/lib/api", () => import("@/tests/mocks/api"))
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: (spec: unknown) => spec },
}))
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => (modelId: string) => modelId,
}))

const summary = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Summary",
  description: "Summarize the call",
  model: "openai/gpt-5.4-mini",
  schema: { type: "string" as const, choices: ["refund"] },
}

const refund = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Refund",
  description: "Did the caller ask for a refund?",
  model: "openai/gpt-5.4",
  schema: { type: "boolean" as const },
}

const input = {
  callId: "call-1",
  transcript: [
    {
      id: "1",
      role: "user" as const,
      content: "I need a refund",
      createdAt: 0,
    },
  ],
  extractions: [summary, refund],
}

describe("extract", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue(input)
    vi.mocked(api.patch).mockResolvedValue({ id: "call-1" })
    vi.mocked(generateText).mockReset()
  })

  it("writes the extraction run, including null when the model omits the value", async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce({ output: { value: null } } as never)
      .mockResolvedValueOnce({ output: { value: true } } as never)

    await extract({
      callId: "call-1",
      callExtractionIds: [summary.id, refund.id],
    })

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: JSON.stringify(input.transcript),
      })
    )
    expect(api.patch).toHaveBeenCalledTimes(1)
    expect(api.patch).toHaveBeenCalledWith("/calls/call-1/extraction", {
      body: {
        results: [
          expect.objectContaining({
            id: summary.id,
            status: "completed",
            value: null,
          }),
          expect.objectContaining({
            id: refund.id,
            status: "completed",
            value: true,
          }),
        ],
      },
    })
  })

  it("records a failure for one extraction and still writes the other", async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce({ output: { value: "refund" } } as never)
      .mockRejectedValue(new Error("model down"))

    await extract({
      callId: "call-1",
      callExtractionIds: [summary.id, refund.id],
    })

    expect(api.patch).toHaveBeenCalledWith("/calls/call-1/extraction", {
      body: {
        results: [
          expect.objectContaining({
            id: summary.id,
            status: "completed",
            value: "refund",
          }),
          expect.objectContaining({
            id: refund.id,
            status: "failed",
            value: null,
          }),
        ],
      },
    })
  })
})
