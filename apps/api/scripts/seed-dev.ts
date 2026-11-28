import { hashPassword } from "better-auth/crypto"
import { reset } from "drizzle-seed"

import { db } from "@workspace/db/client"
import * as schema from "@workspace/db/schema/auth"
import { seedOrganizationRoles } from "@/lib/auth/organization-roles"

const DEV_USER_EMAIL = "dev@example.com"
const DEV_USER_PASSWORD = "devpassword123"
const DEV_USER_NAME = "Dev User"
const DEV_ORG_NAME = "Example Org"
const DEV_ORG_SLUG = "example-org"

await reset(db, schema)

const userId = crypto.randomUUID()
const orgId = crypto.randomUUID()

await db.insert(schema.user).values({
  id: userId,
  name: DEV_USER_NAME,
  email: DEV_USER_EMAIL,
  emailVerified: true,
})

await db.insert(schema.account).values({
  id: crypto.randomUUID(),
  accountId: userId,
  providerId: "credential",
  userId,
  password: await hashPassword(DEV_USER_PASSWORD),
})

await db.insert(schema.organization).values({
  id: orgId,
  name: DEV_ORG_NAME,
  slug: DEV_ORG_SLUG,
  creditBalance: "100.000000",
  createdAt: new Date(),
})

await db.insert(schema.member).values({
  id: crypto.randomUUID(),
  organizationId: orgId,
  userId,
  role: "owner",
  createdAt: new Date(),
})

await seedOrganizationRoles(orgId)

console.log(
  `Dev DB seeded: ${DEV_USER_EMAIL} / ${DEV_USER_PASSWORD} (org: ${DEV_ORG_NAME})`
)

await db.$client.end()
