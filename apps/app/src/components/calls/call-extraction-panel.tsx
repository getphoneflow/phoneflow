import { useMutation, useQueryClient } from "@tanstack/react-query"
import { RefreshCwIcon } from "lucide-react"

import type {
  CallExtractionRun,
  RerunCallExtractionResponse,
} from "@workspace/shared/api/call-extractions/types"
import type { CallDetailResponse } from "@workspace/shared/api/calls/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

function ExtractionValue({
  entry,
}: {
  entry: CallExtractionRun["results"][number]
}) {
  const { t } = useTranslation()

  if (entry.status === "pending") {
    return (
      <span className="text-sm text-muted-foreground">
        {t("components.calls.call_detail_sheet.extraction.pending")}
      </span>
    )
  }

  if (entry.status === "failed") {
    return (
      <span className="text-sm text-destructive">
        {t("components.calls.call_detail_sheet.extraction.failed")}
      </span>
    )
  }

  return (
    <p className="text-sm break-all">
      {entry.value === null
        ? t("components.calls.call_detail_sheet.extraction.empty")
        : String(entry.value)}
    </p>
  )
}

export function CallExtractionPanel({ call }: { call: CallDetailResponse }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canRerun = useCheckPermission({ callExtraction: ["update"] })
  const hasTranscript = (call.transcript?.length ?? 0) > 0
  const results = call.extraction?.results ?? []

  const rerun = useMutation({
    mutationFn: () =>
      api.post<RerunCallExtractionResponse, Record<string, never>>(
        `/calls/${call.id}/extraction/rerun`,
        { body: {} }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls", call.id] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      {hasTranscript ? (
        <div>
          <Button
            variant="outline"
            size="xs"
            disabled={!canRerun || rerun.isPending}
            onClick={() => rerun.mutate()}
          >
            {rerun.isPending ? <Spinner /> : <RefreshCwIcon />}
            {t("components.calls.call_detail_sheet.extraction.rerun")}
          </Button>
        </div>
      ) : null}
      {results.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-muted-foreground">
            {t("components.calls.call_detail_sheet.extraction.empty_run")}
          </p>
        </div>
      ) : (
        results.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{entry.name}</span>
              <Badge
                variant={
                  entry.status === "failed" ? "destructive" : "secondary"
                }
              >
                {t(
                  `components.calls.call_detail_sheet.extraction.status.${entry.status}`
                )}
              </Badge>
            </div>
            <ExtractionValue entry={entry} />
          </div>
        ))
      )}
    </div>
  )
}
