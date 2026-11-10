import { tool } from "@livekit/agents"

import type { SkipTurnTool } from "@workspace/shared/api/agent-config/types"
import type { Variables } from "@/flow/variables"

const DESCRIPTION = `
Skip a turn when the user explicitly indicates they need a moment to think or perform an action.
Do not respond verbally after calling this function, simply wait for the user to speak again.
Use this function when the user asks something like:
- "Give me a second"
- "Let me think"
- "Hold on, let me check"
`

export function createSkipTurnTool(config: SkipTurnTool, variables: Variables) {
  return tool({
    name: "skip_turn",
    description: `${DESCRIPTION}\n\n${variables.replace(config.description)}`,
    // Returning no value keeps the agent silent until the user speaks again.
    execute: async () => undefined,
  })
}
