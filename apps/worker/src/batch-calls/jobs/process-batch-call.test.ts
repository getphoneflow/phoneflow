import { describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api"
import { processBatchCall } from "./process-batch-call"

vi.mock("@/lib/api", () => import("@/tests/mocks/api"))

describe("processBatchCall", () => {
  it("asks the API to trigger the batch call", async () => {
    const result = await processBatchCall({ batchCallId: "batch_1" })

    expect(result).toEqual({ batchCallId: "batch_1" })
    expect(api.post).toHaveBeenCalledWith("/batch-calls/batch_1/trigger", {})
  })

  it("fails the job when the API refuses, so BullMQ can retry", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error("Insufficient credits"))

    await expect(processBatchCall({ batchCallId: "batch_1" })).rejects.toThrow(
      "Insufficient credits"
    )
  })
})
