import type { AgentConfig } from "@workspace/shared/api/agent-config/types"

export function createDefaultAgentConfig(): AgentConfig {
  return {
    stt: {
      model: "soniox/stt-rt-v5",
    },
    llm: {
      model: "cerebras/gemma-4-31b",
    },
    tts: {
      model: "fishaudio/s2.1-pro",
      voice: "3b480f554a5b4ab9a6bc62d6ebd7c98a",
    },
    turnHandling: {
      turnDetection: "stt",
    },
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
