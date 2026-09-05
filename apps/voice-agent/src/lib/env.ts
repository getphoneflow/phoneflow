import "dotenv/config"

export const env = {
  API_URL: process.env.API_URL ?? "http://localhost:3000",
  API_TOKEN: process.env.API_TOKEN ?? "",
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ?? "",
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ?? "",
  LIVEKIT_URL: process.env.LIVEKIT_URL ?? "",
  LIVEKIT_AGENT_NAME: process.env.LIVEKIT_AGENT_NAME ?? "voice-agent",

  // Model providers
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY ?? "",
  ASSEMBLYAI_BASE_URL: process.env.ASSEMBLYAI_BASE_URL ?? "",
  BASETEN_API_KEY: process.env.BASETEN_API_KEY ?? "",
  CARTESIA_API_KEY: process.env.CARTESIA_API_KEY ?? "",
  CEREBRAS_API_KEY:
    process.env.CEREBRAS_API_KEY ?? process.env.CEREBRA_API_KEY ?? "",
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY ?? "",
  DEEPINFRA_API_KEY: process.env.DEEPINFRA_API_KEY ?? "",
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? "",
  ELEVEN_API_KEY: process.env.ELEVEN_API_KEY ?? "",
  FIREWORKS_API_KEY: process.env.FIREWORKS_API_KEY ?? "",
  FISHAUDIO_API_KEY:
    process.env.FISHAUDIO_API_KEY ?? process.env.FISH_API_KEY ?? "",
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ?? "",
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
  INWORLD_API_KEY: process.env.INWORLD_API_KEY ?? "",
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ?? "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  OVHCLOUD_API_KEY: process.env.OVHCLOUD_API_KEY ?? "",
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY ?? "",
  SONIOX_API_KEY: process.env.SONIOX_API_KEY ?? "",
  TOGETHER_API_KEY: process.env.TOGETHER_API_KEY ?? "",
  XAI_API_KEY: process.env.XAI_API_KEY ?? "",
}
