export const env = {
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL ?? "http://localhost:5173",
  API_URL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  IS_CLOUD: import.meta.env.VITE_IS_CLOUD === "true",
  LIVEKIT_AGENT_NAME: import.meta.env.VITE_LIVEKIT_AGENT_NAME ?? "voice-agent",
  PUBLIC_S3_URL: import.meta.env.VITE_PUBLIC_S3_URL ?? "",
}
