export const env = {
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL ?? "http://localhost:5173",
  API_URL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  IS_CLOUD: import.meta.env.VITE_IS_CLOUD === "true",
  LIVEKIT_AGENT_NAME: import.meta.env.VITE_LIVEKIT_AGENT_NAME ?? "voice-agent",
  PUBLIC_S3_URL: import.meta.env.VITE_PUBLIC_S3_URL ?? "",
  TURNSTILE_SITE_KEY: import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "",
  POSTHOG_PROJECT_TOKEN: import.meta.env.VITE_POSTHOG_PROJECT_TOKEN ?? "",
  POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com",
}
