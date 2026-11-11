import type { ReceivedMessage } from "@livekit/components-react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense, useState } from "react"

import type { CallDetailResponse } from "@workspace/shared/api/calls/types"
import { AgentChatTranscript } from "@workspace/ui/components/agents-ui/agent-chat-transcript"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { AgentReferenceLink } from "@/components/agents/agent-reference-link"
import { CallCostBreakdown } from "@/components/calls/call-cost-breakdown"
import { CallRecordingPlayer } from "@/components/calls/call-recording-player"
import { SheetSkeleton } from "@/components/sheet-skeleton"
import { UserDateTime } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"
import { env } from "@/lib/env"
import { useTranslation } from "@/lib/i18n"
import { formatDurationMs } from "@/lib/time"

function CallDetailBody({ callId }: { callId: string }) {
  const { t } = useTranslation()
  const { data: call } = useSuspenseQuery({
    queryKey: ["calls", callId],
    queryFn: () => api.get<CallDetailResponse>(`/calls/${callId}`),
  })

  const [position, setPosition] = useState<{ time: number }>()
  const startedAt = new Date(call.startedAt).getTime()
  const recordingStartedAt = new Date(call.recordingStartedAt!).getTime()
  const recordingOffset = (recordingStartedAt - startedAt) / 1000

  function onMessageClick(timestamp: number) {
    setPosition({ time: Math.max(0, (timestamp - startedAt) / 1000) })
  }

  const messages = (call.transcript ?? []).map(
    (item) =>
      ({
        id: item.id,
        timestamp: item.createdAt,
        type: item.role === "user" ? "userTranscript" : "agentTranscript",
        message: item.content,
        from: { isLocal: item.role === "user" },
      }) as ReceivedMessage
  )

  const variables = Object.entries(call.variables ?? {})
  const channelLabel =
    call.channel === "phone_call"
      ? t("components.calls.call_detail_sheet.channel.phone_call")
      : t("components.calls.call_detail_sheet.channel.web_call")
  const versionLabel = call.agentVersion
    ? t("components.calls.call_detail_sheet.version", {
        number: call.agentVersion.number,
      })
    : t("components.calls.call_detail_sheet.latest_version")

  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-8">
          <UserDateTime value={call.startedAt} /> {channelLabel}
        </SheetTitle>
        {call.channel === "phone_call" ? (
          <div className="text-sm text-muted-foreground">
            <p>
              {t("components.calls.call_detail_sheet.from")}{" "}
              <span className="font-medium text-foreground">
                {call.fromNumber}
              </span>
              {" · "}
              {t("components.calls.call_detail_sheet.to")}{" "}
              <span className="font-medium text-foreground">
                {call.toNumber}
              </span>
            </p>
          </div>
        ) : null}
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">
            {t("components.calls.call_detail_sheet.agent")}{" "}
          </span>
          <AgentReferenceLink
            agentId={call.agentId}
            agent={call.agent}
            agentVersionId={call.agentVersionId}
            className="font-medium hover:underline"
          />
          <span className="text-muted-foreground">· {versionLabel}</span>
        </div>
        {call.durationMs && (
          <p className="text-sm text-muted-foreground">
            {t("components.calls.call_detail_sheet.duration", {
              duration: formatDurationMs(call.durationMs),
            })}
          </p>
        )}
        <div className="mt-2">
          <CallRecordingPlayer
            callId={callId}
            position={position}
            recordingOffset={recordingOffset}
          />
        </div>
      </SheetHeader>

      <Tabs
        defaultValue="transcript"
        className="min-h-0 flex-1 overflow-hidden"
      >
        <div className="shrink-0 px-4">
          <TabsList className="w-full">
            <TabsTrigger value="transcript">
              {t("components.calls.call_detail_sheet.tabs.transcript")}
            </TabsTrigger>
            <TabsTrigger value="data">
              {t("components.calls.call_detail_sheet.tabs.data")}
            </TabsTrigger>
            {env.IS_CLOUD ? (
              <TabsTrigger value="cost">
                {t("components.calls.call_detail_sheet.tabs.cost")}
              </TabsTrigger>
            ) : null}
          </TabsList>
        </div>
        <TabsContent
          value="transcript"
          className="flex min-h-0 flex-col overflow-hidden"
        >
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {t("components.calls.call_detail_sheet.no_transcript")}
              </p>
            </div>
          ) : (
            <AgentChatTranscript
              messages={messages}
              initial={false}
              startedAt={startedAt}
              onMessageClick={onMessageClick}
            />
          )}
        </TabsContent>
        <TabsContent
          value="data"
          className="flex min-h-0 flex-col overflow-y-auto"
        >
          {variables.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {t("components.calls.call_detail_sheet.no_variables")}
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-4 font-medium">
                {t("components.calls.call_detail_sheet.dynamic_variables")}
              </div>
              {variables.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 pb-2">
                  <span className="text-sm text-muted-foreground">{key}</span>
                  <span className="text-right text-sm break-all">{value}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        {env.IS_CLOUD ? (
          <TabsContent
            value="cost"
            className="flex min-h-0 flex-col overflow-y-auto"
          >
            <CallCostBreakdown call={call} />
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  )
}

export function CallDetailSheet({
  callId,
  open,
  onClose,
}: {
  callId?: string
  open: boolean
  onClose: () => void
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <SheetContent className="gap-0 overflow-hidden">
        <Suspense fallback={<SheetSkeleton />}>
          {callId ? <CallDetailBody callId={callId} /> : null}
        </Suspense>
      </SheetContent>
    </Sheet>
  )
}
