import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { LogOutIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { organization } from "@/lib/auth/client"
import {
  activeMemberQueryOptions,
  type OrganizationMember,
} from "@/lib/auth/organization"
import { useCheckPermission } from "@/lib/auth/permissions"

type MemberRowActionsProps = {
  member: OrganizationMember
}

export function MemberRowActions({ member }: MemberRowActionsProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [removeOpen, setRemoveOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const { data: activeMember } = useSuspenseQuery(activeMemberQueryOptions())

  const isCurrentUser = member.userId === activeMember.userId
  const canDelete = useCheckPermission({ member: ["delete"] })
  const canRemove = !isCurrentUser && canDelete

  const removeMemberMutation = useMutation({
    mutationFn: async () => {
      const result = await organization.removeMember({
        memberIdOrEmail: member.id,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(`${member.user.name} removed`)
      setRemoveOpen(false)
      queryClient.invalidateQueries({ queryKey: ["organization-members"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const leaveOrganizationMutation = useMutation({
    mutationFn: async () => {
      const result = await organization.leave({
        organizationId: member.organizationId,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: async () => {
      toast.success("You left the organization")
      setLeaveOpen(false)
      await queryClient.refetchQueries()
      navigate({ to: "/select-organization" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {member.user.name} from this organization
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMemberMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeMemberMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                removeMemberMutation.mutate()
              }}
            >
              {removeMemberMutation.isPending ? (
                <Spinner className="mx-3 size-4" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave organization</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to this organization
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveOrganizationMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={leaveOrganizationMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                leaveOrganizationMutation.mutate()
              }}
            >
              {leaveOrganizationMutation.isPending ? (
                <Spinner className="mx-3 size-4" />
              ) : (
                "Leave"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Open actions for ${member.user.name}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          {!isCurrentUser && (
            <DropdownMenuItem
              variant="destructive"
              disabled={!canRemove}
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2Icon />
              Remove member
            </DropdownMenuItem>
          )}

          {isCurrentUser && (
            <DropdownMenuItem
              variant="destructive"
              disabled={member.role === "owner"}
              onClick={() => setLeaveOpen(true)}
            >
              <LogOutIcon />
              Leave organization
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
