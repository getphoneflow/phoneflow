import {
  type AgentState,
  type ReceivedMessage,
} from "@livekit/components-react"
import { cn } from "cn"
import { ArrowDownIcon } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { type ComponentProps, useCallback } from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

import { AgentChatIndicator } from "@workspace/ui/components/agents-ui/agent-chat-indicator"
import { Button } from "@workspace/ui/components/button"

function messageSpacing(
  index: number,
  origin: "user" | "assistant",
  messages: ReceivedMessage[]
) {
  const next = messages[index + 1]
  if (!next) return "mb-5"

  const nextOrigin = next.from?.isLocal ? "user" : "assistant"
  return nextOrigin === origin ? "mb-2" : "mb-5"
}

function TranscriptMessages({
  agentState,
  messages,
}: {
  agentState?: AgentState
  messages: ReceivedMessage[]
}) {
  const { scrollRef, contentRef } = useStickToBottomContext()

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div ref={contentRef} className="flex flex-col px-4 py-4">
        {messages.map((msg, index) => {
          const origin = msg.from?.isLocal ? "user" : "assistant"

          return (
            <div
              key={msg.id}
              title={new Date(msg.timestamp).toLocaleTimeString(undefined, {
                timeStyle: "full",
              })}
              className={cn(
                "flex flex-col",
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
            </div>
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
}

export function AgentChatTranscript({
  agentState,
  messages = [],
  className,
  initial = "smooth",
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
      <TranscriptMessages agentState={agentState} messages={messages} />
      <ScrollToBottomButton />
    </StickToBottom>
  )
}
