import { Panel } from "@xyflow/react"
import { BracesIcon, PencilLineIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { AddNodeButton } from "@/components/agents/add-node-button"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

export function FlowConfigButtons() {
  const setSidePanel = useAgentStore((state) => state.setSidePanel)
  const { t } = useTranslation()

  return (
    <Panel position="top-left" className="flex flex-col gap-3">
      <AddNodeButton />

      <div>
        <Button
          variant="outline"
          onClick={() => setSidePanel({ kind: "global-prompt" })}
        >
          <PencilLineIcon />
          {t("components.agents.flow_config_buttons.global_prompt")}
        </Button>
      </div>

      <div>
        <Button
          variant="outline"
          onClick={() => setSidePanel({ kind: "variables" })}
        >
          <BracesIcon />
          {t("components.agents.flow_config_buttons.variables")}
        </Button>
      </div>
    </Panel>
  )
}
