import { PencilLineIcon } from "lucide-react"
import * as React from "react"

type InlineEditableFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function InlineEditableField({
  value,
  onChange,
  placeholder = "Click to edit",
  disabled = false,
}: InlineEditableFieldProps) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)

  React.useEffect(() => {
    setDraft(value)
  }, [value])

  function save() {
    if (draft.trim() === "") {
      setDraft(value)
      setEditing(false)
      return
    }

    onChange(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        className="min-w-sm bg-transparent p-0 text-inherit focus:outline-none"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") save()
          if (event.key === "Escape") {
            setDraft(value)
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className="inline-flex max-w-xs items-center gap-2 bg-transparent p-0 text-inherit disabled:pointer-events-none disabled:opacity-70"
      onClick={() => setEditing(true)}
      disabled={disabled}
    >
      <span className="truncate">{value || placeholder}</span>
      {!disabled && <PencilLineIcon className="h-3.5 w-3.5 shrink-0" />}
    </button>
  )
}
