import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2Icon } from "lucide-react"
import { useState } from "react"

import type {
  DoNotCallListItem,
  RemoveDoNotCallResponse,
} from "@workspace/shared/api/do-not-call/types"
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
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

export function DoNotCallRowActions({ entry }: { entry: DoNotCallListItem }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const canDelete = useCheckPermission({ doNotCall: ["delete"] })

  const removeMutation = useMutation({
    mutationFn: () =>
      api.delete<RemoveDoNotCallResponse>(`/do-not-call/${entry.id}`),
    onSuccess: () => {
      toast.success(
        t("components.do_not_call.remove_dialog.toasts.removed", {
          number: entry.number,
        })
      )
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["do-not-call"] })
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      queryClient.invalidateQueries({ queryKey: ["calls"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        removeMutation.reset()
      }}
    >
      <AlertDialogTrigger
        disabled={!canDelete}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canDelete}
            aria-label={t("components.do_not_call.remove_dialog.trigger", {
              number: entry.number,
            })}
          />
        }
      >
        <Trash2Icon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("components.do_not_call.remove_dialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("components.do_not_call.remove_dialog.description", {
              number: entry.number,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeMutation.isPending}>
            {t("common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={removeMutation.isPending}
            onClick={() => removeMutation.mutate()}
          >
            {removeMutation.isPending ? (
              <Spinner className="mx-3" />
            ) : (
              t("components.do_not_call.remove_dialog.confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
