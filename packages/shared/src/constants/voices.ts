import { cartesiaVoices } from "./cartesia-voices"
import { deepgramAura2Voices, deepgramAuraVoices } from "./deepgram-voices"
import { elevenlabsVoices } from "./elevenlabs-voices"
import { fishaudioVoices } from "./fishaudio-voices"
import { inworldVoices } from "./inworld-voices"
import { mistralVoices } from "./mistral-voices"
import { openaiGpt4oMiniTtsVoices, openaiVoices } from "./openai-voices"
import { sonioxVoices } from "./soniox-voices"
import { xaiVoices } from "./xai-voices"

export const VOICES = {
  cartesia: {
    "sonic-2": cartesiaVoices,
    "sonic-3": cartesiaVoices,
    "sonic-3.5": cartesiaVoices,
    "sonic-3.6": cartesiaVoices,
    "sonic-latest": cartesiaVoices,
    "sonic-preview": cartesiaVoices,
  },
  deepgram: {
    aura: deepgramAuraVoices,
    "aura-2": deepgramAura2Voices,
  },
  elevenlabs: {
    eleven_flash_v2_5: elevenlabsVoices,
    eleven_flash_v2: elevenlabsVoices,
    eleven_turbo_v2_5: elevenlabsVoices,
    eleven_turbo_v2: elevenlabsVoices,
    eleven_multilingual_v2: elevenlabsVoices,
  },
  fishaudio: {
    "s2-pro": fishaudioVoices,
    "s2.1-pro": fishaudioVoices,
    "s2.1-pro-free": fishaudioVoices,
  },
  inworld: {
    "inworld-tts-1": inworldVoices,
    "inworld-tts-1.5-max": inworldVoices,
    "inworld-tts-1.5-mini": inworldVoices,
    "inworld-tts-2": inworldVoices,
    "inworld-tts-2-flash": inworldVoices,
  },
  mistral: {
    "voxtral-mini-tts-latest": mistralVoices,
  },
  openai: {
    "tts-1": openaiVoices,
    "tts-1-hd": openaiVoices,
    "gpt-4o-mini-tts": openaiGpt4oMiniTtsVoices,
  },
  soniox: {
    "tts-rt-v2": sonioxVoices,
    "tts-rt-v1": sonioxVoices,
  },
  xai: {
    "tts-1": xaiVoices,
  },
}
