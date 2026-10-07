import { cn } from "cn"
import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

export type NumericFilterOperator = "eq" | "between" | "gte" | "lte"

const numericOperatorOptions: {
  value: NumericFilterOperator
  label: string
}[] = [
  { value: "eq", label: "is equal to" },
  { value: "between", label: "is between" },
  { value: "gte", label: "is greater than or equal to" },
  { value: "lte", label: "is less than or equal to" },
]

export function NumericFilter({
  label,
  placeholder,
  unitBefore = "",
  unitAfter = "",
  operator,
  value,
  valueMax,
  onChange,
}: {
  label: string
  placeholder: string
  unitBefore?: string
  unitAfter?: string
  operator?: NumericFilterOperator
  value?: number
  valueMax?: number
  onChange: (next: {
    operator?: NumericFilterOperator
    value?: number
    valueMax?: number
  }) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftOperator, setDraftOperator] = useState<NumericFilterOperator>(
    operator ?? "eq"
  )
  const [draftValue, setDraftValue] = useState(value?.toString() ?? "")
  const [draftValueMax, setDraftValueMax] = useState(valueMax?.toString() ?? "")

  useEffect(() => {
    if (open) {
      return
    }

    setDraftOperator(operator ?? "eq")
    setDraftValue(value?.toString() ?? "")
    setDraftValueMax(valueMax?.toString() ?? "")
  }, [open, operator, value, valueMax])

  const formatValue = (amount: number) => `${unitBefore}${amount}${unitAfter}`

  let summary = placeholder
  if (value !== undefined) {
    if (operator === "between" && valueMax !== undefined) {
      summary = `${formatValue(value)} – ${formatValue(valueMax)}`
    } else if (operator === "eq") {
      summary = `= ${formatValue(value)}`
    } else if (operator === "lte") {
      summary = `≤ ${formatValue(value)}`
    } else if (operator === "gte") {
      summary = `≥ ${formatValue(value)}`
    }
  }

  return (
    <Field className="w-44 gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            const parsedValue =
              draftValue.trim() === "" ? undefined : Number(draftValue)
            const parsedValueMax =
              draftValueMax.trim() === "" ? undefined : Number(draftValueMax)
            const hasValue =
              parsedValue !== undefined && Number.isFinite(parsedValue)
            const hasValueMax =
              parsedValueMax !== undefined && Number.isFinite(parsedValueMax)

            if (draftOperator === "between") {
              if (!hasValue && !hasValueMax) {
                onChange({
                  operator: undefined,
                  value: undefined,
                  valueMax: undefined,
                })
              } else if (hasValue && hasValueMax) {
                onChange({
                  operator: draftOperator,
                  value: parsedValue,
                  valueMax: parsedValueMax,
                })
              }
            } else if (!hasValue) {
              onChange({
                operator: undefined,
                value: undefined,
                valueMax: undefined,
              })
            } else {
              onChange({
                operator: draftOperator,
                value: parsedValue,
                valueMax: undefined,
              })
            }
          }

          setOpen(nextOpen)
        }}
      >
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start font-normal",
                value === undefined && "text-muted-foreground"
              )}
            />
          }
        >
          <span className="truncate">{summary}</span>
        </PopoverTrigger>
        <PopoverContent className="w-72 gap-3 p-3" align="start">
          <Select
            value={draftOperator}
            onValueChange={(nextOperator) => {
              const operatorValue = nextOperator as NumericFilterOperator
              setDraftOperator(operatorValue)
              if (operatorValue !== "between") {
                setDraftValueMax("")
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {
                  numericOperatorOptions.find(
                    (option) => option.value === draftOperator
                  )?.label
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {numericOperatorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {draftOperator === "between" ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step="any"
                className="flex-1"
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
              />
              <span className="text-sm text-muted-foreground">and</span>
              <Input
                type="number"
                min={0}
                step="any"
                className="flex-1"
                value={draftValueMax}
                onChange={(event) => setDraftValueMax(event.target.value)}
              />
            </div>
          ) : (
            <Input
              type="number"
              min={0}
              step="any"
              placeholder={placeholder}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
            />
          )}
        </PopoverContent>
      </Popover>
    </Field>
  )
}
