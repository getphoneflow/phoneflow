import { useEffect, useMemo, useRef, useState } from "react"

import { Input } from "@workspace/ui/components/input"
import { Popover, PopoverContent } from "@workspace/ui/components/popover"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  createInputVariable,
  mentionAt,
  replaceMention,
  variableSuggestions,
} from "@/components/flow/variables/suggestions"
import { useAgentStore } from "@/stores/agent"

type Suggestion = { key: string; label: string; create?: boolean }

function caretBox(
  element: HTMLTextAreaElement | HTMLInputElement,
  index: number
) {
  const computed = getComputedStyle(element)
  const mirror = document.createElement("div")
  const style = mirror.style
  style.position = "fixed"
  style.visibility = "hidden"
  style.whiteSpace = element instanceof HTMLInputElement ? "pre" : "pre-wrap"
  style.fontFamily = computed.fontFamily
  style.fontSize = computed.fontSize
  style.fontWeight = computed.fontWeight
  style.fontStyle = computed.fontStyle
  style.letterSpacing = computed.letterSpacing
  style.lineHeight = computed.lineHeight
  style.padding = computed.padding
  style.width =
    element instanceof HTMLInputElement ? "auto" : `${element.clientWidth}px`
  mirror.textContent = element.value.slice(0, index)
  const marker = document.createElement("span")
  marker.textContent = "."
  mirror.append(marker)
  document.body.append(mirror)

  const elementRect = element.getBoundingClientRect()
  const mirrorRect = mirror.getBoundingClientRect()
  const markerRect = marker.getBoundingClientRect()
  const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0
  const borderTop = Number.parseFloat(computed.borderTopWidth) || 0
  const box = {
    top:
      elementRect.top +
      borderTop +
      (markerRect.top - mirrorRect.top) -
      element.scrollTop,
    left:
      elementRect.left +
      borderLeft +
      (markerRect.left - mirrorRect.left) -
      element.scrollLeft,
    height:
      element instanceof HTMLInputElement
        ? elementRect.height
        : markerRect.height || 20,
  }
  mirror.remove()
  return box
}

type VariableTextFieldProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement | HTMLInputElement>
  extraKeys?: string[]
  multiline?: boolean
  rows?: number
  readOnly?: boolean
  placeholder?: string
  className?: string
  name?: string
  "aria-invalid"?: boolean
}

export function VariableTextField({
  value,
  onChange,
  onBlur,
  extraKeys = [],
  multiline = false,
  rows,
  readOnly = false,
  placeholder,
  className,
  name,
  "aria-invalid": ariaInvalid,
}: VariableTextFieldProps) {
  const config = useAgentStore((state) => state.config)
  const fieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const [caret, setCaret] = useState(0)
  const [closed, setClosed] = useState(false)

  const mention = mentionAt(value, caret)
  const { groups, createKey } = variableSuggestions(
    config,
    mention?.query ?? "",
    extraKeys
  )
  const options: Suggestion[] = [
    ...groups.flatMap((group) => group.items),
    ...(createKey
      ? [{ key: createKey, label: `Create ${createKey}`, create: true }]
      : []),
  ]
  const open = mention !== null && !readOnly && !closed

  useEffect(() => {
    setClosed(false)
  }, [mention?.start, mention?.query])

  const mentionStart = mention?.start
  const anchor = useMemo(() => {
    const element = fieldRef.current
    if (!open || !element || mentionStart === undefined) {
      return undefined
    }
    const index = mentionStart + 2
    return {
      contextElement: element,
      getBoundingClientRect() {
        const box = caretBox(element, index)
        return new DOMRect(box.left, box.top, 0, box.height)
      },
    }
  }, [open, mentionStart, value, caret])

  function insert(option: Suggestion) {
    if (!mention || !fieldRef.current) {
      return
    }
    if (option.create) {
      createInputVariable(option.key)
    }
    const { next, cursor } = replaceMention(
      value,
      mention.start,
      caret,
      option.key
    )
    onChange(next)
    setCaret(cursor)
    requestAnimationFrame(() => {
      fieldRef.current?.focus()
      fieldRef.current?.setSelectionRange(cursor, cursor)
    })
  }

  function onKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) {
    if (!open) {
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      setClosed(true)
      return
    }
    if ((event.key === "Enter" || event.key === "Tab") && options[0]) {
      event.preventDefault()
      insert(options[0])
    }
  }

  const control = {
    ref: (element: HTMLTextAreaElement | HTMLInputElement | null) => {
      fieldRef.current = element
    },
    name,
    value,
    readOnly,
    placeholder,
    className,
    "aria-invalid": ariaInvalid,
    "aria-expanded": open,
    "aria-autocomplete": "list" as const,
    onBlur,
    onChange: (
      event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
    ) => {
      onChange(event.target.value)
      setCaret(event.target.selectionStart ?? event.target.value.length)
    },
    onSelect: (
      event: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>
    ) => {
      setCaret(event.currentTarget.selectionStart ?? value.length)
    },
    onKeyDown,
  }

  return (
    <>
      {multiline ? (
        <Textarea {...control} rows={rows} />
      ) : (
        <Input {...control} />
      )}
      <Popover
        open={open && anchor !== undefined}
        modal={false}
        onOpenChange={(next) => {
          if (!next) {
            setClosed(true)
          }
        }}
      >
        <PopoverContent
          anchor={anchor}
          align="start"
          sideOffset={4}
          positionMethod="fixed"
          className="max-h-60 w-64 gap-0 overflow-y-auto p-1"
        >
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No variables
            </p>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 pt-1.5 pb-0.5 text-xs text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className="block w-full cursor-pointer truncate rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insert(option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ))}
              {createKey ? (
                <button
                  type="button"
                  className="block w-full cursor-pointer truncate rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    insert({
                      key: createKey,
                      label: `Create ${createKey}`,
                      create: true,
                    })
                  }
                >
                  Create {createKey}
                </button>
              ) : null}
            </>
          )}
        </PopoverContent>
      </Popover>
    </>
  )
}
