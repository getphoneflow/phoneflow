import { cn } from "cn"

import { FlowNodeActions } from "./actions"

type FlowNodeBaseProps = {
  id: string
  selected?: boolean
  children: React.ReactNode
}

export function FlowNodeBase({ id, selected, children }: FlowNodeBaseProps) {
  return (
    <div className="relative">
      <div
        className={cn(
          "w-64 rounded-lg border border-border bg-popover",
          selected && "border-ring ring-2 ring-ring/50"
        )}
      >
        {children}
      </div>
      {selected && <FlowNodeActions id={id} />}
    </div>
  )
}
