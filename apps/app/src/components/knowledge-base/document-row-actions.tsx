import { useMutation, useQueryClient } from "@tanstack/react-query"
import { DownloadIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import type {
  DeleteKnowledgeBaseDocumentResponse,
  KnowledgeBaseDocumentResponse,
} from "@workspace/shared/api/knowledge-base/types"
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
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { env } from "@/lib/env"
import i18n, { useTranslation } from "@/lib/i18n"

type KnowledgeBaseDocumentRowActionsProps = {
  document: KnowledgeBaseDocumentResponse
}

export function KnowledgeBaseDocumentRowActions({
  document,
}: KnowledgeBaseDocumentRowActionsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canDelete = useCheckPermission({ knowledgeBase: ["delete"] })
  const [deleteOpen, setDeleteOpen] = useState(false)

  const download = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${env.API_URL}/api/knowledge-base/${document.id}/download`,
        {
          credentials: "include",
          headers: {
            "Accept-Language": i18n.language,
          },
        }
      )
      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error || response.status)
      }
      const blob = await response.blob()
      const header = response.headers.get("content-disposition") ?? ""
      const match = header.match(/filename="([^"]+)"/)
      const filename = match?.[1] || document.name
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const remove = useMutation({
    mutationFn: () =>
      api.delete<DeleteKnowledgeBaseDocumentResponse>(
        `/knowledge-base/${document.id}`
      ),
    onSuccess: () => {
      toast.success(
        t("components.knowledge_base.table.toasts.deleted", {
          name: document.name,
        })
      )
      setDeleteOpen(false)
      queryClient.invalidateQueries({
        queryKey: ["knowledge-base", "documents"],
      })
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
          remove.reset()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("components.knowledge_base.table.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("components.knowledge_base.table.delete_description", {
                name: document.name,
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
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("components.knowledge_base.table.open_actions", {
              name: document.name,
            })}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end" sideOffset={4}>
          <DropdownMenuItem
            disabled={download.isPending}
            onClick={() => download.mutate()}
          >
            <DownloadIcon />
            {t("common.actions.download")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            {t("common.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
