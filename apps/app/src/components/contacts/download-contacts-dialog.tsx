import { useMutation } from "@tanstack/react-query"
import { DownloadIcon } from "lucide-react"
import { useState } from "react"

import type { RequestContactDownloadResponse } from "@workspace/shared/api/contacts/types"
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

export function DownloadContactsDialog() {
  const [open, setOpen] = useState(false)

  const downloadMutation = useMutation({
    mutationFn: () =>
      api.post<RequestContactDownloadResponse, never>("/contacts/download", {}),
    onSuccess: () => {
      toast.success("The contacts will be sent to your email shortly")
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
        Download
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
            <DialogTitle>Download contacts</DialogTitle>
            <DialogDescription>
              You will receive an email with all contacts
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-8">
            <DialogClose>
              <Button variant="outline" disabled={downloadMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={downloadMutation.isPending}
              onClick={() => downloadMutation.mutate()}
            >
              {downloadMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                "Send email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
