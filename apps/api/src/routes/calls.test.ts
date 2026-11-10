import { beforeEach, describe, expect, it } from "vitest"

import { env } from "@/lib/env"
import {
  placeOutboundCall,
  removeCallParticipants,
  startCallRecording,
} from "@/lib/livekit"
import { emailsQueue } from "@/lib/queues"
import { createApi } from "@/tests/api"
import {
  agentConfig,
  createAgent,
  createAgentVersion,
} from "@/tests/factories/agents"
import {
  createOrganization,
  type TestOrganization,
  type TestUser,
} from "@/tests/factories/auth"
import { createCall, getCall } from "@/tests/factories/calls"
import { getContact } from "@/tests/factories/contacts"
import { getCreditBalance, setCreditBalance } from "@/tests/factories/credits"
import {
  createPhoneNumber,
  randomPhoneNumber,
} from "@/tests/factories/phone-numbers"

const serviceApi = createApi({
  headers: { Authorization: `Bearer ${env.API_TOKEN}` },
})

describe("calls (dashboard)", () => {
  let org: TestOrganization
  let member: TestUser

  beforeEach(async () => {
    org = await createOrganization()
    member = await org.as("member")
  })

  describe("GET /api/calls", () => {
    async function seed() {
      const support = await createAgent(org.id, { name: "Support" })
      const sales = await createAgent(org.id, { name: "Sales" })
      const minute = 60_000
      const now = Date.now()
      const calls = [
        await createCall(org.id, support.id, {
          startedAt: new Date(now - 3 * minute),
          status: "completed",
          durationMs: 30_000,
          totalCost: "0.100000",
        }),
        await createCall(org.id, sales.id, {
          startedAt: new Date(now - 2 * minute),
          channel: "phone_call",
          direction: "outbound",
          toNumber: "+15550000201",
          status: "completed",
          durationMs: 120_000,
          totalCost: "0.500000",
        }),
        await createCall(org.id, sales.id, {
          startedAt: new Date(now - 1 * minute),
          status: "in_progress",
          transcript: [{ id: "1", role: "user", content: "Hi", createdAt: 0 }],
        }),
      ]
      return { support, sales, calls }
    }

    async function list(query = "") {
      const res = await member.api.get(`/api/calls${query}`)
      expect(res.status).toBe(200)
      return res.body
    }

    it("lists newest first with the agent name and without transcripts", async () => {
      const { calls } = await seed()
      const body = await list()

      expect(body.total).toBe(3)
      expect(body.items.map((c: { id: string }) => c.id)).toEqual(
        [...calls].reverse().map((c) => c.id)
      )
      expect(body.items[0].agent).toEqual({ name: "Sales" })
      expect(body.items[0]).not.toHaveProperty("transcript")
    })

    it("paginates", async () => {
      for (let i = 0; i < 12; i++) await createCall(org.id, crypto.randomUUID())

      const page2 = await list("?page=2&pageSize=10")
      expect(page2).toMatchObject({ total: 12, page: 2, pageSize: 10 })
      expect(page2.items).toHaveLength(2)

      expect((await member.api.get("/api/calls?pageSize=7")).status).toBe(400)
    })

    it("filters by agent, status, channel, direction and number", async () => {
      const { support, sales, calls } = await seed()

      expect((await list(`?agentIds=${support.id}`)).total).toBe(1)
      expect((await list(`?agentIds=${support.id},${sales.id}`)).total).toBe(3)
      expect((await list("?status=in_progress")).items[0].id).toBe(calls[2].id)
      expect((await list("?channel=phone_call")).total).toBe(1)
      expect((await list("?direction=outbound")).total).toBe(1)
      expect((await list("?toNumbers=%2B15550000201")).items[0].id).toBe(
        calls[1].id
      )
    })

    it("filters and sorts by cost and duration", async () => {
      const { calls } = await seed()

      expect(
        (await list("?costOp=gte&cost=0.2")).items.map(
          (c: { id: string }) => c.id
        )
      ).toEqual([calls[1].id])
      expect((await list("?costOp=between&cost=0.6&costMax=0.05")).total).toBe(
        2
      )
      expect(
        (await list("?durationOp=lte&duration=60")).items.map(
          (c: { id: string }) => c.id
        )
      ).toEqual([calls[0].id])

      const byDuration = await list(
        "?sortBy=duration&sortDir=desc&status=completed"
      )
      expect(byDuration.items.map((c: { id: string }) => c.id)).toEqual([
        calls[1].id,
        calls[0].id,
      ])
    })

    it("filters by start date range", async () => {
      const { calls } = await seed()
      const from = new Date(calls[1].startedAt.getTime() - 1000).toISOString()

      const body = await list(`?startedAtFrom=${encodeURIComponent(from)}`)
      expect(body.total).toBe(2)
    })
  })

  it("returns a call with its transcript", async () => {
    const agent = await createAgent(org.id, { name: "Support" })
    const version = await createAgentVersion(agent.id, { number: 3 })
    const transcript = [
      { id: "1", role: "user" as const, content: "Hello", createdAt: 0 },
    ]
    const call = await createCall(org.id, agent.id, {
      agentVersionId: version.id,
      transcript,
    })

    const body = (await member.api.get(`/api/calls/${call.id}`)).body

    expect(body).toMatchObject({
      id: call.id,
      transcript,
      agent: { name: "Support" },
      agentVersion: { number: 3 },
    })
  })

  it("lets members listen to an ongoing call with a subscribe-only token", async () => {
    const call = await createCall(org.id, crypto.randomUUID(), {
      livekitRoomName: "room-live",
    })

    const res = await member.api.post(`/api/calls/${call.id}/join`)

    expect(res.status).toBe(201)
    const { participant_token } = res.body
    const claims = JSON.parse(
      Buffer.from(participant_token.split(".")[1], "base64url").toString()
    )
    expect(claims.video).toMatchObject({
      room: "room-live",
      roomJoin: true,
      canSubscribe: true,
      canPublish: false,
      canPublishData: false,
    })
  })

  it("only allows joining or ending calls that are in progress", async () => {
    const call = await createCall(org.id, crypto.randomUUID(), {
      status: "completed",
    })

    expect((await member.api.post(`/api/calls/${call.id}/join`)).status).toBe(
      400
    )
    expect((await member.api.post(`/api/calls/${call.id}/end`)).status).toBe(
      400
    )
    expect(removeCallParticipants).not.toHaveBeenCalled()
  })

  it("ends an ongoing call by removing its participants", async () => {
    const call = await createCall(org.id, crypto.randomUUID(), {
      livekitRoomName: "room-end",
    })

    expect((await member.api.post(`/api/calls/${call.id}/end`)).status).toBe(
      200
    )
    expect(removeCallParticipants).toHaveBeenCalledWith("room-end")
  })

  describe("POST /api/calls/outbound", () => {
    it("dials out from the organization's number", async () => {
      const admin = await org.as("admin")
      const agent = await createAgent(org.id)
      const phoneNumber = await createPhoneNumber(org.id)

      const res = await admin.api.post("/api/calls/outbound", {
        body: {
          phoneNumberId: phoneNumber.id,
          agentId: agent.id,
          toNumber: "+15550000301",
          variables: { name: "Grace" },
        },
      })

      expect(res.status).toBe(200)
      expect(placeOutboundCall).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: agent.id,
          agentVersionId: null,
          toNumber: "+15550000301",
          fromNumber: phoneNumber.number,
          variables: { name: "Grace" },
          batchCallId: null,
        })
      )
    })

    it("does not dial without credits or a SIP trunk", async () => {
      const admin = await org.as("admin")
      const agent = await createAgent(org.id)
      const noSip = await createPhoneNumber(org.id, { sipAddress: null })
      const withSip = await createPhoneNumber(org.id)

      const missingSip = await admin.api.post("/api/calls/outbound", {
        body: {
          phoneNumberId: noSip.id,
          agentId: agent.id,
          toNumber: "+15550000301",
        },
      })
      expect(missingSip.status).toBe(400)

      await setCreditBalance(org.id, 0)
      const noCredits = await admin.api.post("/api/calls/outbound", {
        body: {
          phoneNumberId: withSip.id,
          agentId: agent.id,
          toNumber: "+15550000301",
        },
      })
      expect(noCredits.status).toBe(402)
      expect(placeOutboundCall).not.toHaveBeenCalled()
    })
  })

  it("emails the call export to the requesting user", async () => {
    const res = await member.api.post("/api/calls/download")

    expect(res.status).toBe(200)
    expect(emailsQueue.add).toHaveBeenCalledWith("send-download-calls", {
      to: member.email,
      organizationId: org.id,
      organizationName: org.name,
      locale: "en",
    })
  })

  it("exports all calls of one organization to the worker", async () => {
    const agent = await createAgent(org.id)
    await createCall(org.id, agent.id)
    await createCall(org.id, agent.id)
    const other = await createOrganization()
    await createCall(other.id, agent.id)

    const res = await serviceApi.get(`/api/calls/export/${org.id}`)

    expect(res.status).toBe(200)
    const calls = res.body
    expect(calls).toHaveLength(2)
    expect(
      calls.every(
        (c: { organizationId: string }) => c.organizationId === org.id
      )
    ).toBe(true)
  })
})

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

