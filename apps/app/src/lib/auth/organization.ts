import { queryOptions } from "@tanstack/react-query"

import { organization } from "@/lib/auth/client"

export type OrganizationMember = NonNullable<
  Awaited<ReturnType<typeof organization.listMembers>>["data"]
>["members"][number]

export type OrganizationInvitation = NonNullable<
  Awaited<ReturnType<typeof organization.listInvitations>>["data"]
>[number]

export function fullOrganizationQueryOptions() {
  return queryOptions({
    queryKey: ["full-organization"],
    queryFn: async () => {
      const { data } = await organization.getFullOrganization()
      return data
    },
    staleTime: 1000 * 60,
  })
}

export function organizationsListQueryOptions() {
  return queryOptions({
    queryKey: ["organizations-list"],
    queryFn: async () => {
      const { data } = await organization.list()
      return data
    },
    staleTime: 1000 * 60,
  })
}

export function activeMemberQueryOptions() {
  return queryOptions({
    queryKey: ["active-member"],
    queryFn: async () => {
      const { data } = await organization.getActiveMember()
      if (!data) {
        throw new Error("No active organization member")
      }
      return data
    },
    staleTime: 1000 * 60,
  })
}

export function organizationMembersQueryOptions() {
  return queryOptions({
    queryKey: ["organization-members"],
    queryFn: async () => {
      const { data } = await organization.listMembers()
      return data?.members ?? []
    },
    staleTime: 1000 * 60,
  })
}

export function organizationRolesQueryOptions() {
  return queryOptions({
    queryKey: ["organization-roles"],
    queryFn: async () => {
      const { data } = await organization.listRoles()
      return data ?? []
    },
    staleTime: 1000 * 60,
  })
}

export function organizationInvitationsQueryOptions() {
  return queryOptions({
    queryKey: ["organization-invitations"],
    queryFn: async () => {
      const { data } = await organization.listInvitations()
      return data ?? []
    },
    staleTime: 1000 * 60,
  })
}
