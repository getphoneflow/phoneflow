import { useMutation, useQueryClient } from "@tanstack/react-query"
import { DownloadIcon, UploadIcon } from "lucide-react"
import { useState } from "react"

import type {
  BulkAddDoNotCallRequest,
  BulkAddDoNotCallResponse,
} from "@workspace/shared/api/do-not-call/types"
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
import { Dropzone } from "@workspace/ui/components/dropzone"
import { Field, FieldError } from "@workspace/ui/components/field"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  downloadDoNotCallCsvTemplate,
  parseDoNotCallCsv,
} from "@/components/do-not-call/do-not-call-csv"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

const INVALID_PREVIEW_LIMIT = 10

export function ImportDoNotCallDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<BulkAddDoNotCallRequest["rows"]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const canCreate = useCheckPermission({ doNotCall: ["create"] })

  const importMutation = useMutation({
    mutationFn: (body: BulkAddDoNotCallRequest) =>
      api.post<BulkAddDoNotCallResponse, BulkAddDoNotCallRequest>(
        "/do-not-call/bulk",
        { body }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["do-not-call"] })
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      queryClient.invalidateQueries({ queryKey: ["calls"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function reset() {
    setFile(null)
    setRows([])
    setParseError(null)
    importMutation.reset()
  }

  async function onFileChange(nextFile: File | null) {
    reset()
    setFile(nextFile)

    if (!nextFile) {
      return
    }

    try {
      setRows(parseDoNotCallCsv(await nextFile.text(), t))
    } catch (error) {
      setParseError(
        error instanceof Error
          ? error.message
          : t("components.do_not_call.csv.errors.invalid")
      )
    }
  }

  const result = importMutation.data

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        reset()
      }}
    >
      <DialogTrigger disabled={!canCreate}>
        <Button variant="outline" disabled={!canCreate}>
          <UploadIcon />
          {t("components.do_not_call.import_dialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("components.do_not_call.import_dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.do_not_call.import_dialog.description")}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-2 text-sm">
            <p>
              {t("components.do_not_call.import_dialog.result.added", {
                count: result.added,
              })}
            </p>
            <p>
              {t("components.do_not_call.import_dialog.result.already_listed", {
                count: result.alreadyListed,
              })}
            </p>
            <p>
              {t("components.do_not_call.import_dialog.result.duplicates", {
                count: result.duplicates,
              })}
            </p>
            <p>
              {t("components.do_not_call.import_dialog.result.invalid", {
                count: result.invalid.length,
              })}
            </p>
            {result.invalid.length > 0 ? (
              <p className="break-words text-muted-foreground">
                {result.invalid.slice(0, INVALID_PREVIEW_LIMIT).join(", ")}
                {result.invalid.length > INVALID_PREVIEW_LIMIT ? ", …" : ""}
              </p>
            ) : null}
          </div>
        ) : (
          <Field>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0"
                onClick={downloadDoNotCallCsvTemplate}
              >
                <DownloadIcon />
                {t("components.do_not_call.import_dialog.download_template")}
              </Button>
            </div>
            <Dropzone
              accept=".csv,text/csv"
              value={file}
              onValueChange={onFileChange}
              disabled={importMutation.isPending}
              className="h-40"
              placeholder={t(
                "components.do_not_call.import_dialog.placeholder"
              )}
            />
            {parseError ? <FieldError>{parseError}</FieldError> : null}
            {rows.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("components.do_not_call.import_dialog.rows", {
                  count: rows.length,
                })}
              </p>
            ) : null}
          </Field>
        )}

        <DialogFooter>
          <DialogClose
            render={
              <Button
                type="button"
                variant="outline"
                disabled={importMutation.isPending}
              />
            }
          >
            {result ? t("common.actions.close") : t("common.actions.cancel")}
          </DialogClose>
          {result ? null : (
            <Button
              type="button"
              disabled={rows.length === 0 || importMutation.isPending}
              onClick={() => importMutation.mutate({ rows })}
            >
              {importMutation.isPending ? (
                <Spinner />
              ) : (
                t("components.do_not_call.import_dialog.submit")
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
