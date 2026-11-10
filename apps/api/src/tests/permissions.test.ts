import { beforeAll, describe, expect, it } from "vitest"

import { env } from "@/lib/env"
import { createApi } from "@/tests/api"
import {
  createOrganization,
  createUser,
  type TestOrganization,
} from "@/tests/factories/auth"

const api = createApi()
const serviceApi = createApi({
  headers: { Authorization: `Bearer ${env.API_TOKEN}` },
})

// Roles are defined in packages/shared/src/auth/roles.ts (owner) and
// apps/api/src/lib/auth/organization-roles.ts (admin, member)

const someId = "00000000-0000-4000-8000-000000000000"

type Endpoint = {
  method: "get" | "post" | "patch" | "put" | "delete"
  path: string
}

// Mutations that need a specific permission. Members must be rejected
const protectedEndpoints: Endpoint[] = [
  { method: "post", path: "/api/agents" },
  { method: "post", path: `/api/agents/${someId}/duplicate` },
  { method: "patch", path: `/api/agents/${someId}/name` },
  { method: "patch", path: `/api/agents/${someId}/config` },
  { method: "post", path: `/api/agents/${someId}/publish` },
  { method: "delete", path: `/api/agents/${someId}` },
  { method: "post", path: "/api/phone-numbers" },
  { method: "patch", path: `/api/phone-numbers/${someId}` },
  { method: "delete", path: `/api/phone-numbers/${someId}` },
  { method: "post", path: "/api/calls/outbound" },
  { method: "post", path: "/api/batch-calls" },
  { method: "post", path: "/api/billing/checkout" },
  { method: "post", path: "/api/billing/confirm" },
  { method: "get", path: "/api/billing/auto-reload" },
  { method: "put", path: "/api/billing/auto-reload" },
  { method: "post", path: "/api/billing/portal" },
]

// Reads every member of the organization can do
const memberReadableEndpoints: Endpoint[] = [
  { method: "get", path: "/api/agents" },
  { method: "get", path: "/api/phone-numbers" },
  { method: "get", path: "/api/calls" },
  { method: "get", path: "/api/contacts" },
  { method: "get", path: "/api/batch-calls" },
  { method: "get", path: "/api/billing" },
  { method: "get", path: "/api/sso" },
]

// Endpoints only the voice agent / worker may call (API token)
const serviceEndpoints: Endpoint[] = [
  { method: "post", path: "/api/calls/start/web" },
  { method: "post", path: "/api/calls/start/inbound" },
  { method: "post", path: "/api/calls/start/outbound" },
  { method: "post", path: "/api/calls/unanswered" },
  { method: "post", path: "/api/calls/complete" },
  { method: "get", path: `/api/calls/export/${someId}` },
  { method: "get", path: `/api/contacts/export/${someId}` },
  { method: "post", path: `/api/batch-calls/${someId}/trigger` },
]

const allOrganizationEndpoints = [
  ...protectedEndpoints,
  ...memberReadableEndpoints,
]

function label({ method, path }: Endpoint) {
  return `${method.toUpperCase()} ${path}`
}

describe("authorization", () => {
  let org: TestOrganization

  beforeAll(async () => {
    org = await createOrganization()
  })

  describe.each(protectedEndpoints)("$method $path", (endpoint) => {
    it("rejects members with 403", async () => {
      const member = await org.as("member")
      expect((await member.api[endpoint.method](endpoint.path)).status).toBe(
        403
      )
    })

    it.each(["owner", "admin"] as const)("lets %s through", async (role) => {
      const user = await org.as(role)
      const res = await user.api[endpoint.method](endpoint.path)
      expect(res.status, label(endpoint)).not.toBe(401)
      expect(res.status, label(endpoint)).not.toBe(403)
    })
  })

  it.each(memberReadableEndpoints.map((e) => [label(e), e] as const))(
    "lets members read %s",
    async (_, endpoint) => {
      const member = await org.as("member")
      expect((await member.api[endpoint.method](endpoint.path)).status).toBe(
        200
      )
    }
  )

  it.each(allOrganizationEndpoints.map((e) => [label(e), e] as const))(
    "returns 401 without a session: %s",
    async (_, endpoint) => {
      const res = await api[endpoint.method](endpoint.path)
      expect(res.status).toBe(401)
    }
  )

  it("returns 400 when the session has no active organization", async () => {
    const user = await createUser()
    expect((await user.api.get("/api/agents")).status).toBe(400)
  })

  it("does not let a session cookie call service endpoints", async () => {
    const owner = await org.as("owner")
    for (const endpoint of serviceEndpoints) {
      const res = await owner.api[endpoint.method](endpoint.path)
      expect(res.status, label(endpoint)).toBe(401)
    }
  })

  it.each([
    ["no token", undefined],
    ["wrong token", "Bearer not-the-token"],
    ["empty bearer", "Bearer "],
    ["raw token without Bearer", "test-api-token"],
  ])("rejects service endpoints with %s", async (_, authorization) => {
    const caller = createApi({
      headers: authorization ? { Authorization: authorization } : {},
    })
    for (const endpoint of serviceEndpoints) {
      const res = await caller[endpoint.method](endpoint.path)
      expect(res.status, label(endpoint)).toBe(401)
    }
  })

  it("accepts the API token on service endpoints", async () => {
    const res = await serviceApi.get(`/api/calls/export/${someId}`)
    expect(res.status).toBe(200)
  })
})
