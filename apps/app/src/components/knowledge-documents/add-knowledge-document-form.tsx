import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { useState } from "react"

import type { KnowledgeDocumentResponse } from "@workspace/shared/api/knowledge-documents/types"
import { KNOWLEDGE_FILE_EXTENSIONS } from "@workspace/shared/knowledge/constants"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

const accept = KNOWLEDGE_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`
).join(",")

export function AddKnowledgeDocumentForm() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canCreate = useCheckPermission({ knowledgeBase: ["create"] })
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<"file" | "text">("file")
  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)

  function reset() {
    setSource("file")
    setName("")
    setText("")
    setFile(null)
  }

  const createDocument = useMutation({
    mutationFn: async () => {
      if (source === "text") {
        return api.post<
          KnowledgeDocumentResponse,
          { name: string; text: string }
        >("/knowledge-documents", { body: { name, text } })
      }

      const body = new FormData()
      body.set("name", name)
      if (file) body.set("file", file)
      return api.upload<KnowledgeDocumentResponse>("/knowledge-documents", body)
    },
    onSuccess: () => {
      reset()
      setOpen(false)
      queryClient.invalidateQueries({
        queryKey: ["knowledge-documents", "list"],
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const canSubmit =
    name.trim().length > 0 &&
    (source === "text" ? text.trim().length > 0 : file !== null)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        reset()
        createDocument.reset()
      }}
    >
      <DialogTrigger disabled={!canCreate}>
        <Button disabled={!canCreate}>
          <PlusIcon />
          {t("components.knowledge_documents.add_form.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("components.knowledge_documents.add_form.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.knowledge_documents.add_form.description")}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (canSubmit) createDocument.mutate()
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="knowledge-document-name">
                {t("components.knowledge_documents.add_form.name.label")}
              </FieldLabel>
              <Input
                id="knowledge-document-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t(
                  "components.knowledge_documents.add_form.name.placeholder"
                )}
              />
            </Field>
            <Tabs
              value={source}
              onValueChange={(value) => {
                if (value === "file" || value === "text") setSource(value)
              }}
            >
              <TabsList>
                <TabsTrigger value="file">
                  {t("components.knowledge_documents.add_form.file")}
                </TabsTrigger>
                <TabsTrigger value="text">
                  {t("components.knowledge_documents.add_form.text")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {source === "file" ? (
              <Field>
                <FieldLabel htmlFor="knowledge-document-file">
                  {t("components.knowledge_documents.add_form.file_label")}
                </FieldLabel>
                <Input
                  id="knowledge-document-file"
                  type="file"
                  accept={accept}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="knowledge-document-text">
                  {t("components.knowledge_documents.add_form.text_label")}
                </FieldLabel>
                <Textarea
                  id="knowledge-document-text"
                  rows={8}
                  value={text}
                  placeholder={t(
                    "components.knowledge_documents.add_form.text_placeholder"
                  )}
                  onChange={(event) => setText(event.target.value)}
                />
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                {t("components.knowledge_documents.add_form.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={!canSubmit || createDocument.isPending}
            >
              {createDocument.isPending ? <Spinner /> : null}
              {t("components.knowledge_documents.add_form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
