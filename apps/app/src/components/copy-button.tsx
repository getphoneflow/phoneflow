import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1000)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Copy"
      onClick={handleCopy}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}
