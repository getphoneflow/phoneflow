import type { tts } from "@livekit/agents"
import * as cartesia from "@livekit/agents-plugin-cartesia"
import * as deepgram from "@livekit/agents-plugin-deepgram"
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs"
import * as fishaudio from "@livekit/agents-plugin-fishaudio"
import * as inworld from "@livekit/agents-plugin-inworld"
import * as mistralai from "@livekit/agents-plugin-mistralai"
import * as openai from "@livekit/agents-plugin-openai"
import * as soniox from "@livekit/agents-plugin-soniox"
import * as xai from "@livekit/agents-plugin-xai"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import { env } from "@/lib/env"

export function TTS(config: AgentConfig["tts"]): tts.TTS {
  const slash = config.model.indexOf("/")
  if (slash === -1) {
    throw new Error(`Invalid TTS model "${config.model}"`)
  }

  const provider = config.model.slice(0, slash)
  const model = config.model.slice(slash + 1)

  switch (provider) {
    case "cartesia":
      return new cartesia.TTS({
        model,
        voice: config.voice,
        language: config.language ?? "en",
        speed: config.speed,
        emotion: config.emotion,
        apiKey: env.CARTESIA_API_KEY,
      })
    case "deepgram":
      return new deepgram.TTS({
        model: config.voice,
        apiKey: env.DEEPGRAM_API_KEY,
        mipOptOut: config.mipOptOut ?? false,
      })
    case "elevenlabs":
      return new elevenlabs.TTS({
        model,
        voiceId: config.voice,
        language: config.language,
        apiKey: env.ELEVEN_API_KEY,
      })
    case "fishaudio":
      return new fishaudio.TTS({
        model,
        voiceId: config.voice,
        apiKey: env.FISHAUDIO_API_KEY,
        latencyMode: config.latencyMode ?? "balanced",
        speed: config.speed,
        volume: config.volume,
      })
    case "inworld":
      return new inworld.TTS({
        model,
        voice: config.voice,
        language: config.language,
        apiKey: env.INWORLD_API_KEY,
      })
    case "mistral":
      return new mistralai.TTS({
        model,
        voice: config.voice,
        apiKey: env.MISTRAL_API_KEY,
      })
    case "openai":
      return new openai.TTS({
        model,
        voice: config.voice as openai.TTSVoices,
        apiKey: env.OPENAI_API_KEY,
        speed: config.speed,
      })
    case "soniox":
      return new soniox.TTS({
        model,
        voice: config.voice,
        language: config.language ?? "en",
        apiKey: env.SONIOX_API_KEY,
      })
    case "xai":
      return new xai.TTS({
        voice: config.voice,
        language: config.language,
        apiKey: env.XAI_API_KEY,
      })
    default:
      throw new Error(`Unsupported TTS provider: ${provider}`)
  }
}
