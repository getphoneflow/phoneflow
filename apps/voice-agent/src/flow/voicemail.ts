import { voice } from "@livekit/agents"

import { AMD_PROMPT } from "@/flow/prompts"

// A person who answers and says nothing hears silence for this long.
const NO_SPEECH_TIMEOUT_MS = 4_500
// Caps the silence when the classifier stays uncertain about what a person said.
const DETECTION_TIMEOUT_MS = 10_000

// Once speech is heard, AMD waits for it to end however long that takes, so
// continuous noise or hold music would otherwise keep the agent silent forever.
export const MAX_DETECTION_MS = 30_000

export function createVoicemailDetector(
  session: voice.AgentSession,
  participantIdentity: string
) {
  return new voice.AMD(session, {
    // null reuses the session's models. Leaving these undefined would select
    // LiveKit Cloud inference whenever LIVEKIT_URL points at LiveKit Cloud.
    llm: null,
    stt: null,
    noSpeechTimeoutMs: NO_SPEECH_TIMEOUT_MS,
    detectionTimeoutMs: DETECTION_TIMEOUT_MS,
    prompt: AMD_PROMPT,
    participantIdentity,
    suppressCompatibilityWarning: true,
  })
}

export function isVoicemail(prediction: voice.AMDPredictionEvent) {
  return (
    prediction.category === voice.AMDCategory.MACHINE_VM ||
    prediction.category === voice.AMDCategory.MACHINE_UNAVAILABLE
  )
}
