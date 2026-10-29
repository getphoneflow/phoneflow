import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { organization } from "@/lib/auth/client"
import {
  activeMemberQueryOptions,
  type OrganizationInvitation,
  type OrganizationMember,
  organizationRolesQueryOptions,
} from "@/lib/auth/organization"
import { useCheckPermission } from "@/lib/auth/permissions"

type SelectRoleProps = {
  id?: string
  value: string
  disabled?: boolean
  ariaLabel: string
  onValueChange: (role: string) => void
}

export function SelectRole({
  id,
  value,
  disabled,
  ariaLabel,
  onValueChange,
}: SelectRoleProps) {
  const { data: roles } = useSuspenseQuery(organizationRolesQueryOptions())
  const selected = roles.find((role) => role.role === value)

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-36" aria-label={ariaLabel}>
        <SelectValue>{selected!.displayName}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.role}>
            {role.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type MemberRoleSelectProps = {
  member: OrganizationMember
}

export function MemberRoleSelect({ member }: MemberRoleSelectProps) {
  const queryClient = useQueryClient()
  const { data: roles } = useSuspenseQuery(organizationRolesQueryOptions())
  const { data: activeMember } = useSuspenseQuery(activeMemberQueryOptions())
  const canUpdate = useCheckPermission({ member: ["update"] })
  const isCurrentUser = member.userId === activeMember.userId

  const updateRoleMutation = useMutation({
    mutationFn: async (nextRole: string) => {
      const result = await organization.updateMemberRole({
        memberId: member.id,
        role: nextRole,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: (_data, nextRole) => {
      const displayName = roles.find(
        (role) => role.role === nextRole
      )!.displayName
      toast.success(`${member.user.name} is now ${displayName}`)
      queryClient.invalidateQueries({ queryKey: ["organization-members"] })
      queryClient.invalidateQueries({ queryKey: ["has-permission"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (member.role === "owner") {
    return <span>Owner</span>
  }

  return (
    <SelectRole
      value={member.role}
      ariaLabel={`Role for ${member.user.name}`}
      disabled={!canUpdate || isCurrentUser || updateRoleMutation.isPending}
      onValueChange={(role) => updateRoleMutation.mutate(role)}
    />
  )
}

type InvitationRoleSelectProps = {
  invitation: OrganizationInvitation
}

export function InvitationRoleSelect({
  invitation,
}: InvitationRoleSelectProps) {
  const queryClient = useQueryClient()
  const { data: roles } = useSuspenseQuery(organizationRolesQueryOptions())
  const canCreate = useCheckPermission({ invitation: ["create"] })
  const canCancel = useCheckPermission({ invitation: ["cancel"] })
  const canUpdateRole = canCreate && canCancel
  const role = invitation.role

  const updateRoleMutation = useMutation({
    mutationFn: async (nextRole: string) => {
      if (nextRole === role) {
        return
      }

      const cancelResult = await organization.cancelInvitation({
        invitationId: invitation.id,
      })
      if (cancelResult.error) {
        throw new Error(cancelResult.error.message)
      }

      const inviteResult = await organization.inviteMember({
        email: invitation.email,
        role: nextRole,
      })
      if (inviteResult.error) {
        throw new Error(inviteResult.error.message)
      }
    },
    onSuccess: (_data, nextRole) => {
      const displayName = roles.find(
        (role) => role.role === nextRole
      )!.displayName
      toast.success(`Invitation role updated to ${displayName}`)
      queryClient.invalidateQueries({ queryKey: ["organization-invitations"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <SelectRole
      value={role}
      ariaLabel={`Role for ${invitation.email}`}
      disabled={!canUpdateRole || updateRoleMutation.isPending}
      onValueChange={(nextRole) => updateRoleMutation.mutate(nextRole)}
    />
  )
}
