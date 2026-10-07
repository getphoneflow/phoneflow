import { useQuery } from "@tanstack/react-query"
import { Globe, PhoneIncoming, PhoneOutgoing } from "lucide-react"
import { type ReactNode, useState } from "react"

import type { CallListItem } from "@workspace/shared/api/calls/types"
import type {
  ContactDetailResponse,
  ContactListItem,
} from "@workspace/shared/api/contacts/types"
import { Badge } from "@workspace/ui/components/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { AgentReferenceLink } from "@/components/agents/agent-reference-link"
import { CallDetailSheet } from "@/components/calls/call-detail-sheet"
import { LiveCallSheet } from "@/components/calls/live-call-sheet"
import { UserDateTime } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"
import { formatDurationMs } from "@/lib/time"

type ContactDetailSheetProps = {
  contact: ContactListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatContactDisplayName(contact: ContactListItem) {
  if (contact.phoneNumber) {
    return contact.phoneNumber
  }
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ")
  if (name) {
    return name
  }
  return "Unknown"
}

function averageDurationMs(contact: ContactListItem) {
  if (contact.callCount <= 0) {
    return 0
  }
  return Math.round(contact.totalDurationMs / contact.callCount)
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function CallCard({
  call,
  onClick,
}: {
  call: CallListItem
  onClick: () => void
}) {
  const isPhone = call.channel === "phone_call"
  const isInbound = call.direction === "inbound"
  const clickable = call.status !== "no_answer"

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-default disabled:opacity-70 disabled:hover:bg-transparent"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isPhone ? (
            isInbound ? (
              <PhoneIncoming className="size-3.5 text-muted-foreground" />
            ) : (
              <PhoneOutgoing className="size-3.5 text-muted-foreground" />
            )
          ) : (
            <Globe className="size-3.5 text-muted-foreground" />
          )}
          <UserDateTime value={call.startedAt} />
        </div>
        <span className="text-xs text-muted-foreground">
          {call.durationMs === null ? null : formatDurationMs(call.durationMs)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {call.status === "in_progress" ? (
          <Badge variant="outline">In progress</Badge>
        ) : call.status === "no_answer" ? (
          <Badge variant="outline">No answer</Badge>
        ) : (
          <Badge variant="secondary">Completed</Badge>
        )}
        <AgentReferenceLink agentId={call.agentId} agent={call.agent} />
        <span className="text-xs text-muted-foreground">
          {call.agentVersion ? `V${call.agentVersion.number}` : "Latest"}
        </span>
      </div>
    </button>
  )
}

export function ContactDetailSheet({
  contact,
  open,
  onOpenChange,
}: ContactDetailSheetProps) {
  const [selectedCall, setSelectedCall] = useState<CallListItem | null>(null)
  const [liveCall, setLiveCall] = useState<CallListItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", contact.id],
    queryFn: () => api.get<ContactDetailResponse>(`/contacts/${contact.id}`),
    enabled: open,
  })

  const detail = data ?? contact
  const callsCount = data?.calls.length ?? detail.callCount

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="pr-8">
              {formatContactDisplayName(detail)}
            </SheetTitle>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Total time</div>
                <div className="font-medium">
                  {formatDurationMs(detail.totalDurationMs)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg / call</div>
                <div className="font-medium">
                  {formatDurationMs(averageDurationMs(detail))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">First call</div>
                <div className="font-medium">
                  {detail.firstCallAt ? (
                    <UserDateTime value={detail.firstCallAt} />
                  ) : null}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last call</div>
                <div className="font-medium">
                  {detail.latestCallAt ? (
                    <UserDateTime value={detail.latestCallAt} />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 divide-y border-y">
              <FieldRow label="Phone" value={detail.phoneNumber} />
              <FieldRow label="First name" value={detail.firstName} />
              <FieldRow label="Last name" value={detail.lastName} />
              <FieldRow label="External ID" value={detail.externalId} />
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium">Calls ({callsCount})</h3>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ) : data && data.calls.length > 0 ? (
                <div className="space-y-2">
                  {data.calls.map((call) => (
                    <CallCard
                      key={call.id}
                      call={call}
                      onClick={() => {
                        if (call.status === "in_progress") {
                          setLiveCall(call)
                          return
                        }
                        if (call.status === "completed") {
                          setSelectedCall(call)
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No calls yet</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {selectedCall && (
        <CallDetailSheet
          call={selectedCall}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setSelectedCall(null)
            }
          }}
        />
      )}
      {liveCall && (
        <LiveCallSheet
          call={liveCall}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setLiveCall(null)
            }
          }}
        />
      )}
    </>
  )
}
