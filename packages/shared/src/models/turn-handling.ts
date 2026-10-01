import type { AgentConfig } from "@workspace/shared/api/agent-config/types"

type Endpointing = AgentConfig["turnHandling"]["endpointing"]
type Preemptive = AgentConfig["turnHandling"]["preemptiveGeneration"]
type Interruption = AgentConfig["turnHandling"]["interruption"]

export const DEFAULT_TURN_HANDLING: AgentConfig["turnHandling"] = {
  turnDetection: "stt",
  endpointing: {
    mode: "fixed",
    minDelay: 500,
    maxDelay: 3000,
  },
  preemptiveGeneration: {
    enabled: true,
    preemptiveTts: false,
    maxSpeechDuration: 10_000,
    maxRetries: 3,
  },
  interruption: {
    enabled: true,
    discardAudioIfUninterruptible: true,
    minDuration: 500,
    minWords: 0,
    falseInterruptionTimeout: 2000,
    resumeFalseInterruption: true,
  },
}

export function withEndpointingMode(
  endpointing: Endpointing,
  mode: Endpointing["mode"]
): Endpointing {
  const { minDelay, maxDelay } = endpointing
  if (mode === "fixed") return { mode, minDelay, maxDelay }
  return { mode, minDelay, maxDelay, alpha: 0.9 }
}

export function withPreemptiveEnabled(enabled: boolean): Preemptive {
  if (!enabled) return { enabled: false }
  return DEFAULT_TURN_HANDLING.preemptiveGeneration
}

export function withInterruptionEnabled(enabled: boolean): Interruption {
  if (!enabled) return { enabled: false }
  return DEFAULT_TURN_HANDLING.interruption
}
