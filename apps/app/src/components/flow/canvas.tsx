import { Background, MiniMap, Panel, ReactFlow } from "@xyflow/react"
import { useShallow } from "zustand/react/shallow"

import { FlowConfigButtons } from "@/components/agents/flow-config-buttons"
import { useTheme } from "@/components/theme-provider"
import { useAgentStore } from "@/stores/agent"
import { ConditionEdge } from "./edges/condition"
import { ConversationNode } from "./nodes/conversation"
import { EndNode } from "./nodes/end"
import { FlowToolbar } from "./toolbar"
import "./canvas.css"

const selector = (state: ReturnType<typeof useAgentStore.getState>) => ({
  nodes: state.config.nodes,
  edges: state.config.edges,
  readOnly: state.readOnly,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  selectNode: state.selectNode,
  selectEdge: state.selectEdge,
  setSidePanel: state.setSidePanel,
})

export default function Canvas() {
  const {
    nodes,
    edges,
    readOnly,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    selectEdge,
    setSidePanel,
  } = useAgentStore(useShallow(selector))

  const { theme } = useTheme()

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodesConnectable={!readOnly}
      onNodeClick={(_, node) => selectNode(node)}
      onEdgeClick={(_, edge) => selectEdge(edge)}
      onPaneClick={() => setSidePanel({ kind: "closed" })}
      nodeTypes={{
        conversation: ConversationNode,
        end: EndNode,
      }}
      edgeTypes={{
        default: ConditionEdge,
      }}
      defaultEdgeOptions={{
        animated: true,
      }}
      fitView
      colorMode={theme}
      selectNodesOnDrag={false}
      proOptions={{ hideAttribution: true }}
    >
      <FlowConfigButtons />
      <Panel position="bottom-left">
        <FlowToolbar />
      </Panel>
      <Background />
      <MiniMap zoomable pannable />
    </ReactFlow>
  )
}
