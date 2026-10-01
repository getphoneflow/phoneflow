import { useAgentStore } from "@/stores/agent"
import { ConfigPanel } from "./config"
import { EdgePanel } from "./edges/condition"
import { GlobalPromptPanel } from "./global-prompt"
import { ConversationNodePanel } from "./nodes/conversation"
import { EndNodePanel } from "./nodes/end"
import { TestPanel } from "./test"

export function FlowSidePanel() {
  const sidePanel = useAgentStore((state) => state.sidePanel)

  switch (sidePanel.kind) {
    case "closed":
      return null
    case "test":
      return <TestPanel />
    case "global-prompt":
      return <GlobalPromptPanel />
    case "config":
      return <ConfigPanel />
    case "node":
      switch (sidePanel.node.type) {
        case "conversation":
          return (
            <ConversationNodePanel
              key={sidePanel.node.id}
              node={sidePanel.node}
            />
          )
        case "end":
          return <EndNodePanel key={sidePanel.node.id} node={sidePanel.node} />
      }
    case "edge":
      return <EdgePanel key={sidePanel.edge.id} edge={sidePanel.edge} />
  }
}
