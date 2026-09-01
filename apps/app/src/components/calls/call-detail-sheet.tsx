import type { ReceivedMessage } from "@livekit/components-react"
import { useQuery } from "@tanstack/react-query"

import type {
  CallDetailResponse,
  CallListItem,
} from "@workspace/shared/api/calls/types"
import { AgentChatTranscript } from "@workspace/ui/components/agents-ui/agent-chat-transcript"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { AgentReferenceLink } from "@/components/agents/agent-reference-link"
import { CallCostBreakdown } from "@/components/calls/call-cost-breakdown"
import { CallRecordingPlayer } from "@/components/calls/call-recording-player"
import { UserDateTime } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"

const secondsFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

type CallDetailSheetProps = {
  call: CallListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CallDetailSheet({
  call,
  open,
  onOpenChange,
}: CallDetailSheetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["calls", call.id],
    queryFn: () => api.get<CallDetailResponse>(`/calls/${call.id}`),
    enabled: open,
  })

  const messages = (data?.transcript ?? []).map(
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0">
        <SheetHeader>
          <SheetTitle className="pr-8">
            <UserDateTime value={call.startedAt} /> {channelLabel}
          </SheetTitle>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">Agent: </span>
            <AgentReferenceLink
              agentId={call.agentId}
              agent={call.agent}
              className="font-medium hover:underline"
            />
            <span className="text-muted-foreground">· {versionLabel}</span>
          </div>
          {call.durationMs && (
            <p className="text-sm text-muted-foreground">
              Duration: {secondsFormatter.format(call.durationMs / 1000)}s
            </p>
          )}
          <div className="mt-2">
            <CallRecordingPlayer callId={call.id} />
          </div>
        </SheetHeader>

        <Tabs defaultValue="transcript" className="min-h-0 flex-1">
          <div className="px-4">
            <TabsList className="w-full">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="cost">Cost</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="transcript" className="flex min-h-0 flex-col">
            {isLoading ? (
              <div className="p-4 h-full w-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : messages.length === 0 ? (
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
                    <span className="text-right text-sm break-all">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent
            value="cost"
            className="flex min-h-0 flex-col overflow-y-auto"
          >
            <CallCostBreakdown call={call} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
