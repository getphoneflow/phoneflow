import { Panel } from "@xyflow/react"
import { PencilLineIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { AddNodeButton } from "@/components/agents/add-node-button"
import { useAgentStore } from "@/stores/agent"

export function FlowConfigButtons() {
  const setSidePanel = useAgentStore((state) => state.setSidePanel)

  return (
    <Panel position="top-left" className="flex flex-col gap-3">
      <AddNodeButton />

      <div>
        <Button
          variant="outline"
          onClick={() => setSidePanel({ kind: "global-prompt" })}
        >
          <PencilLineIcon />
          Global prompt
        </Button>
      </div>
    </Panel>
  )
}
