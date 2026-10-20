import type { LucideIcon } from "lucide-react"
import { PencilLine, Trash2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function ToolPickerItem({
  icon: Icon,
  title,
  description,
  onSelect,
}: {
  icon: LucideIcon
  title: string
  description?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
      onClick={onSelect}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block truncate">{title}</span>
        {description ? (
          <span className="block truncate text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}

export function ToolRow({
  icon: Icon,
  title,
  summary,
  editLabel,
  removeLabel,
  readOnly,
  onEdit,
  onRemove,
}: {
  icon: LucideIcon
  title: string
  summary?: string
  editLabel: string
  removeLabel: string
  readOnly?: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center rounded-md border border-border p-2">
      <Icon className="mr-2 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{title}</div>
        {summary ? (
          <div className="truncate text-xs text-muted-foreground">
            {summary}
          </div>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={editLabel}
        onClick={onEdit}
      >
        <PencilLine />
      </Button>
      <Button
        variant="ghost"
        className="text-destructive!"
        size="icon-sm"
        aria-label={removeLabel}
        disabled={readOnly}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  )
}
