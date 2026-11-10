import type { TestHelpers } from "better-auth/plugins"

import { db } from "@workspace/db/client"
import { auth } from "@/lib/auth/config"
import { seedOrganizationRoles } from "@/lib/auth/organization-roles"
import { type Api, createApi } from "@/tests/api"
import { setCreditBalance } from "@/tests/factories/credits"

export type Role = "owner" | "admin" | "member"

// Better Auth's testUtils plugin is only registered when NODE_ENV=test
export async function authTest() {
  const ctx = (await auth.$context) as unknown as { test?: TestHelpers }
  if (!ctx.test) {
    throw new Error("testUtils plugin is not enabled (NODE_ENV must be 'test')")
  }
  return ctx.test
}

export type TestUser = {
  id: string
  email: string
  headers: Headers
  api: Api
}

export type TestOrganization = {
  id: string
  name: string
  as: (role: Role) => Promise<TestUser>
  addMember: (role: Role) => Promise<TestUser>
}

export async function createUser(): Promise<TestUser> {
  const test = await authTest()
  const user = await test.saveUser(test.createUser())
  const headers = await test.getAuthHeaders({ userId: user.id })
  return {
    id: user.id,
    email: user.email,
    headers,
    api: createApi({ headers }),
  }
}

// saveOrganization writes straight to the database and skips the organization
// hooks, so the roles the afterCreateOrganization hook would seed are added here
export async function createOrganization({
  creditBalance = 100,
}: {
  creditBalance?: number
} = {}): Promise<TestOrganization> {
  const test = await authTest()
  const suffix = crypto.randomUUID().slice(0, 8)
  const org = (await test.saveOrganization?.(
    test.createOrganization?.({
      name: `Org ${suffix}`,
      slug: `org-${suffix}`,
    }) ?? {}
  )) as { id: string; name: string }

  await seedOrganizationRoles(org.id)
  await setCreditBalance(org.id, creditBalance)

  async function addMember(role: Role): Promise<TestUser> {
    const user = await test.saveUser(test.createUser())
    await test.addMember?.({ userId: user.id, organizationId: org.id, role })
    const headers = await test.getAuthHeaders({
      userId: user.id,
      session: { activeOrganizationId: org.id },
    })
    return {
      id: user.id,
      email: user.email,
      headers,
      api: createApi({ headers }),
    }
  }

  const users = new Map<Role, Promise<TestUser>>()
  function as(role: Role) {
    if (!users.has(role)) users.set(role, addMember(role))
    return users.get(role) as Promise<TestUser>
  }

  return { id: org.id, name: org.name, as, addMember }
}

export async function getOrganization(organizationId: string) {
  const org = await db.query.organization.findFirst({
    where: { id: organizationId },
  })
  if (!org) throw new Error(`Organization ${organizationId} not found`)
  return org
}
