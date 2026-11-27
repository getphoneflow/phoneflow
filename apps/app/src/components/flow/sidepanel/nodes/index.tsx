import type { FlowNodeConfig } from "@workspace/shared/api/agent-config/types"
import { ConversationNodePanel } from "./conversation"
import { EndNodePanel } from "./end"

type NodePanelProps = {
  node: FlowNodeConfig
}

export function NodePanel({ node }: NodePanelProps) {
  switch (node.type) {
    case "conversation":
      return <ConversationNodePanel node={node} />
    case "end":
      return <EndNodePanel node={node} />
  }
}
