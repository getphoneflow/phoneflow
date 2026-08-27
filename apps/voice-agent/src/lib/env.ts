import "dotenv/config"

export const env = {
  API_URL: process.env.API_URL ?? "http://localhost:3000",
  API_TOKEN: process.env.API_TOKEN ?? "",
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ?? "",
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ?? "",
  LIVEKIT_URL: process.env.LIVEKIT_URL ?? "",
  LIVEKIT_AGENT_NAME: process.env.LIVEKIT_AGENT_NAME ?? "voice-agent",
  ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY ?? "",
  ASSEMBLYAI_BASE_URL: process.env.ASSEMBLYAI_BASE_URL ?? "",
  CEREBRAS_API_KEY:
    process.env.CEREBRAS_API_KEY ?? process.env.CEREBRA_API_KEY ?? "",
  FISHAUDIO_API_KEY:
    process.env.FISHAUDIO_API_KEY ?? process.env.FISH_API_KEY ?? "",
  FISHAUDIO_VOICE_ID: process.env.FISHAUDIO_VOICE_ID ?? "",
}