const transcript = [
  { id: "1", role: "assistant", content: "Hello!", createdAt: 0 },
  { id: "2", role: "user", content: "Hi", createdAt: 1000 },
]

// The requests the voice agent sends, with defaults for the fields a test doesn't care about
function startWebCall(body: { agentId: string; [key: string]: unknown }) {
  return serviceApi.post("/api/calls/start/web", {
    body: {
      agentVersionId: null,
      livekitRoomName: "room",
      startedAt: minutesAgo(1),
      ...body,
    },
  })
}

function startInboundCall(body: { toNumber: string; [key: string]: unknown }) {
  return serviceApi.post("/api/calls/start/inbound", {
    body: {
      fromNumber: "+15551230000",
      livekitRoomName: "room",
      startedAt: minutesAgo(1),
      ...body,
    },
  })
}

function completeCall(body: { callId: string; [key: string]: unknown }) {
  return serviceApi.post("/api/calls/complete", {
    body: {
      endedAt: new Date().toISOString(),
      status: "completed",
      transcript,
      ...body,
    },
  })
}

describe("voice agent call endpoints", () => {
  let org: TestOrganization

  beforeEach(async () => {
    org = await createOrganization({ creditBalance: 50 })
  })

  describe("POST /api/calls/start/web", () => {
    it("starts a call with the agent's draft config", async () => {
      const config = agentConfig({ globalPrompt: "Draft prompt" })
      const agent = await createAgent(org.id, { config })

      const res = await startWebCall({
        agentId: agent.id,
        livekitRoomName: "room-web",
      })

      expect(res.status).toBe(201)
      const body = res.body
      expect(body.config).toEqual(config)
      expect(body.sip).toBeNull()

      const call = await getCall(body.callId)
      expect(call).toMatchObject({
        organizationId: org.id,
        agentId: agent.id,
        agentVersionId: null,
        channel: "web_call",
        status: "in_progress",
        sttModel: config.stt.model,
        llmModel: config.llm.model,
        ttsModel: config.tts.model,
      })
      expect(startCallRecording).toHaveBeenCalledWith("room-web", body.callId)
    })

    it("uses the published version's config when a version is requested", async () => {
      const agent = await createAgent(org.id, {
        config: agentConfig({ globalPrompt: "Draft prompt" }),
      })
      const version = await createAgentVersion(agent.id, {
        config: agentConfig({ globalPrompt: "Published prompt" }),
      })

      const res = await startWebCall({
        agentId: agent.id,
        agentVersionId: version.id,
      })

      expect(res.status).toBe(201)
      const body = res.body
      expect(body.config.globalPrompt).toBe("Published prompt")
      expect((await getCall(body.callId)).agentVersionId).toBe(version.id)
    })

    it("returns 404 for an unknown agent or a version of another agent", async () => {
      const agent = await createAgent(org.id)
      const otherAgent = await createAgent(org.id)
      const otherVersion = await createAgentVersion(otherAgent.id)

      const unknown = await startWebCall({ agentId: crypto.randomUUID() })
      expect(unknown.status).toBe(404)

      const mismatched = await startWebCall({
        agentId: agent.id,
        agentVersionId: otherVersion.id,
      })
      expect(mismatched.status).toBe(404)
    })

    it("refuses to start a call when the organization has no credits", async () => {
      const agent = await createAgent(org.id)
      await setCreditBalance(org.id, 0)

      const res = await startWebCall({ agentId: agent.id })

      expect(res.status).toBe(402)
      expect(startCallRecording).not.toHaveBeenCalled()
    })

    it("rejects invalid payloads", async () => {
      const res = await serviceApi.post("/api/calls/start/web", {
        body: {
          agentId: "not-a-uuid",
        },
      })
      expect(res.status).toBe(400)
    })
  })

  describe("POST /api/calls/start/inbound", () => {
    it("routes the call to the agent attached to the dialed number", async () => {
      const agent = await createAgent(org.id, {
        config: agentConfig({ globalPrompt: "Inbound agent" }),
      })
      const phoneNumber = await createPhoneNumber(org.id, { agentId: agent.id })

      const res = await startInboundCall({
        toNumber: phoneNumber.number,
        livekitRoomName: "room-inbound",
      })

      expect(res.status).toBe(201)
      const body = res.body
      expect(body.config.globalPrompt).toBe("Inbound agent")
      expect(body.sip).toEqual({
        number: phoneNumber.number,
        address: "sip.example.com",
        username: "sip-user",
        password: "sip-password",
      })

      const call = await getCall(body.callId)
      expect(call).toMatchObject({
        channel: "phone_call",
        direction: "inbound",
        fromNumber: "+15551230000",
        toNumber: phoneNumber.number,
      })
      expect(call.contactId).not.toBeNull()
    })

    it("pins the call to the phone number's agent version", async () => {
      const agent = await createAgent(org.id)
      const version = await createAgentVersion(agent.id, {
        config: agentConfig({ globalPrompt: "v1" }),
      })
      const phoneNumber = await createPhoneNumber(org.id, {
        agentId: agent.id,
        agentVersionId: version.id,
      })

      const res = await startInboundCall({ toNumber: phoneNumber.number })

      expect(res.body.config.globalPrompt).toBe("v1")
    })

    it("returns 404 for unknown numbers and numbers without an agent", async () => {
      const unassigned = await createPhoneNumber(org.id, { agentId: null })

      for (const toNumber of [randomPhoneNumber(), unassigned.number]) {
        const res = await startInboundCall({ toNumber })
        expect(res.status).toBe(404)
      }
    })

    it("reuses the same contact for repeated calls from the same caller", async () => {
      const agent = await createAgent(org.id)
      const phoneNumber = await createPhoneNumber(org.id, { agentId: agent.id })

      async function start() {
        const res = await startInboundCall({
          fromNumber: "+15559990000",
          toNumber: phoneNumber.number,
          startedAt: minutesAgo(2),
        })
        return getCall(res.body.callId)
      }

      const first = await start()
      const second = await start()
      expect(second.contactId).toBe(first.contactId)
    })
  })

  describe("POST /api/calls/start/outbound", () => {
    it("creates an outbound call with the SIP trunk of the calling number", async () => {
      const agent = await createAgent(org.id)
      const phoneNumber = await createPhoneNumber(org.id)

      const res = await serviceApi.post("/api/calls/start/outbound", {
        body: {
          agentId: agent.id,
          agentVersionId: null,
          fromNumber: phoneNumber.number,
          toNumber: "+15554440000",
          livekitRoomName: "room-out",
          startedAt: minutesAgo(1),
          batchCallId: null,
        },
      })

      expect(res.status).toBe(201)
      const body = res.body
      expect(body.sip).toMatchObject({ number: phoneNumber.number })
      expect(await getCall(body.callId)).toMatchObject({
        direction: "outbound",
        toNumber: "+15554440000",
      })
    })
  })

  describe("POST /api/calls/unanswered", () => {
    it("records a free no-answer call and counts it on the contact", async () => {
      const agent = await createAgent(org.id)
      const balance = await getCreditBalance(org.id)

      const res = await serviceApi.post("/api/calls/unanswered", {
        body: {
          agentId: agent.id,
          agentVersionId: null,
          fromNumber: "+15550001111",
          toNumber: "+15550002222",
          livekitRoomName: "room",
          startedAt: minutesAgo(1),
          endedAt: minutesAgo(0),
          batchCallId: null,
        },
      })

      expect(res.status).toBe(201)
      const call = await getCall(res.body.callId)
      expect(call).toMatchObject({
        status: "no_answer",
        durationMs: 0,
        totalCost: "0.000000",
      })
      expect(await getCreditBalance(org.id)).toBe(balance)

      const contact = await getContact(call.contactId)
      expect(contact).toMatchObject({
        phoneNumber: "+15550002222",
        callCount: 1,
      })
    })
  })

  describe("POST /api/calls/complete", () => {
    async function callInProgress(startedAt: string) {
      const agent = await createAgent(org.id)
      const phoneNumber = await createPhoneNumber(org.id, { agentId: agent.id })
      const res = await startInboundCall({
        fromNumber: "+15557770000",
        toNumber: phoneNumber.number,
        startedAt,
      })
      return res.body.callId as string
    }

    it("stores the outcome, bills the call and updates the contact", async () => {
      const startedAt = minutesAgo(3)
      const callId = await callInProgress(startedAt)
      const endedAt = new Date(
        new Date(startedAt).getTime() + 120_000
      ).toISOString()

      const res = await completeCall({
        callId,
        endedAt,
        variables: { name: "Ada" },
      })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ id: callId, durationMs: 120_000 })

      const call = await getCall(callId)
      expect(call).toMatchObject({
        status: "completed",
        durationMs: 120_000,
        transcript,
        variables: { name: "Ada" },
      })

      const parts = [
        call.sttCost,
        call.llmCost,
        call.ttsCost,
        call.telephonyCost,
        call.platformCost,
      ]
      const total = Number(call.totalCost)
      expect(total).toBeGreaterThan(0)
      expect(parts.reduce((sum, part) => sum + Number(part), 0)).toBeCloseTo(
        total,
        5
      )
      expect(Number(call.telephonyCost)).toBeGreaterThan(0) // phone call

      expect(await getCreditBalance(org.id)).toBeCloseTo(50 - total, 5)

      const contact = await getContact(call.contactId)
      expect(contact).toMatchObject({ callCount: 1, totalDurationMs: 120_000 })
    })

    it("does not charge telephony for web calls", async () => {
      const agent = await createAgent(org.id)
      const started = await startWebCall({ agentId: agent.id })
      const { callId } = started.body

      await completeCall({ callId })

      const call = await getCall(callId)
      expect(Number(call.telephonyCost)).toBe(0)
      expect(Number(call.totalCost)).toBeGreaterThan(0)
    })

    it("can only complete a call once", async () => {
      const callId = await callInProgress(minutesAgo(2))

      expect((await completeCall({ callId })).status).toBe(200)
      const balance = await getCreditBalance(org.id)

      expect((await completeCall({ callId })).status).toBe(409)
      expect(await getCreditBalance(org.id)).toBe(balance)
    })

    it("bills a call exactly once when completions race", async () => {
      const callId = await callInProgress(minutesAgo(10))

      const statuses = (
        await Promise.all([
          completeCall({ callId }),
          completeCall({ callId }),
          completeCall({ callId }),
        ])
      )
        .map((res) => res.status)
        .sort()

      expect(statuses).toEqual([200, 409, 409])
      const call = await getCall(callId)
      expect(await getCreditBalance(org.id)).toBeCloseTo(
        50 - Number(call.totalCost),
        5
      )

      const contact = await getContact(call.contactId)
      expect(contact?.callCount).toBe(1)
    })

    it("rejects an end time before the start time", async () => {
      const callId = await callInProgress(minutesAgo(1))
      const res = await completeCall({ callId, endedAt: minutesAgo(5) })
      expect(res.status).toBe(400)
      expect((await getCall(callId)).status).toBe("in_progress")
    })

    it("returns 404 for unknown calls", async () => {
      const res = await completeCall({ callId: crypto.randomUUID() })
      expect(res.status).toBe(404)
    })

    it("lets credits go negative instead of losing the charge", async () => {
      const callId = await callInProgress(minutesAgo(30))
      await setCreditBalance(org.id, 0.01)

      await completeCall({ callId })

      expect(await getCreditBalance(org.id)).toBeLessThan(0)
    })
  })
})
