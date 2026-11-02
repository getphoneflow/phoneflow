import {
  useAgent,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react"

import { AgentChatTranscript } from "@workspace/ui/components/agents-ui/agent-chat-transcript"

export function VoiceAgentTranscript() {
  const { state } = useAgent()
  const session = useSessionContext()
  const { messages } = useSessionMessages(session)

  const startedAt =
    messages.length === 0
      ? 0
      : Math.min(...messages.map((message) => message.timestamp))

  return (
    <AgentChatTranscript
      agentState={state}
      messages={messages}
      startedAt={startedAt}
    />
  )
}
