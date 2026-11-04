import { useMutation } from "@tanstack/react-query"
import { DownloadIcon } from "lucide-react"
import { useState } from "react"

import type { RequestCallDownloadResponse } from "@workspace/shared/api/calls/types"
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
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

export function DownloadCallsDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const downloadMutation = useMutation({
    mutationFn: () =>
      api.post<RequestCallDownloadResponse, never>("/calls/download", {}),
    onSuccess: () => {
      toast.success(
        t("components.calls.download_calls_dialog.toasts.requested")
      )
      setOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <DownloadIcon />
        {t("common.actions.download")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          downloadMutation.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("components.calls.download_calls_dialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("components.calls.download_calls_dialog.description")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-8">
            <DialogClose>
              <Button variant="outline" disabled={downloadMutation.isPending}>
                {t("common.actions.cancel")}
              </Button>
            </DialogClose>
            <Button
              disabled={downloadMutation.isPending}
              onClick={() => downloadMutation.mutate()}
            >
              {downloadMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                t("components.calls.download_calls_dialog.submit")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
