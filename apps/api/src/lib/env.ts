import "dotenv/config"

export const env = {
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  API_URL: process.env.API_URL ?? "http://localhost:3000",
  PORT: Number(process.env.PORT ?? "3000"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  REDIS_URL: process.env.REDIS_URL ?? "",
  API_TOKEN: process.env.API_TOKEN ?? "",
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ?? "",
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ?? "",
  LIVEKIT_URL: process.env.LIVEKIT_URL ?? "",
  LIVEKIT_AGENT_NAME: process.env.LIVEKIT_AGENT_NAME ?? "voice-agent",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? "",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? "",
  S3_BUCKET: process.env.S3_BUCKET ?? "",
  S3_REGION: process.env.S3_REGION ?? "",
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
}
