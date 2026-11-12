import { useMutation, useQueryClient } from "@tanstack/react-query"
import { DownloadIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import type {
  DeleteKnowledgeDocumentResponse,
  KnowledgeDocumentResponse,
} from "@workspace/shared/api/knowledge-documents/types"
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
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

type KnowledgeDocumentRowActionsProps = {
  document: KnowledgeDocumentResponse
}

export function KnowledgeDocumentRowActions({
  document,
}: KnowledgeDocumentRowActionsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canDelete = useCheckPermission({ knowledgeBase: ["delete"] })
  const [open, setOpen] = useState(false)

  const download = useMutation({
    mutationFn: async () => {
      const response = await api.download(
        `/knowledge-documents/${document.id}/download`
      )
      const blob = await response.blob()
      const header = response.headers.get("content-disposition") ?? ""
      const match = header.match(/filename="([^"]+)"/)
      const filename = match?.[1] || document.fileName || `${document.name}.txt`
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
      api.delete<DeleteKnowledgeDocumentResponse>(
        `/knowledge-documents/${document.id}`
      ),
    onSuccess: () => {
      setOpen(false)
      queryClient.invalidateQueries({
        queryKey: ["knowledge-documents", "list"],
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("components.knowledge_documents.table.download", {
          name: document.name,
        })}
        disabled={download.isPending}
        onClick={() => download.mutate()}
      >
        {download.isPending ? <Spinner /> : <DownloadIcon />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("components.knowledge_documents.table.delete", {
          name: document.name,
        })}
        disabled={!canDelete}
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("components.knowledge_documents.table.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("components.knowledge_documents.table.delete_description", {
                name: document.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("components.knowledge_documents.table.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault()
                remove.mutate()
              }}
            >
              {remove.isPending ? <Spinner /> : null}
              {t("components.knowledge_documents.table.confirm_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
