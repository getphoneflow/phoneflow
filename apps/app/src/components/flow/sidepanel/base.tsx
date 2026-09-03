import { cn } from "cn"
import { XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { useAgentStore } from "@/stores/agent"

type FlowSidePanelBaseProps = {
  title: string
  children: React.ReactNode
  contentClassName?: string
}

export function FlowSidePanelBase({
  title,
  children,
  contentClassName,
}: FlowSidePanelBaseProps) {
  const setSidePanel = useAgentStore((state) => state.setSidePanel)

  return (
    <aside className="fixed top-21 right-3 bottom-3 z-40 flex w-95 max-w-full flex-col rounded-lg border bg-popover text-popover-foreground shadow-lg">
      <div className="flex flex-col gap-1.5 p-4">
        <h2 className="font-heading text-lg font-medium text-foreground">
          {title}
        </h2>
      </div>
      <div
        className={cn(
          "flex-1 overflow-y-auto rounded-b-lg border-t border-border p-4",
          contentClassName
        )}
      >
        {children}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-3.5 right-3.5"
        onClick={() => setSidePanel({ kind: "closed" })}
      >
        <XIcon />
        <span className="sr-only">Close side panel</span>
      </Button>
    </aside>
  )
}
