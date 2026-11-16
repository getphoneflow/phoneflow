import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_CALL_EXTRACTION_MODEL } from "@workspace/shared/call-extraction/constants"
import { env } from "@/lib/env"
import { callExtractionQueue } from "@/lib/queues"
import { createApi } from "@/tests/api"
import { createAgent, createAgentVersion } from "@/tests/factories/agents"
import {
  createOrganization,
  type TestOrganization,
  type TestUser,
} from "@/tests/factories/auth"
import { createCall, getCall } from "@/tests/factories/calls"

const serviceApi = createApi({
  headers: { Authorization: `Bearer ${env.API_TOKEN}` },
})

const transcript = [
  { id: "1", role: "assistant" as const, content: "Hello!", createdAt: 0 },
  {
    id: "2",
    role: "user" as const,
    content: "I need a refund",
    createdAt: 1000,
  },
]

const summary = {
  name: "Summary",
  description: "Summarize the call in one sentence",
  schema: { type: "string", choices: ["refunded"] },
}

describe("call extractions", () => {
  let org: TestOrganization
  let owner: TestUser

  beforeEach(async () => {
    org = await createOrganization()
    owner = await org.as("owner")
    vi.mocked(callExtractionQueue.add).mockClear()
  })

  async function createExtraction(
    agentIds: string[] = [],
    overrides: Record<string, unknown> = {}
  ) {
    const res = await owner.api.post("/api/call-extractions", {
      body: { ...summary, agentIds, ...overrides },
    })
    expect(res.status).toBe(201)
    return res.body
  }

  it("creates, lists, updates and deletes a call extraction", async () => {
    const agent = await createAgent(org.id, { name: "Support" })
    const created = await createExtraction([agent.id])

    expect(created).toMatchObject({
      name: "Summary",
      model: DEFAULT_CALL_EXTRACTION_MODEL,
      schema: { type: "string", choices: ["refunded"] },
    })

    const listed = await owner.api.get("/api/call-extractions")
    expect(listed.status).toBe(200)
    expect(listed.body).toMatchObject([
      { id: created.id, agents: [{ agentId: agent.id }] },
    ])

    const updated = await owner.api.patch(
      `/api/call-extractions/${created.id}`,
      {
        body: {
          ...summary,
          description: "Write five words",
          agentIds: [],
        },
      }
    )
    expect(updated.status).toBe(200)
    expect(updated.body).toMatchObject({
      description: "Write five words",
    })
    expect((await owner.api.get("/api/call-extractions")).body).toMatchObject([
      { id: created.id, agents: [] },
    ])

    const removed = await owner.api.delete(
      `/api/call-extractions/${created.id}`
    )
    expect(removed.status).toBe(200)
    expect((await owner.api.get("/api/call-extractions")).body).toEqual([])
  })

  it("queues extraction when a call with a transcript finishes", async () => {
    const agent = await createAgent(org.id)
    const extraction = await createExtraction([agent.id])
    const call = await createCall(org.id, agent.id)

    const res = await serviceApi.post("/api/calls/complete", {
      body: {
        callId: call.id,
        endedAt: new Date().toISOString(),
        status: "completed",
        transcript,
      },
    })

    expect(res.status).toBe(200)
    const saved = await getCall(call.id)
    expect(saved.extraction).toMatchObject({
      results: [
        {
          id: extraction.id,
          name: "Summary",
          status: "pending",
          schema: { type: "string", choices: ["refunded"] },
          value: null,
        },
      ],
    })
    expect(callExtractionQueue.add).toHaveBeenCalledWith("extract", {
      callId: call.id,
      callExtractionIds: [extraction.id],
    })
  })

  it("does not queue extraction without a transcript, an attachment, or for no-answer calls", async () => {
    const agent = await createAgent(org.id)
    await createExtraction([agent.id])
    const empty = await createCall(org.id, agent.id)
    const unanswered = await createCall(org.id, agent.id, {
      status: "no_answer",
      endedAt: new Date(),
      durationMs: 0,
    })

    const res = await serviceApi.post("/api/calls/complete", {
      body: {
        callId: empty.id,
        endedAt: new Date().toISOString(),
        status: "completed",
        transcript: [],
      },
    })

    expect(res.status).toBe(200)
    expect((await getCall(empty.id)).extraction).toBeNull()
    expect((await getCall(unanswered.id)).extraction).toBeNull()
    expect(callExtractionQueue.add).not.toHaveBeenCalled()

    const plain = await createAgent(org.id)
    const call = await createCall(org.id, plain.id)
    await serviceApi.post("/api/calls/complete", {
      body: {
        callId: call.id,
        endedAt: new Date().toISOString(),
        status: "completed",
        transcript,
      },
    })
    expect(callExtractionQueue.add).not.toHaveBeenCalled()
  })

  it("reruns with the extraction as it is saved now", async () => {
    const agent = await createAgent(org.id)
    await createAgentVersion(agent.id)
    const extraction = await createExtraction([agent.id])
    const call = await createCall(org.id, agent.id, {
      status: "completed",
      endedAt: new Date(),
      transcript,
      durationMs: 1000,
    })

    const rerun = await owner.api.post(`/api/calls/${call.id}/extraction/rerun`)
    expect(rerun.status).toBe(200)

    await owner.api.patch(`/api/call-extractions/${extraction.id}`, {
      body: {
        ...summary,
        description: "Write five words",
        agentIds: [agent.id],
      },
    })

    const input = await serviceApi.get(
      `/api/calls/${call.id}/extraction?ids=${extraction.id}`
    )
    expect(input.status).toBe(200)
    expect(input.body.extractions[0].description).toBe("Write five words")
    expect(callExtractionQueue.add).toHaveBeenCalledWith("extract", {
      callId: call.id,
      callExtractionIds: [extraction.id],
    })
  })

  it("stores the extraction run sent by the worker", async () => {
    const agent = await createAgent(org.id)
    const first = await createExtraction([agent.id])
    const second = await createExtraction([agent.id], {
      name: "Refund",
      description: "Did the caller ask for a refund?",
      schema: { type: "boolean" },
    })
    const call = await createCall(org.id, agent.id, {
      status: "completed",
      endedAt: new Date(),
      transcript,
      extraction: {
        results: [first, second].map((extraction) => ({
          id: extraction.id,
          name: extraction.name,
          status: "pending" as const,
          model: extraction.model,
          schema: extraction.schema,
          value: null,
        })),
      },
    })

    const extraction = {
      results: [
        {
          id: first.id,
          name: first.name,
          status: "completed" as const,
          model: first.model,
          schema: first.schema,
          value: "Caller wants a refund",
        },
        {
          id: second.id,
          name: second.name,
          status: "failed" as const,
          model: second.model,
          schema: second.schema,
          value: null,
        },
      ],
    }
    const saved = await serviceApi.patch(`/api/calls/${call.id}/extraction`, {
      body: extraction,
    })
    expect(saved.status).toBe(200)
    expect((await getCall(call.id)).extraction).toEqual(extraction)
  })

  it("leaves the stored extraction until the rerun finishes", async () => {
    const agent = await createAgent(org.id)
    const extraction = await createExtraction([agent.id])
    const call = await createCall(org.id, agent.id, {
      status: "completed",
      endedAt: new Date(),
      transcript,
      extraction: {
        results: [
          {
            id: extraction.id,
            name: extraction.name,
            status: "completed",
            model: extraction.model,
            schema: extraction.schema,
            value: "Old summary",
          },
        ],
      },
    })

    const rerun = await owner.api.post(`/api/calls/${call.id}/extraction/rerun`)
    expect(rerun.status).toBe(200)
    expect((await getCall(call.id)).extraction).toEqual(call.extraction)
  })

  it("includes extraction in the call export", async () => {
    const agent = await createAgent(org.id)
    const extraction = {
      results: [
        {
          id: crypto.randomUUID(),
          name: "Summary",
          status: "completed" as const,
          model: DEFAULT_CALL_EXTRACTION_MODEL,
          schema: { type: "string" as const, choices: ["refunded"] },
          value: "A short call",
        },
      ],
    }
    await createCall(org.id, agent.id, {
      status: "completed",
      transcript,
      extraction,
    })

    const res = await serviceApi.get(`/api/calls/export/${org.id}`)
    expect(res.status).toBe(200)
    expect(res.body[0].extraction).toEqual(extraction)
  })

  it("stores a null value when the model omits a field", async () => {
    const agent = await createAgent(org.id)
    const extraction = await createExtraction([agent.id], {
      schema: { type: "boolean" },
    })
    const call = await createCall(org.id, agent.id, {
      status: "completed",
      transcript,
      extraction: {
        results: [
          {
            id: extraction.id,
            name: extraction.name,
            status: "pending",
            model: extraction.model,
            schema: extraction.schema,
            value: null,
          },
        ],
      },
    })

    const body = {
      results: [
        {
          id: extraction.id,
          name: extraction.name,
          status: "completed" as const,
          model: extraction.model,
          schema: extraction.schema,
          value: null,
        },
      ],
    }
    const res = await serviceApi.patch(`/api/calls/${call.id}/extraction`, {
      body,
    })

    expect(res.status).toBe(200)
    expect((await getCall(call.id)).extraction).toEqual(body)
  })
})
