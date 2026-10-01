import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import { DEFAULT_TURN_HANDLING } from "@workspace/shared/models/turn-handling"

export function createDefaultAgentConfig(): AgentConfig {
  return {
    stt: {
      model: "assemblyai/universal-3-5-pro",
    },
    llm: {
      model: "wafer/GLM-5.3",
    },
    tts: {
      model: "fishaudio/s2.1-pro",
      voice: "3b480f554a5b4ab9a6bc62d6ebd7c98a",
    },
    turnHandling: DEFAULT_TURN_HANDLING,
    globalPrompt: "You are a helpful assistant",
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
