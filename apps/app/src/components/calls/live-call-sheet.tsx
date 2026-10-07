import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"

import type { CallDetailResponse } from "@workspace/shared/api/calls/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { AgentReferenceLink } from "@/components/agents/agent-reference-link"
import { LiveCallMonitor } from "@/components/calls/live-call-monitor"
import { SheetSkeleton } from "@/components/sheet-skeleton"
import { UserDateTime } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"

function LiveCallBody({
  callId,
  onClose,
}: {
  callId: string
  onClose: () => void
}) {
  const { data: call } = useSuspenseQuery({
    queryKey: ["calls", callId],
    queryFn: () => api.get<CallDetailResponse>(`/calls/${callId}`),
  })

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
        <p className="text-sm text-muted-foreground">Live call</p>
      </SheetHeader>

      <LiveCallMonitor
        callId={callId}
        livekitRoomName={call.livekitRoomName}
        onEnded={onClose}
      />
    </>
  )
}

export function LiveCallSheet({
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
          {callId ? <LiveCallBody callId={callId} onClose={onClose} /> : null}
        </Suspense>
      </SheetContent>
    </Sheet>
  )
}
