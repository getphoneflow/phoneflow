import { ChevronDownIcon } from "lucide-react"
import { Children, type ReactNode, useEffect, useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"

export function ConfigSection({ children }: { children: ReactNode }) {
  return <FieldGroup className="gap-5">{children}</FieldGroup>
}

export function AdvancedFields({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean)
  if (items.length === 0) return null

  return (
    <Collapsible className="group/advanced">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        Advanced
        <ChevronDownIcon className="size-4 transition-transform group-data-open/advanced:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <FieldGroup className="gap-5 pt-4">{items}</FieldGroup>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function NumberField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  readOnly,
}: {
  label: string
  description?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  readOnly?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        disabled={readOnly}
        value={draft ?? String(value)}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          setDraft(event.target.value)
          const next = event.target.valueAsNumber
          if (Number.isFinite(next)) onChange(next)
        }}
      />
    </Field>
  )
}

export function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
  readOnly,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  readOnly?: boolean
}) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel>{label}</FieldLabel>
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </FieldContent>
      <Switch
        checked={checked}
        disabled={readOnly}
        onCheckedChange={onCheckedChange}
      />
    </Field>
  )
}

export function EnumField<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
  readOnly,
  optionClassName,
}: {
  label: string
  description?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  readOnly?: boolean
  optionClassName?: string
}) {
  const selected = options.find((option) => option.value === value)

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Select
        value={value}
        readOnly={readOnly}
        onValueChange={(next) => {
          if (next != null) onChange(next)
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue className={optionClassName}>
            {selected?.label ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              className={optionClassName}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

export function LanguageField({
  label = "Language",
  description,
  value,
  languages,
  onChange,
  readOnly,
}: {
  label?: string
  description?: string
  value: string
  languages: string[]
  onChange: (value: string) => void
  readOnly?: boolean
}) {
  if (languages.length === 0) return null

  const options = languages.map((language) => ({
    value: language,
    label: language,
  }))
  const current = languages.includes(value) ? value : languages[0]

  return (
    <EnumField
      label={label}
      description={description}
      value={current}
      options={options}
      readOnly={readOnly}
      onChange={onChange}
    />
  )
}

export function StringListField({
  label,
  description,
  value,
  onChange,
  readOnly,
  placeholder = "term1, term2",
}: {
  label: string
  description?: string
  value: string[]
  onChange: (value: string[]) => void
  readOnly?: boolean
  placeholder?: string
}) {
  const serialized = value.join(", ")
  const [draft, setDraft] = useState(serialized)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(serialized)
  }, [focused, serialized])

  function commit(next: string) {
    const parts = next
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
    onChange(parts)
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Input
        readOnly={readOnly}
        disabled={readOnly}
        placeholder={placeholder}
        value={draft}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          commit(draft)
        }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur()
          }
        }}
      />
    </Field>
  )
}

export function MultilineListField({
  label,
  description,
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  label: string
  description?: string
  value: string[]
  onChange: (value: string[]) => void
  readOnly?: boolean
  placeholder?: string
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Textarea
        readOnly={readOnly}
        disabled={readOnly}
        placeholder={placeholder}
        rows={3}
        value={value.join("\n")}
        onChange={(event) => {
          const parts = event.target.value
            .split("\n")
            .map((part) => part.trim())
            .filter(Boolean)
          onChange(parts)
        }}
      />
    </Field>
  )
}
