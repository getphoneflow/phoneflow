import { beforeAll, describe, expect, it } from "vitest"

import { db } from "@workspace/db/client"
import { batchCallsTable } from "@workspace/db/schema/batch-calls"
import { createAgent, createAgentVersion } from "@/tests/factories/agents"
import { createOrganization, type TestUser } from "@/tests/factories/auth"
import { createCall } from "@/tests/factories/calls"
import { createContact } from "@/tests/factories/contacts"
import { createPhoneNumber } from "@/tests/factories/phone-numbers"

// An owner of another organization must not see or change this organization's
// data, even knowing its ids
describe("organization isolation", () => {
  let intruder: TestUser
  let victimOwner: TestUser
  let ids: {
    agent: string
    phoneNumber: string
    call: string
    contact: string
    batchCall: string
  }

  beforeAll(async () => {
    const victim = await createOrganization()
    const other = await createOrganization()
    victimOwner = await victim.as("owner")
    intruder = await other.as("owner")

    const agent = await createAgent(victim.id, { name: "Victim agent" })
    await createAgentVersion(agent.id)
    const phoneNumber = await createPhoneNumber(victim.id, {
      agentId: agent.id,
    })
    const contact = await createContact(victim.id)
    const call = await createCall(victim.id, agent.id, {
      contactId: contact.id,
    })
    const batchCallId = crypto.randomUUID()
    await db.insert(batchCallsTable).values({
      id: batchCallId,
      organizationId: victim.id,
      name: "Victim batch",
      phoneNumberId: phoneNumber.id,
      agentId: agent.id,
      status: "triggered",
    })

    // The intruder's org has its own data, so list endpoints are not empty
    const otherAgent = await createAgent(other.id)
    await createCall(other.id, otherAgent.id)

    ids = {
      agent: agent.id,
      phoneNumber: phoneNumber.id,
      call: call.id,
      contact: contact.id,
      batchCall: batchCallId,
    }
  })

  it.each([
    ["GET", "/api/agents/:agent"],
    ["GET", "/api/agents/:agent/config"],
    ["GET", "/api/agents/:agent/versions"],
    ["GET", "/api/agents/:agent/versions/1/config"],
    ["PATCH", "/api/agents/:agent/name"],
    ["PATCH", "/api/agents/:agent/config"],
    ["POST", "/api/agents/:agent/publish"],
    ["POST", "/api/agents/:agent/duplicate"],
    ["DELETE", "/api/agents/:agent"],
    ["PATCH", "/api/phone-numbers/:phoneNumber"],
    ["DELETE", "/api/phone-numbers/:phoneNumber"],
    ["GET", "/api/calls/:call"],
    ["GET", "/api/calls/:call/recording"],
    ["POST", "/api/calls/:call/join"],
    ["POST", "/api/calls/:call/end"],
    ["GET", "/api/contacts/:contact"],
  ])(
    "%s %s returns 404 for another organization's resource",
    async (method, template) => {
      const path = template.replace(
        /:(\w+)/g,
        (_, key: keyof typeof ids) => ids[key]
      )
      const body = template.endsWith("/name")
        ? { name: "Hacked" }
        : template.endsWith("/config") && method === "PATCH"
          ? { config: await victimConfig() }
          : template.includes("phone-numbers") && method === "PATCH"
            ? { sipAddress: "sip.attacker.example.com" }
            : {}

      const res =
        method === "GET"
          ? await intruder.api.get(path)
          : method === "DELETE"
            ? await intruder.api.delete(path)
            : method === "PATCH"
              ? await intruder.api.patch(path, { body: body })
              : await intruder.api.post(path, { body: body })

      expect(res.status).toBe(404)
    }
  )

  it("leaves the victim's data untouched", async () => {
    const agent = await victimOwner.api.get(`/api/agents/${ids.agent}`)
    expect(agent.status).toBe(200)
    expect(agent.body).toMatchObject({ name: "Victim agent" })

    const phoneNumbers = (await victimOwner.api.get("/api/phone-numbers")).body
    expect(phoneNumbers).toHaveLength(1)
    expect(phoneNumbers[0].sipAddress).toBe("sip.example.com")
  })

  it.each([
    ["/api/agents", (body: unknown[]) => body],
    ["/api/phone-numbers", (body: unknown[]) => body],
    ["/api/batch-calls", (body: unknown[]) => body],
    ["/api/calls", (body: { items: unknown[] }) => body.items],
    ["/api/contacts", (body: { items: unknown[] }) => body.items],
  ] as const)(
    "GET %s only lists the caller's organization",
    async (path, items) => {
      const res = await intruder.api.get(path)
      expect(res.status).toBe(200)
      const listed = (items(res.body) as { id: string }[]).map((i) => i.id)
      const leaked = listed.filter((id) => Object.values(ids).includes(id))
      expect(leaked).toEqual([])
    }
  )

  it("cannot use another organization's phone number or agent to place calls", async () => {
    const res = await intruder.api.post("/api/calls/outbound", {
      body: {
        phoneNumberId: ids.phoneNumber,
        agentId: ids.agent,
        toNumber: "+15550000002",
      },
    })
    expect(res.status).toBe(404)

    const batch = await intruder.api.post("/api/batch-calls", {
      body: {
        name: "Batch",
        phoneNumberId: ids.phoneNumber,
        agentId: ids.agent,
        recipients: [{ toNumber: "+15550000002" }],
      },
    })
    expect(batch.status).toBe(404)
  })

  it("cannot attach another organization's agent to its phone number", async () => {
    const res = await intruder.api.post("/api/phone-numbers", {
      body: {
        number: "+15550000003",
        agentId: ids.agent,
      },
    })
    expect(res.status).toBe(404)
  })

  async function victimConfig() {
    return (await victimOwner.api.get(`/api/agents/${ids.agent}/config`)).body
  }
})
