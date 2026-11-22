import {
  useAgent,
  useSessionContext,
  useSessionMessages,
  useTextStream,
} from "@livekit/components-react"
import { useEffect, useMemo } from "react"

import { callTranscriptItemSchema } from "@workspace/shared/api/calls/schemas"
import { compareCallTranscriptItems } from "@workspace/shared/api/calls/transcript"
import type { CallTranscript } from "@workspace/shared/api/calls/types"
import { AgentChatTranscript } from "@workspace/ui/components/agents-ui/agent-chat-transcript"
import { useAgentStore } from "@/stores/agent"

export function VoiceAgentTranscript() {
  const agent = useAgent()
  const session = useSessionContext()
  const { messages } = useSessionMessages(session)
  const { textStreams } = useTextStream("lk.transcript_event", {
    room: session.room,
  })
  const setActiveNodeId = useAgentStore((store) => store.setActiveNodeId)
  const activeNodeId = agent.attributes.active_node_id
  const agentIdentity = agent.internal.agentParticipant?.identity
  const workerIdentity = agent.internal.workerParticipant?.identity

  useEffect(() => {
    setActiveNodeId(activeNodeId)
    return () => setActiveNodeId(null)
  }, [activeNodeId, setActiveNodeId])

  const transcript = useMemo(() => {
    const speech: CallTranscript = messages.flatMap((message) => {
      const content = message.message.trim()
      if (!content) return []

      const role =
        message.from?.isAgent ||
        (agentIdentity != null && message.from?.identity === agentIdentity) ||
        (workerIdentity != null && message.from?.identity === workerIdentity)
          ? "assistant"
          : "user"

      return [
        {
          type: "message" as const,
          id: message.id,
          role,
          content,
          createdAt: message.timestamp,
        },
      ]
    })

    const events: CallTranscript = textStreams.flatMap((stream) => {
      try {
        const parsed = callTranscriptItemSchema.safeParse(
          JSON.parse(stream.text)
        )
        if (!parsed.success || parsed.data.type === "message") return []
        return [parsed.data]
      } catch {
        return []
      }
    })

    return [...speech, ...events].sort(compareCallTranscriptItems)
  }, [messages, textStreams, agentIdentity, workerIdentity])

  const startedAt =
    transcript.length === 0
      ? 0
      : Math.min(...transcript.map((item) => item.createdAt))

  return (
    <AgentChatTranscript
      agentState={agent.state}
      transcript={transcript}
      startedAt={startedAt}
    />
  )
}
