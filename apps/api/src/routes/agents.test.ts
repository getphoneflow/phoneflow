import { beforeEach, describe, expect, it } from "vitest"

import { db } from "@workspace/db/client"
import { agentConfig, createAgent } from "@/tests/factories/agents"
import {
  createOrganization,
  type TestOrganization,
  type TestUser,
} from "@/tests/factories/auth"
import { createPhoneNumber } from "@/tests/factories/phone-numbers"

describe("agents", () => {
  let org: TestOrganization
  let admin: TestUser

  beforeEach(async () => {
    org = await createOrganization()
    admin = await org.as("admin")
  })

  it("creates an agent and lists it without its (large) config", async () => {
    const res = await admin.api.post("/api/agents", {
      body: {
        name: "Support agent",
        config: agentConfig(),
      },
    })
    expect(res.status).toBe(201)
    const agent = res.body

    const list = (await admin.api.get("/api/agents")).body
    expect(list).toEqual([
      expect.objectContaining({
        id: agent.id,
        name: "Support agent",
        phoneNumbers: [],
      }),
    ])
    expect(list[0]).not.toHaveProperty("config")
  })

  it("rejects invalid names and invalid flow configs", async () => {
    const empty = await admin.api.post("/api/agents", {
      body: {
        name: "  ",
        config: agentConfig(),
      },
    })
    expect(empty.status).toBe(400)

    const noStartNode = agentConfig()
    noStartNode.nodes = noStartNode.nodes.filter((node) => node.type === "end")
    noStartNode.edges = []
    const invalid = await admin.api.post("/api/agents", {
      body: {
        name: "Agent",
        config: noStartNode,
      },
    })
    expect(invalid.status).toBe(400)
    expect(invalid.body.error).toEqual(expect.any(String))
  })

  it("returns localized validation errors", async () => {
    const res = await admin.api.post("/api/agents", {
      body: {
        name: "",
        config: agentConfig(),
      },
    })
    const english = res.body.error

    const spanish = await admin.api.post("/api/agents", {
      headers: { "Accept-Language": "es" },
      body: { name: "", config: agentConfig() },
    })
    const spanishError = spanish.body.error

    expect(english).not.toMatch(/^schemas\./)
    expect(spanishError).not.toMatch(/^schemas\./)
    expect(spanishError).not.toBe(english)
  })

  it("renames an agent and saves its draft config", async () => {
    const agent = await createAgent(org.id)

    const renamed = await admin.api.patch(`/api/agents/${agent.id}/name`, {
      body: {
        name: "Sales",
      },
    })
    expect(renamed.body).toMatchObject({ id: agent.id, name: "Sales" })

    const config = agentConfig({ globalPrompt: "Be brief" })
    const saved = await admin.api.patch(`/api/agents/${agent.id}/config`, {
      body: {
        config,
      },
    })
    expect(saved.status).toBe(200)

    const loaded = (await admin.api.get(`/api/agents/${agent.id}/config`)).body
    expect(loaded).toEqual(config)
  })

  it("publishes immutable, incrementing versions of the draft", async () => {
    const agent = await createAgent(org.id, {
      config: agentConfig({ globalPrompt: "v1 prompt" }),
    })

    const v1 = await admin.api.post(`/api/agents/${agent.id}/publish`, {
      body: {
        name: "First",
      },
    })
    expect(v1.status).toBe(201)
    expect(v1.body).toMatchObject({ number: 1, name: "First" })

    await admin.api.patch(`/api/agents/${agent.id}/config`, {
      body: {
        config: agentConfig({ globalPrompt: "v2 prompt" }),
      },
    })
    const v2 = await admin.api.post(`/api/agents/${agent.id}/publish`, {
      body: {},
    })
    expect(v2.body).toMatchObject({ number: 2 })

    const versions = (await admin.api.get(`/api/agents/${agent.id}/versions`))
      .body
    expect(versions.map((v: { number: number }) => v.number)).toEqual([2, 1])

    // Editing the draft never changes what was published
    const v1Config = (
      await admin.api.get(`/api/agents/${agent.id}/versions/1/config`)
    ).body
    expect(v1Config.globalPrompt).toBe("v1 prompt")

    const detail = (await admin.api.get(`/api/agents/${agent.id}`)).body
    expect(detail.versions).toHaveLength(2)

    expect(
      (await admin.api.get(`/api/agents/${agent.id}/versions/3/config`)).status
    ).toBe(404)
  })

  it("publishes distinct version numbers when publishing concurrently", async () => {
    const agent = await createAgent(org.id)

    const results = await Promise.all(
      [1, 2, 3].map(() =>
        admin.api.post(`/api/agents/${agent.id}/publish`, { body: {} })
      )
    )
    const created = results.filter((res) => res.status === 201)

    const versions = (await admin.api.get(`/api/agents/${agent.id}/versions`))
      .body
    const numbers = versions.map((v: { number: number }) => v.number)
    expect(new Set(numbers).size).toBe(numbers.length)
    expect(numbers.length).toBe(created.length)
  })

  it("duplicates an agent with its draft config", async () => {
    const config = agentConfig({ globalPrompt: "Original" })
    const agent = await createAgent(org.id, { name: "Original", config })

    const res = await admin.api.post(`/api/agents/${agent.id}/duplicate`)
    expect(res.status).toBe(201)
    const copy = res.body
    expect(copy.name).toBe("Original (copy)")
    expect(copy.id).not.toBe(agent.id)

    expect((await admin.api.get(`/api/agents/${copy.id}/config`)).body).toEqual(
      config
    )
  })

  it("deletes an agent", async () => {
    const agent = await createAgent(org.id)

    expect((await admin.api.delete(`/api/agents/${agent.id}`)).status).toBe(200)
    expect((await admin.api.get(`/api/agents/${agent.id}`)).status).toBe(404)
    expect((await admin.api.delete(`/api/agents/${agent.id}`)).status).toBe(404)
  })

  it("rejects malformed ids with 400", async () => {
    expect((await admin.api.get("/api/agents/not-a-uuid")).status).toBe(400)
  })

  it("lists agents most recently updated first", async () => {
    const org = await createOrganization()
    const owner = await org.as("owner")
    const older = await createAgent(org.id, { name: "Older" })
    await createAgent(org.id, { name: "Newer" })
    await owner.api.patch(`/api/agents/${older.id}/name`, {
      body: {
        name: "Older (edited)",
      },
    })

    const names = (await owner.api.get("/api/agents")).body.map(
      (a: { name: string }) => a.name
    )
    expect(names).toEqual(["Older (edited)", "Newer"])
  })

  it("unassigns the agent's phone numbers when it is deleted", async () => {
    const agent = await createAgent(org.id)
    const phoneNumber = await createPhoneNumber(org.id, { agentId: agent.id })

    await admin.api.delete(`/api/agents/${agent.id}`)

    const stored = await db.query.phoneNumbersTable.findFirst({
      where: { id: phoneNumber.id },
    })
    expect(stored?.agentId).toBeNull()
  })
})
