import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { PauseIcon, PlayIcon, XIcon } from "lucide-react"
import { useState } from "react"

import type {
  BatchCallActionResponse,
  BatchCallDetailResponse,
  BatchCallSchedule,
} from "@workspace/shared/api/batch-calls/types"
import { Badge } from "@workspace/ui/components/badge"
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
import { BatchCallRecipientsTable } from "@/components/batch-calls/batch-call-recipients-table"
import {
  batchCallStatusLabels,
  pauseReasonLabel,
  recipientStatusLabels,
} from "@/components/batch-calls/batch-call-status"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { type TFunction, useTranslation } from "@/lib/i18n"

const LIVE_REFETCH_MS = 5000

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

function formatSchedule(schedule: BatchCallSchedule, t: TFunction) {
  const days = WEEK_ORDER.filter((day) => schedule.days.includes(day))
    .map((day) => t(`common.weekdays_short.${day}`))
    .join(", ")

  return `${days} · ${schedule.startTime}-${schedule.endTime} · ${schedule.timezone}`
}

function isLive(batchCall: BatchCallDetailResponse) {
  return (
    batchCall.status === "scheduled" ||
    batchCall.status === "running" ||
    batchCall.counts.dialing + batchCall.counts.in_progress > 0
  )
}

export function batchCallRefetchInterval(
  batchCall: BatchCallDetailResponse | undefined
) {
  return batchCall && isLive(batchCall) ? LIVE_REFETCH_MS : false
}

function BatchCallActions({
  batchCall,
}: {
  batchCall: BatchCallDetailResponse
}) {
  const { t } = useTranslation()
  const canManage = useCheckPermission({ calls: ["create"] })
  const queryClient = useQueryClient()
  const [cancelOpen, setCancelOpen] = useState(false)

  const actionMutation = useMutation({
    mutationFn: (action: "pause" | "resume" | "cancel") =>
      api.post<BatchCallActionResponse, never>(
        `/batch-calls/${batchCall.id}/${action}`,
        {}
      ),
    onSuccess: () => {
      setCancelOpen(false)
      queryClient.invalidateQueries({ queryKey: ["batch-calls"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const canCancel = ["scheduled", "running", "paused"].includes(
    batchCall.status
  )

  return (
    <div className="flex items-center gap-2">
      {batchCall.status === "running" && (
        <Button
          variant="outline"
          disabled={!canManage || actionMutation.isPending}
          onClick={() => actionMutation.mutate("pause")}
        >
          <PauseIcon />
          {t("components.batch_calls.batch_call_detail.actions.pause")}
        </Button>
      )}
      {batchCall.status === "paused" && (
        <Button
          variant="outline"
          disabled={!canManage || actionMutation.isPending}
          onClick={() => actionMutation.mutate("resume")}
        >
          <PlayIcon />
          {t("components.batch_calls.batch_call_detail.actions.resume")}
        </Button>
      )}
      {canCancel && (
        <>
          <Button
            variant="outline"
            disabled={!canManage || actionMutation.isPending}
            onClick={() => setCancelOpen(true)}
          >
            <XIcon />
            {t("components.batch_calls.batch_call_detail.actions.cancel")}
          </Button>
          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t(
                    "components.batch_calls.batch_call_detail.cancel_dialog.title"
                  )}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    "components.batch_calls.batch_call_detail.cancel_dialog.description"
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  {t(
                    "components.batch_calls.batch_call_detail.cancel_dialog.keep"
                  )}
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("cancel")}
                >
                  {actionMutation.isPending ? (
                    <Spinner />
                  ) : (
                    t(
                      "components.batch_calls.batch_call_detail.cancel_dialog.confirm"
                    )
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

function BatchCallProgress({
  batchCall,
}: {
  batchCall: BatchCallDetailResponse
}) {
  const { t } = useTranslation()
  const labels = recipientStatusLabels(t)
  const { counts } = batchCall
  const settled =
    counts.completed + counts.no_answer + counts.failed + counts.cancelled
  const percent =
    batchCall.totalCount > 0
      ? Math.round((settled / batchCall.totalCount) * 100)
      : 0

  return (
    <div className="rounded-md border p-4">
      <div className="mb-2 flex items-center justify-between text-sm font-medium">
        <span>{t("components.batch_calls.batch_call_detail.progress")}</span>
        <span>
          {settled} / {batchCall.totalCount}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((status) => (
          <div key={status}>
            <dt className="text-xs text-muted-foreground">{labels[status]}</dt>
            <dd className="text-lg font-medium tabular-nums">
              {counts[status]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function BatchCallDetail({
  batchCall,
}: {
  batchCall: BatchCallDetailResponse
}) {
  const { t } = useTranslation()
  const statusLabel = batchCallStatusLabels(t)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <Badge variant="secondary">{statusLabel[batchCall.status]}</Badge>
          <span>
            {t("components.batch_calls.batch_call_detail.max_concurrent", {
              count: batchCall.maxConcurrentCalls,
            })}
          </span>
          <span>
            {batchCall.schedule
              ? formatSchedule(batchCall.schedule, t)
              : t("components.batch_calls.batch_call_detail.no_schedule")}
          </span>
          <Link
            to="/calls"
            search={{ batchId: batchCall.id }}
            className="underline underline-offset-4"
          >
            {t("components.batch_calls.batch_call_detail.view_calls")}
          </Link>
        </div>
        <BatchCallActions batchCall={batchCall} />
      </div>

      {batchCall.status === "paused" && batchCall.pauseReason && (
        <p className="rounded-md border p-3 text-sm">
          {pauseReasonLabel(batchCall.pauseReason, t)}
        </p>
      )}

      <BatchCallProgress batchCall={batchCall} />

      <BatchCallRecipientsTable
        batchCallId={batchCall.id}
        refetchInterval={batchCallRefetchInterval(batchCall)}
      />
    </div>
  )
}
