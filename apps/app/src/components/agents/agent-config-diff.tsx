import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import { useTheme } from "@/components/theme-provider"

function formatAgentConfigJson(config: AgentConfig) {
  return JSON.stringify(config, null, 2)
}

type AgentConfigDiffProps = {
  oldConfig: AgentConfig | null
  newConfig: AgentConfig
}

export function AgentConfigDiff({
  oldConfig,
  newConfig,
}: AgentConfigDiffProps) {
  const { theme } = useTheme()

  return (
    <ReactDiffViewer
      oldValue={oldConfig ? formatAgentConfigJson(oldConfig) : ""}
      newValue={formatAgentConfigJson(newConfig)}
      compareMethod={DiffMethod.JSON}
      splitView
      hideSummary
      highlightLanguage="json"
      useDarkTheme={theme === "dark"}
      extraLinesSurroundingDiff={3}
    />
  )
}
