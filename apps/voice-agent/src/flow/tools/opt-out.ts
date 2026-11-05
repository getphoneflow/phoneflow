import { setTimeout as delay } from "node:timers/promises"
import { log, tool } from "@livekit/agents"

import type { OptOutConfig } from "@workspace/shared/api/agent-config/types"
import type {
  AddCallToDoNotCallRequest,
  AddCallToDoNotCallResponse,
} from "@workspace/shared/api/do-not-call/types"
import type { Variables } from "@/flow/variables"
import { api } from "@/lib/api"
import { endCall } from "@/lib/end-call"

const REQUEST_TIMEOUT_MS = 3_000
const RETRY_DELAY_MS = 500
const MAX_ATTEMPTS = 3

// The route is idempotent, and a lost opt-out means calling someone who asked
// not to be called, so a few seconds of silence is the better failure.
async function addCallToDoNotCall(callId: string) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await api.post<AddCallToDoNotCallResponse, AddCallToDoNotCallRequest>(
        "/do-not-call/from-call",
        {
          body: { callId },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      )
      return true
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        log().error(
          { err: error, callId },
          "failed to add caller to do-not-call list"
        )
        return false
      }
      await delay(RETRY_DELAY_MS)
    }
  }

  return false
}

export function createOptOutTool(
  config: OptOutConfig,
  variables: Variables,
  callId: string
) {
  return tool({
    name: "add_to_do_not_call",
    description:
      "Add the caller's phone number to the do-not-call list. Call this only when the caller clearly asks not to be called again.",
    execute: async (_args, { ctx }) => {
      // Recorded before any playout: the caller talking over the agent cancels
      // the tool's turn, and that must not lose the opt-out.
      const recorded = await addCallToDoNotCall(callId)

      await ctx.waitForPlayout()

      // The configured message and hanging up both assume the removal happened.
      if (!recorded) {
        return "The caller's number could not be added to the do-not-call list. Tell them you could not confirm the removal, and do not say they were removed."
      }

      if (config.message) {
        await ctx.session
          .say(variables.replace(config.message), {
            allowInterruptions: false,
          })
          .waitForPlayout()
      }

      if (config.action === "end_call") {
        await endCall()
        return
      }

      if (config.message) {
        return
      }

      return "The caller's number is now on the do-not-call list. Acknowledge it briefly and do not try to change their mind."
    },
  })
}
