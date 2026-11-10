import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "@workspace/db/client"
import { env } from "@/lib/env"
import { placeOutboundCall } from "@/lib/livekit"
import { batchCallsQueue } from "@/lib/queues"
import { createApi } from "@/tests/api"
import { createAgent, createAgentVersion } from "@/tests/factories/agents"
import {
  createOrganization,
  type TestOrganization,
  type TestUser,
} from "@/tests/factories/auth"
import { setCreditBalance } from "@/tests/factories/credits"
import { createPhoneNumber } from "@/tests/factories/phone-numbers"

const serviceApi = createApi({
  headers: { Authorization: `Bearer ${env.API_TOKEN}` },
})

describe("batch calls", () => {
  let org: TestOrganization
  let admin: TestUser

  beforeEach(async () => {
    org = await createOrganization()
    admin = await org.as("admin")
  })

  const recipients = [
    { toNumber: "+15550000101", variables: { name: "Ada" } },
    { toNumber: "+15550000102" },
  ]

  // Creates a batch through the API with a new agent and number; body overrides any field
  async function createBatchCall(body: Record<string, unknown> = {}) {
    const agent = await createAgent(org.id)
    const phoneNumber = await createPhoneNumber(org.id)
    const res = await admin.api.post("/api/batch-calls", {
      body: {
        name: "Batch",
        agentId: agent.id,
        phoneNumberId: phoneNumber.id,
        recipients,
        ...body,
      },
    })
    return { res }
  }

  it("stores the batch and queues it for immediate processing", async () => {
    const { res } = await createBatchCall({ name: "Reminders" })

    expect(res.status).toBe(200)
    const { id } = res.body
    expect(batchCallsQueue.add).toHaveBeenCalledWith(
      "process-batch-call",
      { batchCallId: id },
      undefined
    )

    const list = (await admin.api.get("/api/batch-calls")).body
    expect(list).toEqual([
      expect.objectContaining({
        id,
        name: "Reminders",
        status: "triggered",
        totalCount: 2,
      }),
    ])
  })

  it("delays scheduled batches until their start time", async () => {
    const scheduledAt = new Date(Date.now() + 60 * 60_000)

    const { res } = await createBatchCall({
      scheduledAt: scheduledAt.toISOString(),
    })

    expect(res.status).toBe(200)
    const delay = vi.mocked(batchCallsQueue.add).mock.calls[0][2]?.delay ?? 0
    expect(delay).toBeGreaterThan(59 * 60_000)
    expect(delay).toBeLessThanOrEqual(60 * 60_000)

    const list = (await admin.api.get("/api/batch-calls")).body
    expect(list[0].status).toBe("scheduled")
  })

  it.each([
    [
      "a schedule in the past",
      { scheduledAt: new Date(Date.now() - 60_000).toISOString() },
      400,
    ],
    ["no recipients", { recipients: [] }, 400],
    ["a non-E.164 recipient", { recipients: [{ toNumber: "12345" }] }, 400],
    ["an unknown agent version", { agentVersionId: crypto.randomUUID() }, 404],
  ])("rejects %s", async (_, overrides, status) => {
    const { res } = await createBatchCall(overrides)

    expect(res.status).toBe(status)
    expect(batchCallsQueue.add).not.toHaveBeenCalled()
  })

  it("requires a number with a SIP trunk", async () => {
    const phoneNumber = await createPhoneNumber(org.id, {
      sipAddress: null,
      sipUsername: null,
      sipPassword: null,
    })

    const { res } = await createBatchCall({ phoneNumberId: phoneNumber.id })

    expect(res.status).toBe(400)
  })

  it("requires credits", async () => {
    await setCreditBalance(org.id, 0)

    const { res } = await createBatchCall()

    expect(res.status).toBe(402)
  })

  describe("POST /api/batch-calls/:id/trigger (worker)", () => {
    async function createBatch() {
      const agent = await createAgent(org.id)
      const version = await createAgentVersion(agent.id)
      const phoneNumber = await createPhoneNumber(org.id)
      const { res } = await createBatchCall({
        agentId: agent.id,
        agentVersionId: version.id,
        phoneNumberId: phoneNumber.id,
        scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      })
      return { id: res.body.id as string, agent, version, phoneNumber }
    }

    it("dials every recipient with their variables", async () => {
      const { id, agent, version, phoneNumber } = await createBatch()

      const res = await serviceApi.post(`/api/batch-calls/${id}/trigger`)

      expect(res.status).toBe(200)
      expect(placeOutboundCall).toHaveBeenCalledTimes(2)
      expect(placeOutboundCall).toHaveBeenCalledWith({
        agentId: agent.id,
        agentVersionId: version.id,
        toNumber: "+15550000101",
        fromNumber: phoneNumber.number,
        sipAddress: phoneNumber.sipAddress,
        sipUsername: phoneNumber.sipUsername,
        sipPassword: phoneNumber.sipPassword,
        variables: { name: "Ada" },
        batchCallId: id,
      })
      expect(placeOutboundCall).toHaveBeenCalledWith(
        expect.objectContaining({ toNumber: "+15550000102", variables: {} })
      )

      const batch = await db.query.batchCallsTable.findFirst({ where: { id } })
      expect(batch?.status).toBe("triggered")
    })

    it("keeps dialing the rest when one recipient fails", async () => {
      const { id } = await createBatch()
      vi.mocked(placeOutboundCall).mockRejectedValueOnce(
        new Error("busy trunk")
      )

      const res = await serviceApi.post(`/api/batch-calls/${id}/trigger`)

      expect(res.status).toBe(200)
      expect(placeOutboundCall).toHaveBeenCalledTimes(2)
    })

    it("does not dial when the organization ran out of credits meanwhile", async () => {
      const { id } = await createBatch()
      await setCreditBalance(org.id, 0)

      const res = await serviceApi.post(`/api/batch-calls/${id}/trigger`)

      expect(res.status).toBe(402)
      expect(placeOutboundCall).not.toHaveBeenCalled()
    })

    it("returns 404 for unknown batches", async () => {
      const res = await serviceApi.post(
        `/api/batch-calls/${crypto.randomUUID()}/trigger`
      )
      expect(res.status).toBe(404)
    })
  })
})
