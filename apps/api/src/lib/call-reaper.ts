// Longer than the agent's completion retries (at most 40s), so a call whose room
// just closed is not failed while its completion is still on the way.
const ROOM_GONE_GRACE_MS = 60_000

export function selectCallsToReap<
  T extends { id: string; livekitRoomName: string },
>(
  calls: T[],
  liveRoomNames: Set<string>,
  previousGoneSince: Map<string, number>,
  now: number
) {
  const expired: T[] = []
  const goneSince = new Map<string, number>()

  for (const call of calls) {
    if (liveRoomNames.has(call.livekitRoomName)) {
      continue
    }

    const since = previousGoneSince.get(call.id) ?? now

    if (now - since >= ROOM_GONE_GRACE_MS) {
      expired.push(call)
    } else {
      goneSince.set(call.id, since)
    }
  }

  return { expired, goneSince }
}
