import { beforeEach, describe, expect, it } from "vitest"

import { env } from "@/lib/env"
import { emailsQueue } from "@/lib/queues"
import { createApi } from "@/tests/api"
import { createAgent } from "@/tests/factories/agents"
import {
  createOrganization,
  type TestOrganization,
  type TestUser,
} from "@/tests/factories/auth"
import { createCall } from "@/tests/factories/calls"
import { createContact } from "@/tests/factories/contacts"

const serviceApi = createApi({
  headers: { Authorization: `Bearer ${env.API_TOKEN}` },
})

describe("contacts", () => {
  let org: TestOrganization
  let member: TestUser

  beforeEach(async () => {
    org = await createOrganization()
    member = await org.as("member")
  })

  async function list(query = "") {
    return (await member.api.get(`/api/contacts${query}`)).body
  }

  it("searches by phone number, name and external id", async () => {
    const ada = await createContact(org.id, {
      phoneNumber: "+15550000401",
      firstName: "Ada",
      lastName: "Lovelace",
    })
    const grace = await createContact(org.id, {
      phoneNumber: "+15550000402",
      externalId: "crm-42",
    })

    expect(
      (await list("?q=lovelace")).items.map((c: { id: string }) => c.id)
    ).toEqual([ada.id])
    expect(
      (await list("?q=crm-42")).items.map((c: { id: string }) => c.id)
    ).toEqual([grace.id])
    expect((await list("?q=555000040")).total).toBe(2)
  })

  it("filters and sorts by call statistics", async () => {
    const frequent = await createContact(org.id, {
      phoneNumber: "+15550000403",
      callCount: 5,
      totalDurationMs: 300_000,
    })
    await createContact(org.id, {
      phoneNumber: "+15550000404",
      callCount: 1,
      totalDurationMs: 10_000,
    })

    expect(
      (await list("?callCountOp=gte&callCount=2")).items.map(
        (c: { id: string }) => c.id
      )
    ).toEqual([frequent.id])
    expect((await list("?sortBy=callCount&sortDir=desc")).items[0].id).toBe(
      frequent.id
    )
    expect((await list("?durationOp=gte&duration=60")).total).toBe(1)
  })

  it("shows a contact with its call history", async () => {
    const ada = await createContact(org.id, { phoneNumber: "+15550000405" })
    const agent = await createAgent(org.id, { name: "Support" })
    const call = await createCall(org.id, agent.id, { contactId: ada.id })
    await createCall(org.id, agent.id) // someone else's call

    const body = (await member.api.get(`/api/contacts/${ada.id}`)).body

    expect(body).toMatchObject({ id: ada.id, phoneNumber: "+15550000405" })
    expect(body.calls).toEqual([
      expect.objectContaining({ id: call.id, agent: { name: "Support" } }),
    ])
    expect(body.calls[0]).not.toHaveProperty("transcript")
  })

  it("emails the contact export to the requesting user", async () => {
    expect((await member.api.post("/api/contacts/download")).status).toBe(200)
    expect(emailsQueue.add).toHaveBeenCalledWith(
      "send-download-contacts",
      expect.objectContaining({ to: member.email, organizationId: org.id })
    )
  })

  it("exports one organization's contacts to the worker", async () => {
    await createContact(org.id, { phoneNumber: "+15550000406" })
    const other = await createOrganization()
    await createContact(other.id, { phoneNumber: "+15550000407" })

    const contacts = (await serviceApi.get(`/api/contacts/export/${org.id}`))
      .body

    expect(contacts.map((c: { phoneNumber: string }) => c.phoneNumber)).toEqual(
      ["+15550000406"]
    )
  })
})
