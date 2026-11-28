import "dotenv/config"

export const env = {
  REDIS_URL: process.env.REDIS_URL ?? "",
  API_URL: process.env.API_URL ?? "http://localhost:3000",
  API_TOKEN: process.env.API_TOKEN ?? "",
  EMAIL_HOST: process.env.EMAIL_HOST ?? "",
  EMAIL_PORT: Number(process.env.EMAIL_PORT ?? ""),
  EMAIL_SECURE: process.env.EMAIL_SECURE !== "false",
  EMAIL_USER: process.env.EMAIL_USER ?? "",
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "",
  QDRANT_URL: process.env.QDRANT_URL ?? "",
  QDRANT_API_KEY: process.env.QDRANT_API_KEY ?? "",
  QDRANT_KNOWLEDGE_BASE_COLLECTION:
    process.env.QDRANT_KNOWLEDGE_BASE_COLLECTION ?? "knowledge_base_chunks",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
}
