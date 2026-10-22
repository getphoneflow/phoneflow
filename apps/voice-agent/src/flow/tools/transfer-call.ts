import { getJobContext, tool } from "@livekit/agents"
import { SIPOutboundConfig } from "@livekit/protocol"
import { RoomServiceClient, SipClient } from "livekit-server-sdk"
import { z } from "zod"

import type { TransferCallTool } from "@workspace/shared/api/agent-config/types"
import type { CallSipConnection } from "@workspace/shared/api/calls/types"
import type { Variables } from "@/flow/variables"
import { completeCall } from "@/lib/calls"
import { env } from "@/lib/env"
import { buildCallTranscript } from "@/lib/transcript"

export function createTransferCallTool(
  config: TransferCallTool,
  variables: Variables,
  sip: CallSipConnection,
  callId: string
) {
  const destinations = config.destinations
    .map(
      (destination) =>
        `- Phone number: ${destination.number} - Use when: ${variables.replace(destination.condition)}`
    )
    .join("\n")
  const [transferNumber, ...otherTransferNumbers] = config.destinations.map(
    (destination) => destination.number
  )

  return tool({
    name: "transfer_call",
    description: `Transfer the call to another phone number when one of the conditions below applies.
Tell the caller you are transferring them, then call this tool with that destination's phone number.

${destinations}`,
    parameters: z.object({
      transfer_number: z
        .enum([transferNumber, ...otherTransferNumbers])
        .describe("The phone number to transfer to"),
    }),
    execute: async ({ transfer_number }, { ctx }) => {
      const job = getJobContext()
      const roomName = job.room.name!

      await ctx.waitForPlayout()

      const sipClient = new SipClient(
        env.LIVEKIT_URL,
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET
      )

      await sipClient.createSipParticipant(
        "",
        transfer_number,
        roomName,
        {
          fromNumber: sip.number,
          participantIdentity: transfer_number,
          waitUntilAnswered: true,
          playDialtone: true,
          ringingTimeout: 30,
        },
        new SIPOutboundConfig({
          hostname: sip.address,
          authUsername: sip.username,
          authPassword: sip.password,
        })
      )

      await completeCall(
        callId,
        "completed",
        buildCallTranscript(ctx.session.history),
        variables.snapshot()
      )

      const roomService = new RoomServiceClient(
        env.LIVEKIT_URL,
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET
      )

      await roomService.removeParticipant(roomName, job.agent!.identity)
    },
  })
}
