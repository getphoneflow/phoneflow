import type { AgentState, ReceivedMessage } from "@livekit/components-react"
import { cn } from "cn"
import { ArrowDownIcon } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { type ComponentProps, useCallback } from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

import { AgentChatIndicator } from "@workspace/ui/components/agents-ui/agent-chat-indicator"
import { Button } from "@workspace/ui/components/button"

function messageOrigin(message: ReceivedMessage): "user" | "assistant" {
  if (
    message.from?.isLocal ||
    message.type === "userTranscript" ||
    message.from?.isAgent === false
  ) {
    return "user"
  }
  return "assistant"
}

function formatElapsed(timestamp: number, startedAt: number) {
  const total = Math.max(0, Math.floor((timestamp - startedAt) / 1000))
  const minutes = String(Math.floor(total / 60)).padStart(2, "0")
  const seconds = String(total % 60).padStart(2, "0")
  return `${minutes}:${seconds}`
}

function messageSpacing(
  index: number,
  origin: "user" | "assistant",
  messages: ReceivedMessage[]
) {
  const next = messages[index + 1]
  if (!next) return "mb-5"

  const nextOrigin = messageOrigin(next)
  return nextOrigin === origin ? "mb-2" : "mb-5"
}

function TranscriptMessages({
  agentState,
  messages,
  startedAt,
  onMessageClick,
}: {
  agentState?: AgentState
  messages: ReceivedMessage[]
  startedAt: number
  onMessageClick?: (timestamp: number) => void
}) {
  const { scrollRef, contentRef } = useStickToBottomContext()

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div ref={contentRef} className="flex flex-col px-4 py-4">
        {messages.map((msg, index) => {
          const origin = messageOrigin(msg)
          const content = (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1",
                origin === "user" ? "items-end" : "items-start",
                messageSpacing(index, origin, messages)
              )}
            >
              <div
                className={cn(
                  "max-w-full text-sm wrap-break-word whitespace-pre-wrap",
                  origin === "user" &&
                    "rounded-lg bg-secondary px-4 py-3 text-foreground"
                )}
              >
                {msg.message}
              </div>
              <span className="text-[10px] leading-none tabular-nums text-muted-foreground">
                {formatElapsed(msg.timestamp, startedAt)}
              </span>
            </div>
          )

          if (!onMessageClick) return content

          return (
            <button
              onClick={() => onMessageClick(msg.timestamp)}
              className="text-left"
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
  messages?: ReceivedMessage[]
  initial?: ComponentProps<typeof StickToBottom>["initial"]
  startedAt: number
  onMessageClick?: (timestamp: number) => void
}

export function AgentChatTranscript({
  agentState,
  messages = [],
  className,
  initial = "smooth",
  startedAt,
  onMessageClick,
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
      <TranscriptMessages
        agentState={agentState}
        messages={messages}
        startedAt={startedAt}
        onMessageClick={onMessageClick}
      />
      <ScrollToBottomButton />
    </StickToBottom>
  )
}
