import type { AgentState } from "@livekit/components-react"
import { cn } from "cn"
import {
  ArrowDownIcon,
  BracesIcon,
  CornerDownRightIcon,
  KeyboardIcon,
  type LucideIcon,
  PauseIcon,
  PhoneForwardedIcon,
  PhoneOffIcon,
  SearchIcon,
  WrenchIcon,
} from "lucide-react"
import { AnimatePresence } from "motion/react"
import { type ComponentProps, useCallback } from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

import type {
  CallTranscript,
  CallTranscriptItem,
} from "@workspace/shared/api/calls/types"
import { AgentChatIndicator } from "@workspace/ui/components/agents-ui/agent-chat-indicator"
import { Button } from "@workspace/ui/components/button"

const BUILT_IN_TOOLS: Record<string, { label: string; icon: LucideIcon }> = {
  end_call: { label: "End call", icon: PhoneOffIcon },
  extract_variables: { label: "Extract variables", icon: BracesIcon },
  send_dtmf: { label: "IVR navigation", icon: KeyboardIcon },
  skip_turn: { label: "Skip turn", icon: PauseIcon },
  transfer_call: { label: "Transfer call", icon: PhoneForwardedIcon },
  knowledge_base: { label: "Knowledge base", icon: SearchIcon },
}

function formatElapsed(timestamp: number, startedAt: number) {
  const total = Math.max(0, Math.floor((timestamp - startedAt) / 1000))
  const minutes = String(Math.floor(total / 60)).padStart(2, "0")
  const seconds = String(total % 60).padStart(2, "0")
  return `${minutes}:${seconds}`
}

function formatArgs(args: Record<string, unknown>) {
  if (Object.keys(args).length === 0) return null
  return JSON.stringify(args, null, 2)
}

function itemSpacing(index: number, transcript: CallTranscript) {
  const current = transcript[index]
  const next = transcript[index + 1]
  if (!current || !next) return "mb-5"

  if (current.type !== "message" || next.type !== "message") {
    return current.type === next.type ? "mb-2" : "mb-5"
  }

  return current.role === next.role ? "mb-2" : "mb-5"
}

function MessageBubble({
  item,
}: {
  item: Extract<CallTranscriptItem, { type: "message" }>
}) {
  return (
    <div
      className={cn(
        "max-w-full text-sm wrap-break-word whitespace-pre-wrap",
        item.role === "user" &&
          "rounded-lg bg-secondary px-4 py-3 text-foreground"
      )}
    >
      {item.content}
    </div>
  )
}

function ToolCallCard({
  item,
}: {
  item: Extract<CallTranscriptItem, { type: "tool_call" }>
}) {
  const builtIn = BUILT_IN_TOOLS[item.name]
  const Icon = builtIn?.icon ?? WrenchIcon
  const label = builtIn?.label ?? item.name
  const args = formatArgs(item.args)

  return (
    <div className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "truncate text-xs",
            builtIn ? "font-medium" : "font-mono"
          )}
        >
          {label}
        </span>
      </div>
      {args ? (
        <pre className="mt-2 max-h-40 overflow-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80">
          {args}
        </pre>
      ) : null}
    </div>
  )
}

function TransitionCard({
  item,
}: {
  item: Extract<CallTranscriptItem, { type: "transition" }>
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <CornerDownRightIcon className="size-3.5 shrink-0" />
      <span className="truncate">
        Transitioned to <span className="text-foreground">{item.nodeName}</span>
      </span>
    </div>
  )
}

function TranscriptItem({ item }: { item: CallTranscriptItem }) {
  if (item.type === "message") return <MessageBubble item={item} />
  if (item.type === "tool_call") return <ToolCallCard item={item} />
  return <TransitionCard item={item} />
}

function TranscriptItems({
  agentState,
  transcript,
  startedAt,
  onItemClick,
}: {
  agentState?: AgentState
  transcript: CallTranscript
  startedAt: number
  onItemClick?: (timestamp: number) => void
}) {
  const { scrollRef, contentRef } = useStickToBottomContext()

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div ref={contentRef} className="flex flex-col px-4 py-4">
        {transcript.map((item, index) => {
          const content = (
            <div
              className={cn(
                "flex w-full flex-col gap-1",
                item.type === "message" && item.role === "user"
                  ? "items-end"
                  : "items-start",
                itemSpacing(index, transcript)
              )}
            >
              <TranscriptItem item={item} />
              <span className="text-[10px] leading-none tabular-nums text-muted-foreground">
                {formatElapsed(item.createdAt, startedAt)}
              </span>
            </div>
          )

          if (!onItemClick) return content

          return (
            <button
              type="button"
              onClick={() => onItemClick(item.createdAt)}
              className="text-left outline-none"
            >
              {content}
            </button>
          )
        })}
        <AnimatePresence>
          {agentState === "thinking" && <AgentChatIndicator size="sm" />}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()
  const onClick = useCallback(() => {
    scrollToBottom()
  }, [scrollToBottom])

  if (isAtBottom) return null

  return (
    <Button
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full"
      onClick={onClick}
      size="icon"
      type="button"
      variant="outline"
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  )
}

export interface AgentChatTranscriptProps extends ComponentProps<"div"> {
  agentState?: AgentState
  transcript?: CallTranscript | null
  initial?: ComponentProps<typeof StickToBottom>["initial"]
  startedAt: number
  onItemClick?: (timestamp: number) => void
}

export function AgentChatTranscript({
  agentState,
  transcript = [],
  className,
  initial = "smooth",
  startedAt,
  onItemClick,
  ...props
}: AgentChatTranscriptProps) {
  return (
    <StickToBottom
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden",
        className
      )}
      initial={initial}
      resize="smooth"
      role="log"
      {...props}
    >
      <TranscriptItems
        agentState={agentState}
        transcript={transcript ?? []}
        startedAt={startedAt}
        onItemClick={onItemClick}
      />
      <ScrollToBottomButton />
    </StickToBottom>
  )
}
