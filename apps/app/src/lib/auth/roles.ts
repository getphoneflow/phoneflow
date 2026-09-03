import { z } from "zod"

import { type RoleKeys, roles } from "@workspace/shared/auth/roles"

export const assignableRoleSchema = z.enum(["admin", "member"])

export type AssignableRole = z.infer<typeof assignableRoleSchema>

export const assignableRoles = assignableRoleSchema.options

export const roleKeys = Object.keys(roles) as RoleKeys[]

export const roleLabels: Record<RoleKeys, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
}

export const roleDescriptions: Record<RoleKeys, string> = {
  owner:
    "Full control over the organization, members, and invitations. Can create, update, and delete agents and phone numbers, buy credits, update organization settings, and delete the organization.",
  admin:
    "Full access to manage members, invitations, agents, phone numbers, and billing. Can update organization settings, but cannot delete the organization or transfer ownership.",
  member:
    "Read-only access to organization data, agents, phone numbers, and billing. Cannot create, update, or delete resources, buy credits, or manage members and invitations.",
}

export function toAssignableRole(
  role: string | null | undefined
): AssignableRole {
  return assignableRoles.includes(role as AssignableRole)
    ? (role as AssignableRole)
    : "member"
}
