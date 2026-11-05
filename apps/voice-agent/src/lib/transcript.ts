import type { ChatContext } from "@livekit/agents"

import type { CallTranscript } from "@workspace/shared/api/calls/types"

export function buildCallTranscript(history: ChatContext): CallTranscript {
  return history.items
    .flatMap((item) => {
      if (item.type !== "message") return []
      if (item.role !== "user" && item.role !== "assistant") return []

      const content = item.textContent?.trim()
      const startedSpeakingAt = item.metrics.startedSpeakingAt
      if (!content || content === "..." || startedSpeakingAt == null) return []

      return [
        {
          id: item.id,
          role: item.role,
          content,
          createdAt: Math.round(startedSpeakingAt * 1000),
        },
      ]
    })
    .sort((a, b) => a.createdAt - b.createdAt)
}
