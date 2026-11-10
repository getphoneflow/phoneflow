import { describe, expect, it, vi } from "vitest"

import { api } from "./api"

describe("worker API client", () => {
  it("authenticates GET requests with the API token", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json([{ id: 1 }]))

    const body = await api.get("/calls/export/org_1")

    expect(body).toEqual([{ id: 1 }])
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe("https://api.example.com/api/calls/export/org_1")
    const headers = new Headers(init?.headers)
    expect(headers.get("Authorization")).toBe("Bearer test-token")
    expect(init?.body).toBeUndefined()
  })

  it("sends JSON bodies", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ ok: true }))

    await api.post("/things", { body: { name: "x" } })

    const [, init] = fetch.mock.calls[0]
    expect(init?.method).toBe("POST")
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/json"
    )
    expect(init?.body).toBe(JSON.stringify({ name: "x" }))
  })

  it("throws the API's error message on non-2xx responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "Batch call not found" }, { status: 404 })
    )
    await expect(api.get("/batch-calls/x")).rejects.toThrow(
      "Batch call not found"
    )
  })

  it("falls back to the status code when the error has no message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({}, { status: 503 })
    )
    await expect(api.get("/x")).rejects.toThrow("503")
  })
})
