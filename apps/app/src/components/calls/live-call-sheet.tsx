import type { CallListItem } from "@workspace/shared/api/calls/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { AgentReferenceLink } from "@/components/agents/agent-reference-link"
import { LiveCallMonitor } from "@/components/calls/live-call-monitor"
import { UserDateTime } from "@/components/user-timezone-provider"

type LiveCallSheetProps = {
  call: CallListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LiveCallSheet({
  call,
  open,
  onOpenChange,
}: LiveCallSheetProps) {
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
          <p className="text-sm text-muted-foreground">Live call</p>
        </SheetHeader>

        {open && (
          <LiveCallMonitor
            callId={call.id}
            livekitRoomName={call.livekitRoomName}
            onEnded={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
