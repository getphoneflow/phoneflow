import { getJobContext, tool } from "@livekit/agents"
import { z } from "zod"

import type { IvrNavigationTool } from "@workspace/shared/api/agent-config/types"
import type { Variables } from "@/flow/variables"

const DTMF_GAP_MS = 300

function codeFor(digit: string) {
  if (digit === "*") {
    return 10
  }
  if (digit === "#") {
    return 11
  }
  return Number(digit)
}

export function createSendDtmfTool(
  config: IvrNavigationTool,
  variables: Variables
) {
  return tool({
    name: "send_dtmf",
    description: variables.replace(config.description),
    parameters: z.object({
      digits: z
        .string()
        .regex(/^[0-9*#]+$/)
        .describe("The keypad digits to send, such as 1 or 123#"),
    }),
    execute: async ({ digits }) => {
      const participant = getJobContext().room.localParticipant

      for (const digit of digits) {
        await participant?.publishDtmf(codeFor(digit), digit)
        await new Promise((resolve) => setTimeout(resolve, DTMF_GAP_MS))
      }

      return "Sent the keypad tones"
    },
  })
}
