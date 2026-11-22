import type { ChatContext, JobContext } from "@livekit/agents"

import { callTranscriptItemSchema } from "@workspace/shared/api/calls/schemas"
import { compareCallTranscriptItems } from "@workspace/shared/api/calls/transcript"
import type {
  CallTranscript,
  CallTranscriptItem,
} from "@workspace/shared/api/calls/types"
import { parseJsonObject } from "@/lib/json"

export class Transcript {
  private readonly transitions: CallTranscriptItem[] = []
  private readonly room: JobContext["room"]

  constructor(room: JobContext["room"]) {
    this.room = room
  }

  onToolsExecuted(event: {
    functionCalls: Array<{
      id: string
      name: string
      args: string
      createdAt: number
    }>
  }) {
    for (const call of event.functionCalls) {
      if (call.name.startsWith("notify_condition_")) continue

      this.publish({
        type: "tool_call",
        id: call.id,
        name: call.name,
        args: parseJsonObject(call.args),
        createdAt: call.createdAt,
      })
    }
  }

  transition(node: { id: string; name: string }) {
    const item: CallTranscriptItem = {
      type: "transition",
      id: crypto.randomUUID(),
      nodeId: node.id,
      nodeName: node.name,
      createdAt: Date.now(),
    }
    this.transitions.push(item)
    this.publish(item)
  }

  build(history: ChatContext): CallTranscript {
    const items: CallTranscript = []

    for (const item of history.items) {
      if (item.type === "message") {
        if (item.role !== "user" && item.role !== "assistant") continue

        const content = item.textContent?.trim()
        const startedSpeakingAt = item.metrics.startedSpeakingAt
        if (!content || content === "..." || startedSpeakingAt == null) continue

        items.push({
          type: "message",
          id: item.id,
          role: item.role,
          content,
          createdAt: Math.round(startedSpeakingAt * 1000),
        })
        continue
      }

      if (item.type !== "function_call") continue
      if (item.name.startsWith("notify_condition_")) continue

      items.push({
        type: "tool_call",
        id: item.id,
        name: item.name,
        args: parseJsonObject(item.args),
        createdAt: item.createdAt,
      })
    }

    return [...items, ...this.transitions].sort(compareCallTranscriptItems)
  }

  private publish(item: CallTranscriptItem) {
    this.room.localParticipant
      ?.sendText(JSON.stringify(callTranscriptItemSchema.parse(item)), {
        topic: "lk.transcript_event",
      })
      .catch(() => {})
  }
}
