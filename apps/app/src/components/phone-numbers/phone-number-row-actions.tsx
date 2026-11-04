import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import type { PhoneNumberListResponse } from "@workspace/shared/api/phone-numbers/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
import { EditPhoneNumberForm } from "@/components/phone-numbers/edit-phone-number-form"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

type PhoneNumberRowActionsProps = {
  phoneNumber: PhoneNumberListResponse[number]
}

export function PhoneNumberRowActions({
  phoneNumber,
}: PhoneNumberRowActionsProps) {
  const { t } = useTranslation()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const canUpdate = useCheckPermission({ phoneNumber: ["update"] })
  const canDelete = useCheckPermission({ phoneNumber: ["delete"] })

  const deletePhoneNumberMutation = useMutation({
    mutationFn: () => api.delete(`/phone-numbers/${phoneNumber.id}`),
    onSuccess: () => {
      toast.success(
        t("components.phone_numbers.phone_number_row_actions.toasts.deleted", {
          number: phoneNumber.number,
        })
      )
      setDeleteOpen(false)
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] })
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          setDeleteOpen(nextOpen)
          deletePhoneNumberMutation.reset()
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t(
                "components.phone_numbers.phone_number_row_actions.open_actions",
                {
                  number: phoneNumber.number,
                }
              )}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem
              disabled={!canUpdate}
              onClick={() => setEditOpen(true)}
            >
              <PencilIcon />
              {t("common.actions.edit")}
            </DropdownMenuItem>
            <AlertDialogTrigger
              disabled={!canDelete}
              render={
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!canDelete || deletePhoneNumberMutation.isPending}
                >
                  <Trash2Icon />
                  {t("common.actions.delete")}
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "components.phone_numbers.phone_number_row_actions.delete_dialog.title"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "components.phone_numbers.phone_number_row_actions.delete_dialog.description",
                {
                  number: phoneNumber.number,
                }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePhoneNumberMutation.isPending}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePhoneNumberMutation.isPending}
              onClick={() => deletePhoneNumberMutation.mutate()}
            >
              {deletePhoneNumberMutation.isPending ? (
                <Spinner className="mx-3" />
              ) : (
                t("common.actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditPhoneNumberForm
        phoneNumber={phoneNumber}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
