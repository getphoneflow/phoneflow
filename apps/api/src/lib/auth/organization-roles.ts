import { db } from "@workspace/db/client"
import { organizationRole } from "@workspace/db/schema/auth"
import { defaultOrganizationRoles } from "@workspace/shared/auth/roles"

export async function seedOrganizationRoles(organizationId: string) {
  await db
    .insert(organizationRole)
    .values(
      Object.entries(defaultOrganizationRoles).map(
        ([role, { displayName, permission }]) => ({
          id: crypto.randomUUID(),
          organizationId,
          role,
          displayName,
          permission: JSON.stringify(permission),
          createdAt: new Date(),
        })
      )
    )
    .onConflictDoNothing({
      target: [organizationRole.organizationId, organizationRole.role],
    })
}
