import { useReactFlow } from "@xyflow/react"
import { cn } from "cn"
import { CopyIcon, Trash2Icon } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import {
  FOCUS_ZOOM,
  getNextNodePosition,
  SIDE_PANEL_OFFSET_PX,
} from "@/components/flow/node-position"
import { useAgentStore } from "@/stores/agent"

type FlowNodeActionsProps = {
  id: string
}

export function FlowNodeActions({ id }: FlowNodeActionsProps) {
  const { deleteElements, setCenter } = useReactFlow()
  const readOnly = useAgentStore((state) => state.readOnly)
  const nodes = useAgentStore((state) => state.config.nodes)
  const addNode = useAgentStore((state) => state.addNode)
  const original = nodes.find((entry) => entry.id === id)

  function handleDuplicate(event: React.MouseEvent) {
    event.stopPropagation()
    if (!original) {
      return
    }

    const { selected: _, ...node } = original
    const position = getNextNodePosition(nodes)
    addNode({
      ...node,
      id: `${node.type}-${Date.now()}`,
      position,
    })

    setCenter(position.x + SIDE_PANEL_OFFSET_PX, position.y, {
      zoom: FOCUS_ZOOM,
      duration: 800,
    })
  }

  const actionClassName =
    "flex size-6 items-center justify-center rounded-sm border border-border bg-popover transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60"

  return (
    <div className="nopan nodrag absolute top-1/2 left-full ml-2 -translate-y-1/2 flex flex-col gap-1.5">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              disabled={readOnly}
              className={cn(actionClassName, "text-destructive")}
              onClick={() => deleteElements({ nodes: [{ id }] })}
            />
          }
        >
          <Trash2Icon className="size-3.5" />
          <span className="sr-only">Delete</span>
        </TooltipTrigger>
        <TooltipContent side="right">Delete</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              disabled={readOnly}
              className={cn(actionClassName, "text-foreground")}
              onClick={handleDuplicate}
            />
          }
        >
          <CopyIcon className="size-3.5" />
          <span className="sr-only">Duplicate</span>
        </TooltipTrigger>
        <TooltipContent side="right">Duplicate</TooltipContent>
      </Tooltip>
    </div>
  )
}
