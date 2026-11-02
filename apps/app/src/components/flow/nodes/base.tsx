import { cn } from "cn"

import { useAgentStore } from "@/stores/agent"
import { FlowNodeActions } from "./actions"

type FlowNodeBaseProps = {
  id: string
  selected?: boolean
  children: React.ReactNode
}

export function FlowNodeBase({ id, selected, children }: FlowNodeBaseProps) {
  const errors = useAgentStore((state) => {
    const messages = state.flowErrors.byNodeId[id]
    return messages?.length ? messages.join(", ") : null
  })
  const isActive = useAgentStore((state) => state.activeNodeId === id)
  const hasError = errors !== null

  return (
    <div className="relative">
      <div
        className={cn(
          "w-64 rounded-lg border bg-popover",
          isActive && "active-node border-blue-400 ring-2 ring-blue-400/40",
          !isActive && "border-border",
          !isActive &&
            selected &&
            !hasError &&
            "border-ring ring-2 ring-ring/50",
          !isActive &&
            hasError &&
            "border-destructive ring-2 ring-destructive/50"
        )}
      >
        {children}
      </div>
      {selected && <FlowNodeActions id={id} />}
      {hasError && (
        <p className="absolute top-full left-0 mt-1 w-64 text-xs leading-snug text-destructive">
          {errors}
        </p>
      )}
    </div>
  )
}
