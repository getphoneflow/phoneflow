import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import type { KnowledgeBaseDocumentResponse } from "@workspace/shared/api/knowledge-base/types"
import { KNOWLEDGE_BASE_DOCUMENT_EXTENSIONS } from "@workspace/shared/knowledge/constants"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Dropzone } from "@workspace/ui/components/dropzone"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { useCheckPermission } from "@/lib/auth/permissions"
import { env } from "@/lib/env"
import i18n, { useTranslation } from "@/lib/i18n"

const accept = KNOWLEDGE_BASE_DOCUMENT_EXTENSIONS.map(
  (extension) => `.${extension}`
).join(",")

type AddKnowledgeBaseDocumentFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddKnowledgeBaseDocumentForm({
  open,
  onOpenChange,
}: AddKnowledgeBaseDocumentFormProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canCreate = useCheckPermission({ knowledgeBase: ["create"] })
  const [file, setFile] = useState<File | null>(null)

  const createDocument = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error(t("components.knowledge_base.add_form.no_file"))
      }
      const formData = new FormData()
      formData.set("file", file)
      const response = await fetch(`${env.API_URL}/api/knowledge-base`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Accept-Language": i18n.language,
        },
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || response.status)
      }
      return payload as KnowledgeBaseDocumentResponse
    },
    onSuccess: () => {
      setFile(null)
      onOpenChange(false)
      queryClient.invalidateQueries({
        queryKey: ["knowledge-base", "documents"],
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        setFile(null)
        createDocument.reset()
      }}
    >
      <DialogContent className="*:min-w-0">
        <DialogHeader>
          <DialogTitle>
            {t("components.knowledge_base.add_form.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.knowledge_base.add_form.description")}
          </DialogDescription>
        </DialogHeader>
        <Dropzone
          accept={accept}
          value={file}
          onValueChange={setFile}
          disabled={createDocument.isPending}
          placeholder={t("components.knowledge_base.add_form.placeholder")}
        />
        <DialogFooter>
          <DialogClose>
            <Button variant="outline" disabled={createDocument.isPending}>
              {t("common.actions.cancel")}
            </Button>
          </DialogClose>
          <Button
            disabled={!file || createDocument.isPending || !canCreate}
            onClick={() => createDocument.mutate()}
          >
            {createDocument.isPending ? (
              <Spinner className="mx-8" />
            ) : (
              t("components.knowledge_base.add_form.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
