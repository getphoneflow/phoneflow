import "dotenv/config"

export const env = {
  EMAIL_HOST: process.env.EMAIL_HOST ?? "",
  EMAIL_PORT: Number(process.env.EMAIL_PORT ?? ""),
  EMAIL_SECURE: process.env.EMAIL_SECURE !== "false",
  EMAIL_USER: process.env.EMAIL_USER ?? "",
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ?? "",
}
