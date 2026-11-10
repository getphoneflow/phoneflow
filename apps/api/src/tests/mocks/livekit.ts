import { vi } from "vitest"

import type * as livekit from "@/lib/livekit"

// Token signing and key naming are local, so they stay real
const actual = await vi.importActual<typeof livekit>("@/lib/livekit")

export const { createAccessToken, getRecordingKey } = actual

export const removeCallParticipants = vi.fn<
  typeof livekit.removeCallParticipants
>(async () => {})
export const getRecording = vi.fn<typeof livekit.getRecording>(async () => {
  throw new Error("Recording not found")
})
export const startCallRecording = vi.fn<typeof livekit.startCallRecording>(
  async () => {}
)
export const stopCallRecording = vi.fn<typeof livekit.stopCallRecording>(
  async () => null
)
export const provisionInbound = vi.fn<typeof livekit.provisionInbound>(
  async () => {}
)
export const deprovisionInbound = vi.fn<typeof livekit.deprovisionInbound>(
  async () => {}
)
export const clearSipConfig = vi.fn<typeof livekit.clearSipConfig>(
  async () => ({
    deletedDispatchRules: 0,
    deletedInboundTrunks: 0,
    deletedOutboundTrunks: 0,
  })
)
export const placeOutboundCall = vi.fn<typeof livekit.placeOutboundCall>(
  async () => {}
)
