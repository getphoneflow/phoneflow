import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { useTranslation } from "@/lib/i18n"

export function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1000)
    } catch {
      toast.error(t("components.copy_button.toasts.copy_failed"))
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={t("common.actions.copy")}
      onClick={handleCopy}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}
