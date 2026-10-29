import { adminAc, memberAc } from "better-auth/plugins/organization/access"

import { db } from "@workspace/db/client"
import { organizationRole } from "@workspace/db/schema/auth"

const defaultRoles = {
  admin: {
    displayName: "Admin",
    permission: {
      ...adminAc.statements,
      agent: ["create", "update", "delete"],
      phoneNumber: ["create", "update", "delete"],
      calls: ["create"],
      billing: ["purchase"],
    },
  },
  member: {
    displayName: "Member",
    permission: {
      ...memberAc.statements,
    },
  },
}

export async function seedOrganizationRoles(organizationId: string) {
  await db
    .insert(organizationRole)
    .values(
      Object.entries(defaultRoles).map(
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
