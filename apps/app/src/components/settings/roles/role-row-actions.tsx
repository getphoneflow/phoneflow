import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
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
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

type OrganizationRole = NonNullable<
  Awaited<ReturnType<typeof organization.listRoles>>["data"]
>[number]

type RoleRowActionsProps = {
  role: OrganizationRole
  onEdit: () => void
}

export function RoleRowActions({ role, onEdit }: RoleRowActionsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const canUpdate = useCheckPermission({ ac: ["update"] })
  const canDelete = useCheckPermission({ ac: ["delete"] })

  const deleteRoleMutation = useMutation({
    mutationFn: async () => {
      const result = await organization.deleteRole({ roleId: role.id })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(
        t("components.settings.roles.role_row_actions.toasts.deleted", {
          name: role.displayName,
        })
      )
      setDeleteOpen(false)
      queryClient.invalidateQueries({ queryKey: ["organization-roles"] })
      queryClient.invalidateQueries({ queryKey: ["has-permission"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "components.settings.roles.role_row_actions.delete_dialog.title"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "components.settings.roles.role_row_actions.delete_dialog.description",
                { name: role.displayName }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoleMutation.isPending}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteRoleMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                deleteRoleMutation.mutate()
              }}
            >
              {deleteRoleMutation.isPending ? (
                <Spinner className="mx-3 size-4" />
              ) : (
                t("common.actions.delete")
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
              "components.settings.roles.role_row_actions.open_actions",
              {
                name: role.displayName,
              }
            )}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end" sideOffset={4}>
          <DropdownMenuItem disabled={!canUpdate} onClick={onEdit}>
            <PencilIcon />
            {t("components.settings.roles.role_row_actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            {t("components.settings.roles.role_row_actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
