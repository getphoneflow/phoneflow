import type { CallTranscriptItem } from "./types"

export function compareCallTranscriptItems(
  a: CallTranscriptItem,
  b: CallTranscriptItem
) {
  if (
    a.type === "message" &&
    b.type === "tool_call" &&
    b.id.startsWith(`${a.id}/`)
  ) {
    return -1
  }
  if (
    b.type === "message" &&
    a.type === "tool_call" &&
    a.id.startsWith(`${b.id}/`)
  ) {
    return 1
  }
  return a.createdAt - b.createdAt
}
