import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"

import type {
  CallExtractionListResponse,
  CallExtractionRequest,
  CallExtractionResponse,
  DeleteCallExtractionResponse,
} from "@workspace/shared/api/call-extractions/types"
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
import { CallExtractionForm } from "@/components/call-extractions/call-extraction-form"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

export function CallExtractionRowActions({
  extraction,
}: {
  extraction: CallExtractionListResponse[number]
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canCreate = useCheckPermission({ callExtraction: ["create"] })
  const canUpdate = useCheckPermission({ callExtraction: ["update"] })
  const canDelete = useCheckPermission({ callExtraction: ["delete"] })
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const duplicate = useMutation({
    mutationFn: () =>
      api.post<CallExtractionResponse, CallExtractionRequest>(
        "/call-extractions",
        {
          body: {
            name: `${extraction.name} (copy)`.slice(0, 255),
            description: extraction.description,
            model: extraction.model as CallExtractionRequest["model"],
            schema: extraction.schema,
            agentIds: extraction.agents.map((agent) => agent.agentId),
          },
        }
      ),
    onSuccess: () => {
      toast.success(
        t("components.call_extractions.table.toasts.duplicated", {
          name: extraction.name,
        })
      )
      queryClient.invalidateQueries({ queryKey: ["call-extractions"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const remove = useMutation({
    mutationFn: () =>
      api.delete<DeleteCallExtractionResponse>(
        `/call-extractions/${extraction.id}`
      ),
    onSuccess: () => {
      toast.success(
        t("components.call_extractions.table.toasts.deleted", {
          name: extraction.name,
        })
      )
      setDeleteOpen(false)
      queryClient.invalidateQueries({ queryKey: ["call-extractions"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("components.call_extractions.table.open_actions", {
              name: extraction.name,
            })}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end" sideOffset={4}>
          <DropdownMenuItem
            disabled={!canUpdate}
            onClick={() => setEditOpen(true)}
          >
            <PencilIcon />
            {t("common.actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canCreate || duplicate.isPending}
            onClick={() => duplicate.mutate()}
          >
            <CopyIcon />
            {t("common.actions.duplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canDelete}
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            {t("common.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CallExtractionForm
        open={editOpen}
        extraction={extraction}
        onOpenChange={setEditOpen}
      />
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          setDeleteOpen(nextOpen)
          remove.reset()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("components.call_extractions.table.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("components.call_extractions.table.delete_description", {
                name: extraction.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? (
                <Spinner className="mx-3" />
              ) : (
                t("common.actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
