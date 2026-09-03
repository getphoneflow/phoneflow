import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react"
import { cn } from "cn"

import type { FlowEdgeConfig } from "@workspace/shared/api/agent-config/types"
import { useAgentStore } from "@/stores/agent"
import { FlowEdgeActions } from "./actions"
import { formatConditionLabel } from "./condition-format"

type ConditionEdgeType = Edge<FlowEdgeConfig["data"]>

export function ConditionEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps<ConditionEdgeType>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  const selectEdge = useAgentStore((state) => state.selectEdge)

  return (
    <>
      <BaseEdge path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <div
            className={cn(
              "nopan nodrag max-w-48 min-h-6 min-w-16 cursor-pointer truncate rounded border border-border bg-popover px-2 py-1 text-xs font-medium text-muted-foreground",
              selected && "border-ring ring-2 ring-ring/50"
            )}
            onClick={() => selectEdge({ id, source, target, data: data! })}
          >
            {data ? formatConditionLabel(data.condition) : ""}
          </div>
          {selected && <FlowEdgeActions id={id} />}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
