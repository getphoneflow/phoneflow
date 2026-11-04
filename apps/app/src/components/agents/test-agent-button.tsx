import { PlayIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

export function TestAgentButton() {
  const setSidePanel = useAgentStore((state) => state.setSidePanel)
  const { t } = useTranslation()

  return (
    <Button variant="outline" onClick={() => setSidePanel({ kind: "test" })}>
      <PlayIcon />
      {t("components.agents.test_agent_button.trigger")}
    </Button>
  )
}
