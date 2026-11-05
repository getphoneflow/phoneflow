import type { ChatContext } from "@livekit/agents"

import type { CallTranscript } from "@workspace/shared/api/calls/types"

export function buildCallTranscript(history: ChatContext): CallTranscript {
  return history.items
    .flatMap((item) => {
      if (item.type !== "message") return []
      if (item.role !== "user" && item.role !== "assistant") return []

      const content = item.textContent?.trim()
      if (!content || content === "...") return []

      const startedSpeakingAt = item.metrics.startedSpeakingAt
      // A user turn skipped by a voicemail verdict has no metrics, but it is what
      // shows why the call was treated as voicemail. An assistant message without
      // them was never spoken, so it stays out.
      if (startedSpeakingAt == null && item.role === "assistant") return []

      return [
        {
          id: item.id,
          role: item.role,
          content,
          createdAt:
            startedSpeakingAt == null
              ? item.createdAt
              : Math.round(startedSpeakingAt * 1000),
        },
      ]
    })
    .sort((a, b) => a.createdAt - b.createdAt)
}
