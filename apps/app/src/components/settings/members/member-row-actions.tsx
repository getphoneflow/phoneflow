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
import { useTranslation } from "@/lib/i18n"

type MemberRowActionsProps = {
  member: OrganizationMember
}

export function MemberRowActions({ member }: MemberRowActionsProps) {
  const { t } = useTranslation()
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
      toast.success(
        t("components.settings.members.member_row_actions.toasts.removed", {
          name: member.user.name,
        })
      )
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
      toast.success(
        t("components.settings.members.member_row_actions.toasts.left")
      )
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
            <AlertDialogTitle>
              {t(
                "components.settings.members.member_row_actions.remove_dialog.title"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "components.settings.members.member_row_actions.remove_dialog.description",
                { name: member.user.name }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMemberMutation.isPending}>
              {t("common.actions.cancel")}
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
                t(
                  "components.settings.members.member_row_actions.remove_dialog.confirm"
                )
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "components.settings.members.member_row_actions.leave_dialog.title"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "components.settings.members.member_row_actions.leave_dialog.description"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveOrganizationMutation.isPending}>
              {t("common.actions.cancel")}
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
                t(
                  "components.settings.members.member_row_actions.leave_dialog.confirm"
                )
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
            aria-label={t(
              "components.settings.members.member_row_actions.open_actions",
              {
                name: member.user.name,
              }
            )}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" sideOffset={4}>
          {!isCurrentUser && (
            <DropdownMenuItem
              variant="destructive"
              disabled={!canRemove}
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2Icon />
              {t("components.settings.members.member_row_actions.remove")}
            </DropdownMenuItem>
          )}

          {isCurrentUser && (
            <DropdownMenuItem
              variant="destructive"
              disabled={member.role === "owner"}
              onClick={() => setLeaveOpen(true)}
            >
              <LogOutIcon />
              {t("components.settings.members.member_row_actions.leave")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
