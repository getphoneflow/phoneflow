import { DownloadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { CopyButton } from "@/components/copy-button"

type BackupCodesListProps = {
  codes: string[]
}

export function BackupCodesList({ codes }: BackupCodesListProps) {
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
        <CopyButton value={codes.join("\n")} />
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
