import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "@workspace/db/client"
import { deprovisionInbound, provisionInbound } from "@/lib/livekit"
import { createAgent } from "@/tests/factories/agents"
import {
  createOrganization,
  type TestOrganization,
  type TestUser,
} from "@/tests/factories/auth"
import {
  createPhoneNumber,
  randomPhoneNumber,
} from "@/tests/factories/phone-numbers"

describe("phone numbers", () => {
  let org: TestOrganization
  let admin: TestUser

  beforeEach(async () => {
    org = await createOrganization()
    admin = await org.as("admin")
  })

  const sip = {
    sipAddress: "sip.carrier.example.com",
    sipUsername: "trunk-user",
    sipPassword: "trunk-pass",
  }

  it("creates a number, assigns an agent and provisions inbound SIP", async () => {
    const agent = await createAgent(org.id)
    const number = randomPhoneNumber()

    const res = await admin.api.post("/api/phone-numbers", {
      body: {
        number,
        agentId: agent.id,
        ...sip,
      },
    })

    expect(res.status).toBe(201)
    const phoneNumber = res.body
    expect(phoneNumber).toMatchObject({ number, agentId: agent.id, ...sip })
    expect(provisionInbound).toHaveBeenCalledWith(
      expect.objectContaining({ number, ...sip })
    )

    const list = (await admin.api.get("/api/phone-numbers")).body
    expect(list).toEqual([
      expect.objectContaining({
        id: phoneNumber.id,
        agent: { name: "Test agent" },
      }),
    ])
  })

  it("does not keep the number if provisioning fails", async () => {
    vi.mocked(provisionInbound).mockRejectedValueOnce(new Error("LiveKit down"))
    const number = randomPhoneNumber()

    const res = await admin.api.post("/api/phone-numbers", {
      body: {
        number,
        ...sip,
      },
    })

    expect(res.status).toBe(502)
    const stored = await db.query.phoneNumbersTable.findFirst({
      where: { number },
    })
    expect(stored).toBeUndefined()
  })

  it("validates the request", async () => {
    const cases = [
      { number: "555-1234" }, // not E.164
      { number: randomPhoneNumber(), sipUsername: "user" }, // username without password
      { number: randomPhoneNumber(), agentVersionId: crypto.randomUUID() }, // version without agent
    ]
    for (const body of cases) {
      const res = await admin.api.post("/api/phone-numbers", { body: body })
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    expect(provisionInbound).not.toHaveBeenCalled()
  })

  it("does not allow the same number twice (numbers are global)", async () => {
    const existing = await createPhoneNumber((await createOrganization()).id)

    const res = await admin.api.post("/api/phone-numbers", {
      body: {
        number: existing.number,
      },
    })

    expect(res.status).toBeGreaterThanOrEqual(400)
    const stored = await db.query.phoneNumbersTable.findMany({
      where: { number: existing.number },
    })
    expect(stored).toHaveLength(1)
    expect(provisionInbound).not.toHaveBeenCalled()
  })

  it("re-provisions SIP when the number or credentials change", async () => {
    const phoneNumber = await createPhoneNumber(org.id)
    const newNumber = randomPhoneNumber()

    const res = await admin.api.patch(`/api/phone-numbers/${phoneNumber.id}`, {
      body: {
        number: newNumber,
      },
    })

    expect(res.status).toBe(200)
    expect(deprovisionInbound).toHaveBeenCalledWith({
      number: phoneNumber.number,
    })
    expect(provisionInbound).toHaveBeenCalledWith(
      expect.objectContaining({ number: newNumber })
    )
  })

  it("does not touch SIP when only the agent changes", async () => {
    const phoneNumber = await createPhoneNumber(org.id)
    const agent = await createAgent(org.id)

    const res = await admin.api.patch(`/api/phone-numbers/${phoneNumber.id}`, {
      body: {
        agentId: agent.id,
      },
    })

    expect(res.body).toMatchObject({ agentId: agent.id })
    expect(deprovisionInbound).not.toHaveBeenCalled()
    expect(provisionInbound).not.toHaveBeenCalled()
  })

  it("deletes a number and releases it in SIP", async () => {
    const phoneNumber = await createPhoneNumber(org.id)

    expect(
      (await admin.api.delete(`/api/phone-numbers/${phoneNumber.id}`)).status
    ).toBe(200)
    expect(deprovisionInbound).toHaveBeenCalledWith({
      number: phoneNumber.number,
    })
    expect(
      (await admin.api.delete(`/api/phone-numbers/${phoneNumber.id}`)).status
    ).toBe(404)
  })
})
