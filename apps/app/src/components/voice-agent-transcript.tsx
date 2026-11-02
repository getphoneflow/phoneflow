import {
  useAgent,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react"
import { useEffect } from "react"

import { AgentChatTranscript } from "@workspace/ui/components/agents-ui/agent-chat-transcript"
import { useAgentStore } from "@/stores/agent"

export function VoiceAgentTranscript() {
  const { state, attributes } = useAgent()
  const session = useSessionContext()
  const { messages } = useSessionMessages(session)
  const setActiveNodeId = useAgentStore((store) => store.setActiveNodeId)
  const activeNodeId = attributes.active_node_id

  useEffect(() => {
    setActiveNodeId(activeNodeId)
    return () => setActiveNodeId(null)
  }, [activeNodeId, setActiveNodeId])

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
