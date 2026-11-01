import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import { ssoProvider } from "@workspace/db/schema/auth"
import type { SsoProviderResponse } from "@workspace/shared/api/sso/types"
import { requireOrganization } from "@/lib/auth/organization"

export const ssoRoutes = new Hono()

ssoRoutes.get("/", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const [provider] = await db
    .select({
      providerId: ssoProvider.providerId,
      issuer: ssoProvider.issuer,
      domain: ssoProvider.domain,
      domainVerified: ssoProvider.domainVerified,
      samlConfig: ssoProvider.samlConfig,
    })
    .from(ssoProvider)
    .where(eq(ssoProvider.organizationId, organizationId))
    .limit(1)

  if (!provider) {
    return c.json({ provider: null } satisfies SsoProviderResponse)
  }

  return c.json({
    provider: {
      providerId: provider.providerId,
      type: provider.samlConfig ? "saml" : "oidc",
      issuer: provider.issuer,
      domain: provider.domain,
      domainVerified: provider.domainVerified,
    },
  } satisfies SsoProviderResponse)
})
