import { SettingsIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

export function AgentConfigButton() {
  const setSidePanel = useAgentStore((state) => state.setSidePanel)
  const { t } = useTranslation()

  return (
    <Button variant="outline" onClick={() => setSidePanel({ kind: "config" })}>
      <SettingsIcon />
      {t("components.agents.agent_config_button.trigger")}
    </Button>
  )
}
