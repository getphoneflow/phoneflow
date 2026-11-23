import type { AgentConfig } from "@workspace/shared/api/agent-config/types"

export function createDefaultAgentConfig(): AgentConfig {
  return {
    stt: {
      model: "assemblyai/universal-3-5-pro",
      language: "en",
      keyterms: [],
      mode: "balanced",
      vadThreshold: 0.5,
      minTurnSilence: 0,
      maxTurnSilence: 3000,
      endOfTurnConfidenceThreshold: 0.5,
      voiceFocus: "near-field",
      voiceFocusThreshold: 0.5,
      agentContextCarryover: false,
      diarize: false,
    },
    llm: {
      model: "wafer/GLM-5.3",
      temperature: 0,
      maxTokens: 4096,
      toolChoice: "auto",
      reasoningEffort: "none",
    },
    tts: {
      model: "fishaudio/s2.1-pro",
      voice: "3b480f554a5b4ab9a6bc62d6ebd7c98a",
      latencyMode: "balanced",
      speed: 1,
      volume: 0,
    },
    turnHandling: {
      turnDetection: "stt",
      endpointing: {
        mode: "fixed",
        minDelay: 500,
        maxDelay: 3000,
      },
      preemptiveGeneration: {
        enabled: true,
        preemptiveTts: false,
        maxSpeechDuration: 10000,
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
    },
    call: {
      maxDurationSec: 1800,
      idleTimeoutSec: 10,
      maxIdleMessages: 2,
      endOnSilenceSec: 300,
    },
    globalPrompt: "You are a helpful assistant",
    timezone: "America/New_York",
    dynamicVariables: [],
    tools: [],
    nodes: [
      {
        id: "conversation",
        type: "conversation",
        position: { x: 0, y: 0 },
        data: {
          name: "Greeting",
          isStart: true,
          startSpeaker: "agent",
          instructions: {
            type: "prompt",
            text: "Greet the user and ask how you can help",
          },
        },
      },
      {
        id: "end",
        type: "end",
        position: { x: 0, y: 250 },
        data: {
          name: "End Call",
        },
      },
    ],
    edges: [
      {
        id: "edge",
        source: "conversation",
        target: "end",
        data: {
          condition: {
            type: "prompt",
            prompt: "Conversation completed",
          },
        },
      },
    ],
  }
}
