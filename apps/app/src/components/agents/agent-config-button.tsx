import { SettingsIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { useAgentStore } from "@/stores/agent"

export function AgentConfigButton() {
  const setSidePanel = useAgentStore((state) => state.setSidePanel)

  return (
    <Button variant="outline" onClick={() => setSidePanel({ kind: "config" })}>
      <SettingsIcon />
      Config
    </Button>
  )
}
