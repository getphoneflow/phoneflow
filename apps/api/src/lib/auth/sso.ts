import { env } from "@/lib/env"

function origin(value: unknown) {
  if (typeof value !== "string" || !value) return
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return
    return url.origin
  } catch {
    return
  }
}

export async function trustedOrigins(request?: Request) {
  if (
    !request?.url.endsWith("/sso/register") ||
    request.bodyUsed ||
    origin(request.headers.get("origin") || request.headers.get("referer")) !==
      env.FRONTEND_URL
  ) {
    return [env.FRONTEND_URL]
  }

  const body = await request.clone().json()
  const issuer = origin(body?.issuer)
  return issuer ? [env.FRONTEND_URL, issuer] : [env.FRONTEND_URL]
}
