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

export function DownloadCallsDialog() {
  const [open, setOpen] = useState(false)

  const downloadMutation = useMutation({
    mutationFn: () =>
      api.post<RequestCallDownloadResponse, never>("/calls/download", {}),
    onSuccess: () => {
      toast.success("The calls will be sent to your email shortly")
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
            <DialogTitle>Download calls</DialogTitle>
            <DialogDescription>
              You will receive an email with all calls
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
