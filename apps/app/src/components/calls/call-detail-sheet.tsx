import type { ReceivedMessage } from "@livekit/components-react"
import { useQuery } from "@tanstack/react-query"

import type {
  CallDetailResponse,
  CallListResponse,
} from "@workspace/shared/api/calls/types"
import { AgentChatTranscript } from "@workspace/ui/components/agents-ui/agent-chat-transcript"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Spinner } from "@workspace/ui/components/spinner"
import { CallRecordingPlayer } from "@/components/calls/call-recording-player"
import { api } from "@/lib/api"

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

const secondsFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

type CallDetailSheetProps = {
  call: CallListResponse[number]
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0">
        <SheetHeader>
          <SheetTitle>{call.agent?.name}</SheetTitle>
          <SheetDescription>
            {dateFormatter.format(new Date(call.startedAt))}
            {call.durationMs !== null
              ? ` - ${secondsFormatter.format(call.durationMs / 1000)}s`
              : null}
          </SheetDescription>
          <div className="mt-2">
            <CallRecordingPlayer callId={call.id} />
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
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
      </SheetContent>
    </Sheet>
  )
}
