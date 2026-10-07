import type { ReceivedMessage } from "@livekit/components-react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"

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
import { formatDurationMs } from "@/lib/time"

function CallDetailBody({ callId }: { callId: string }) {
  const { data: call } = useSuspenseQuery({
    queryKey: ["calls", callId],
    queryFn: () => api.get<CallDetailResponse>(`/calls/${callId}`),
  })

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
  const channelLabel = call.channel === "phone_call" ? "Phone call" : "Web call"
  const versionLabel = call.agentVersion
    ? `V${call.agentVersion.number}`
    : "Latest"

  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-8">
          <UserDateTime value={call.startedAt} /> {channelLabel}
        </SheetTitle>
        {call.channel === "phone_call" ? (
          <div className="text-sm text-muted-foreground">
            <p>
              From:{" "}
              <span className="font-medium text-foreground">
                {call.fromNumber}
              </span>
              {" · "}To:{" "}
              <span className="font-medium text-foreground">
                {call.toNumber}
              </span>
            </p>
          </div>
        ) : null}
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">Agent: </span>
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
            Duration: {formatDurationMs(call.durationMs)}
          </p>
        )}
        <div className="mt-2">
          <CallRecordingPlayer callId={callId} />
        </div>
      </SheetHeader>

      <Tabs defaultValue="transcript" className="min-h-0 flex-1">
        <div className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            {env.IS_CLOUD ? <TabsTrigger value="cost">Cost</TabsTrigger> : null}
          </TabsList>
        </div>
        <TabsContent value="transcript" className="flex min-h-0 flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No transcript available
              </p>
            </div>
          ) : (
            <AgentChatTranscript messages={messages} initial={false} />
          )}
        </TabsContent>
        <TabsContent value="data" className="flex min-h-0 flex-col">
          {variables.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">No variables</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-4 font-medium">Dynamic variables</div>
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
      <SheetContent className="gap-0">
        <Suspense fallback={<SheetSkeleton />}>
          {callId ? <CallDetailBody callId={callId} /> : null}
        </Suspense>
      </SheetContent>
    </Sheet>
  )
}
