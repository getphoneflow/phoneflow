import { useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  AgentResponse,
  DeleteAgentResponse,
} from "@workspace/shared/api/agents/types"
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
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

type DeleteAgentDialogProps = {
  agent: Pick<AgentResponse, "id" | "name">
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteAgentDialog({
  agent,
  open,
  onOpenChange,
  onDeleted,
}: DeleteAgentDialogProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const deleteAgentMutation = useMutation({
    mutationFn: () => api.delete<DeleteAgentResponse>(`/agents/${agent.id}`),
    onSuccess: () => {
      toast.success(
        t("components.agents.delete_agent_dialog.toasts.deleted", {
          name: agent.name,
        })
      )
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] })
      onDeleted?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        deleteAgentMutation.reset()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("components.agents.delete_agent_dialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("components.agents.delete_agent_dialog.description", {
              name: agent.name,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAgentMutation.isPending}>
            {t("common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteAgentMutation.isPending}
            onClick={() => deleteAgentMutation.mutate()}
          >
            {deleteAgentMutation.isPending ? (
              <Spinner className="mx-3" />
            ) : (
              t("common.actions.delete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
