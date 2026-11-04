import { useReactFlow } from "@xyflow/react"
import { Trash2Icon } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

type FlowEdgeActionsProps = {
  id: string
}

export function FlowEdgeActions({ id }: FlowEdgeActionsProps) {
  const { deleteElements } = useReactFlow()
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)

  return (
    <div className="nopan nodrag absolute top-1/2 left-full ml-2 -translate-y-1/2">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              disabled={readOnly}
              className="flex size-6 items-center justify-center rounded-sm border border-border bg-popover text-destructive transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60"
              onClick={() => deleteElements({ edges: [{ id }] })}
            />
          }
        >
          <Trash2Icon className="size-3.5" />
          <span className="sr-only">{t("common.actions.delete")}</span>
        </TooltipTrigger>
        <TooltipContent side="right">
          {t("common.actions.delete")}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
