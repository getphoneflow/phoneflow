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
  const hasError = errors !== null

  return (
    <div className="relative">
      <div
        className={cn(
          "w-64 rounded-lg border border-border bg-popover",
          selected && !hasError && "border-ring ring-2 ring-ring/50",
          hasError && "border-destructive ring-2 ring-destructive/50"
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
