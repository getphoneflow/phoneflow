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
  const errors = useAgentStore((state) => {
    const messages = state.flowErrors.byEdgeId[id]
    return messages?.length ? messages.join(", ") : null
  })
  const hasError = errors !== null

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
              selected && !hasError && "border-ring ring-2 ring-ring/50",
              hasError && "border-destructive ring-2 ring-destructive/50"
            )}
            onClick={() => selectEdge({ id, source, target, data: data! })}
          >
            {data ? formatConditionLabel(data.condition) : ""}
          </div>
          {selected && <FlowEdgeActions id={id} />}
          {hasError && (
            <p className="absolute top-full left-1/2 mt-1 w-max max-w-48 -translate-x-1/2 text-center text-xs leading-snug text-destructive">
              {errors}
            </p>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
