import type { stt } from "@livekit/agents"
import * as assemblyai from "@livekit/agents-plugin-assemblyai"
import * as cartesia from "@livekit/agents-plugin-cartesia"
import * as deepgram from "@livekit/agents-plugin-deepgram"
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs"
import * as inworld from "@livekit/agents-plugin-inworld"
import * as mistralai from "@livekit/agents-plugin-mistralai"
import * as openai from "@livekit/agents-plugin-openai"
import * as soniox from "@livekit/agents-plugin-soniox"
import * as xai from "@livekit/agents-plugin-xai"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import { env } from "@/lib/env"

export function STT(config: AgentConfig["stt"]): stt.STT {
  const slash = config.model.indexOf("/")
  if (slash === -1) {
    throw new Error(`Invalid STT model "${config.model}"`)
  }

  const provider = config.model.slice(0, slash)
  const model = config.model.slice(slash + 1)

  switch (provider) {
    case "assemblyai":
      return new assemblyai.STT({
        apiKey: env.ASSEMBLYAI_API_KEY,
        baseUrl: env.ASSEMBLYAI_BASE_URL || undefined,
        speechModel: model as assemblyai.STTModels,
        mode: config.mode,
        vadThreshold: config.vadThreshold,
        minTurnSilence: config.minTurnSilence,
        maxTurnSilence: config.maxTurnSilence,
        endOfTurnConfidenceThreshold: config.endOfTurnConfidenceThreshold,
        agentContextCarryover: config.agentContextCarryover,
        voiceFocus: config.voiceFocus,
        voiceFocusThreshold: config.voiceFocusThreshold,
        keytermsPrompt: config.keyterms,
        speakerLabels: config.diarize,
      })
    case "cartesia":
      return new cartesia.STT({
        model,
        apiKey: env.CARTESIA_API_KEY,
        language: config.language,
      })
    case "deepgram": {
      if (model.startsWith("flux-")) {
        return new deepgram.STTv2({
          model,
          apiKey: env.DEEPGRAM_API_KEY,
          language: config.language,
          keyterms: config.keyterms ?? [],
          eagerEotThreshold: config.eagerEotThreshold,
          eotThreshold: config.eotThreshold,
          eotTimeoutMs: config.eotTimeoutMs,
          mipOptOut: config.mipOptOut ?? false,
        })
      }

      return new deepgram.STT({
        model,
        apiKey: env.DEEPGRAM_API_KEY,
        language: config.language,
        keyterm: config.keyterms ?? [],
        endpointing: config.endpointingMs,
        diarize: config.diarize,
      })
    }
    case "elevenlabs":
      return new elevenlabs.STT({
        model,
        apiKey: env.ELEVEN_API_KEY,
        languageCode: config.language,
      })
    case "inworld":
      return new inworld.STT({
        model: config.model,
        apiKey: env.INWORLD_API_KEY,
        language: config.language ?? "en-US",
        vadThreshold: config.vadThreshold,
        minEndOfTurnSilenceWhenConfident:
          config.minEndOfTurnSilenceWhenConfident ?? 200,
        endOfTurnConfidenceThreshold:
          config.endOfTurnConfidenceThreshold ?? 0.3,
        enableVoiceProfile: config.enableVoiceProfile ?? true,
        voiceProfileTopN: config.voiceProfileTopN ?? 1,
      })
    case "mistral":
      return new mistralai.STT({
        model,
        apiKey: env.MISTRAL_API_KEY,
        language: config.language,
      })
    case "openai":
      return new openai.STT({
        model,
        apiKey: env.OPENAI_API_KEY,
        language: config.language,
        keywords: config.keyterms,
      })
    case "ovhcloud":
      return openai.STT.withOVHcloud({
        model,
        apiKey: env.OVHCLOUD_API_KEY,
        language: config.language,
      })
    case "soniox":
      return new soniox.STT({
        model,
        apiKey: env.SONIOX_API_KEY,
        languageHints: config.language ? [config.language] : undefined,
        languageHintsStrict: config.languageHintsStrict,
        endpointLatencyAdjustmentLevel: config.endpointLatencyAdjustmentLevel,
        enableSpeakerDiarization: config.diarize,
        context: config.keyterms ? { terms: config.keyterms } : undefined,
      })
    case "xai":
      return new xai.STT({
        apiKey: env.XAI_API_KEY,
        language: config.language ?? "en",
        endpointing: config.endpointingMs ?? 100,
        enableDiarization: config.diarize ?? false,
        vadThreshold: config.vadThreshold,
        smartTurn: config.smartTurn,
        smartTurnTimeout: config.smartTurnTimeout,
        keyterm: config.keyterms,
      })
    default:
      throw new Error(`Unsupported STT provider: ${provider}`)
  }
}
