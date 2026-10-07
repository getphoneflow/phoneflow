import { Turnstile } from "@marsidev/react-turnstile"

import { useTheme } from "@/components/theme-provider"
import { env } from "@/lib/env"

export function Captcha({
  onTokenChange,
}: {
  onTokenChange: (token: string | null) => void
}) {
  const { theme } = useTheme()

  if (!env.IS_CLOUD) {
    return null
  }

  return (
    <Turnstile
      siteKey={env.TURNSTILE_SITE_KEY}
      options={{
        theme: theme === "system" ? "auto" : theme,
        size: "flexible",
      }}
      onSuccess={onTokenChange}
      onExpire={() => onTokenChange(null)}
      onError={() => onTokenChange(null)}
      onTimeout={() => onTokenChange(null)}
    />
  )
}
