import { beforeEach, describe, expect, it } from "vitest"

import { apiKeyExpirationSeconds } from "@workspace/shared/api/api-keys/schemas"
import { createApi } from "@/tests/api"
import {
  authTest,
  createOrganization,
  type TestOrganization,
  type TestUser,
} from "@/tests/factories/auth"

const readPermissions = { agent: ["read"] }

describe("api keys", () => {
  let org: TestOrganization
  let owner: TestUser

  beforeEach(async () => {
    org = await createOrganization()
    owner = await org.as("owner")
  })

  async function createKey(
    user: TestUser,
    permissions: Record<string, string[]> = readPermissions,
    name = "Production"
  ) {
    return user.api.post("/api/api-keys", {
      body: { name, permissions },
    })
  }

  it("returns the secret once and omits it from the list", async () => {
    const created = await createKey(owner)
    expect(created.status).toBe(201)
    expect(created.body.key).toMatch(/^pf_/)
    expect(created.body.start).toBe(created.body.key.slice(0, 12))
    expect(created.body.permissions).toEqual(readPermissions)

    const list = await owner.api.get("/api/api-keys")
    expect(list.status).toBe(200)
    expect(list.body.apiKeys).toEqual([
      expect.objectContaining({
        id: created.body.id,
        name: "Production",
        start: created.body.start,
        permissions: readPermissions,
      }),
    ])
    expect(list.body.apiKeys[0]).not.toHaveProperty("key")
  })

  it("lets a key manager grant any API permission", async () => {
    const test = await authTest()
    const role = await owner.api.post("/api/auth/organization/create-role", {
      body: {
        role: "integrator",
        permission: {
          apiKey: ["create", "read", "update", "delete"],
          agent: ["read"],
        },
        additionalFields: { displayName: "Integrator" },
      },
    })
    expect(role.status).toBe(200)

    const user = await test.saveUser(test.createUser())
    await test.addMember?.({
      userId: user.id,
      organizationId: org.id,
      role: "integrator",
    })
    const headers = await test.getAuthHeaders({
      userId: user.id,
      session: { activeOrganizationId: org.id },
    })
    const integrator = createApi({ headers })

    const granted = await integrator.post("/api/api-keys", {
      body: { name: "Agents", permissions: { agent: ["create"] } },
    })
    expect(granted.status).toBe(201)

    const raw = await integrator.post("/api/auth/api-key/create", {
      body: {
        name: "Raw",
        organizationId: org.id,
        permissions: { agent: ["create"] },
      },
    })
    expect(raw.status).toBe(400)

    const allowed = await integrator.post("/api/api-keys", {
      body: { name: "Read only", permissions: readPermissions },
    })
    expect(allowed.status).toBe(201)

    const outside = await owner.api.post("/api/api-keys", {
      body: { name: "Phone", permissions: { phoneNumber: ["read"] } },
    })
    expect(outside.status).toBe(400)
  })

  it("updates permissions and revokes the key", async () => {
    const created = await createKey(owner)
    const id = created.body.id as string

    const updated = await owner.api.patch(`/api/api-keys/${id}`, {
      body: {
        name: "Renamed",
        permissions: { calls: ["read"] },
        expiresIn: apiKeyExpirationSeconds[30],
      },
    })
    expect(updated.status).toBe(200)
    expect(updated.body).not.toHaveProperty("key")
    expect(updated.body.name).toBe("Renamed")
    expect(updated.body.permissions).toEqual({ calls: ["read"] })
    expect(updated.body.expiresAt).toEqual(expect.any(String))

    const removed = await owner.api.delete(`/api/api-keys/${id}`)
    expect(removed.status).toBe(200)

    const list = await owner.api.get("/api/api-keys")
    expect(list.body.apiKeys).toEqual([])
    const revoked = await createApi({
      headers: { "x-api-key": created.body.key },
    }).post("/api/calls/trigger")
    expect(revoked.status).toBe(401)
  })

  it("does not list another organization's keys", async () => {
    await createKey(owner, readPermissions, "Org A")
    const other = await createOrganization()
    const otherOwner = await other.as("owner")
    const list = await otherOwner.api.get("/api/api-keys")
    expect(list.body.apiKeys).toEqual([])
  })
})
