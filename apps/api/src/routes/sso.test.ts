import { describe, expect, it } from "vitest"

import { db } from "@workspace/db/client"
import { ssoProvider } from "@workspace/db/schema/auth"
import { createOrganization } from "@/tests/factories/auth"

describe("GET /api/sso", () => {
  it("returns null when the organization has no SSO provider", async () => {
    const member = await (await createOrganization()).as("member")
    expect((await member.api.get("/api/sso")).body).toEqual({
      provider: null,
    })
  })

  it("describes the organization's SAML provider without exposing its config", async () => {
    const org = await createOrganization()
    const member = await org.as("member")
    const owner = await org.as("owner")
    await db.insert(ssoProvider).values({
      id: crypto.randomUUID(),
      providerId: `acme-${org.id}`,
      issuer: "https://idp.acme.example.com",
      domain: "acme.example.com",
      samlConfig: JSON.stringify({ cert: "secret" }),
      organizationId: org.id,
      userId: owner.id,
    } as typeof ssoProvider.$inferInsert)

    const body = (await member.api.get("/api/sso")).body

    expect(body).toEqual({
      provider: {
        providerId: `acme-${org.id}`,
        type: "saml",
        issuer: "https://idp.acme.example.com",
        domain: "acme.example.com",
        domainVerified: expect.any(Boolean),
      },
    })
  })
})
