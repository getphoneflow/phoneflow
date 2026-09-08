import { useReactFlow } from "@xyflow/react"
import {
  Maximize2Icon,
  Redo2Icon,
  Scan,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import { useEffect } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useAgentStore } from "@/stores/agent"

type ToolbarButtonProps = {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable=true]")
  )
}

export function FlowToolbar() {
  const undo = useAgentStore((state) => state.undo)
  const redo = useAgentStore((state) => state.redo)
  const canUndo = useAgentStore(
    (state) => state.past.length > 0 && !state.readOnly
  )
  const canRedo = useAgentStore(
    (state) => state.future.length > 0 && !state.readOnly
  )
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      const mod = event.metaKey || event.ctrlKey

      if (mod && key === "z") {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      if (key === "+") {
        event.preventDefault()
        zoomIn({ duration: 200 })
        return
      }

      if (key === "-") {
        event.preventDefault()
        zoomOut({ duration: 200 })
        return
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [undo, redo, zoomIn, zoomOut, zoomTo, fitView])

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-1 shadow-sm">
      <ToolbarButton label="Undo" disabled={!canUndo} onClick={undo}>
        <Undo2Icon />
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={!canRedo} onClick={redo}>
        <Redo2Icon />
      </ToolbarButton>
      <ToolbarButton
        label="Zoom out"
        onClick={() => zoomOut({ duration: 200 })}
      >
        <ZoomOutIcon />
      </ToolbarButton>
      <ToolbarButton label="Zoom in" onClick={() => zoomIn({ duration: 200 })}>
        <ZoomInIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Zoom to 100%"
        onClick={() => zoomTo(1, { duration: 200 })}
      >
        <Maximize2Icon />
      </ToolbarButton>
      <ToolbarButton
        label="Fit view"
        onClick={() => fitView({ duration: 300 })}
      >
        <Scan />
      </ToolbarButton>
    </div>
  )
}
