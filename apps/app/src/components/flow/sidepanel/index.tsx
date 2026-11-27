import { useAgentStore } from "@/stores/agent"
import { ConfigPanel } from "./config"
import { EdgePanel } from "./edges/condition"
import { GlobalPromptPanel } from "./global-prompt"
import { NodePanel } from "./nodes"
import { TestPanel } from "./test"
import { VariablesPanel } from "./variables"

export function FlowSidePanel() {
  const sidePanel = useAgentStore((state) => state.sidePanel)

  switch (sidePanel.kind) {
    case "closed":
      return null
    case "test":
      return <TestPanel />
    case "global-prompt":
      return <GlobalPromptPanel />
    case "variables":
      return <VariablesPanel />
    case "config":
      return <ConfigPanel />
    case "node":
      return <NodePanel key={sidePanel.node.id} node={sidePanel.node} />
    case "edge":
      return <EdgePanel key={sidePanel.edge.id} edge={sidePanel.edge} />
  }
}
