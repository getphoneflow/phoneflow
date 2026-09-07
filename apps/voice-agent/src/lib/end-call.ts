import { getJobContext } from "@livekit/agents"
import { RoomServiceClient } from "livekit-server-sdk"

import { env } from "@/lib/env"

export async function endCall() {
  const roomService = new RoomServiceClient(
    env.LIVEKIT_URL,
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET
  )

  const ctx = getJobContext()
  const roomName = ctx.room.name!
  const [participant, monitor] = Array.from(
    ctx.room.remoteParticipants.values()
  )

  if (participant) {
    await roomService.removeParticipant(roomName, participant.identity)
  }

  if (monitor) {
    await roomService.removeParticipant(roomName, monitor.identity)
  }
}
