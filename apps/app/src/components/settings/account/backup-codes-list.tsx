import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"

type BackupCodesListProps = {
  codes: string[]
}

export function BackupCodesList({ codes }: BackupCodesListProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"))
      setCopied(true)
      toast.success("Backup codes copied")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy backup codes")
    }
  }

  function handleDownload() {
    const blob = new Blob([codes.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "phoneflow-backup-codes.txt"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid min-w-0 grid-cols-2 gap-2 rounded-md border p-3 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="min-w-0 break-all">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          Copy
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
        >
          <DownloadIcon />
          Download
        </Button>
      </div>
    </div>
  )
}
