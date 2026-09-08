import { Badge } from "@workspace/ui/components/badge"
import { hasUnsavedAgentChanges } from "@/components/flow/agent-config"
import { useAgentStore } from "@/stores/agent"

export function UnsavedChangesBadge() {
  const hasUnsavedChanges = useAgentStore((state) =>
    hasUnsavedAgentChanges(state.config, state.savedConfig)
  )

  if (!hasUnsavedChanges) {
    return null
  }

  return (
    <Badge variant="secondary" className="p-3">
      Unsaved
    </Badge>
  )
}
