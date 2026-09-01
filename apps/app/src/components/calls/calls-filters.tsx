import { useQuery } from "@tanstack/react-query"
import { CalendarIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import type { AgentsListResponse } from "@workspace/shared/api/agents/types"
import type { BatchCallListResponse } from "@workspace/shared/api/batch-calls/types"
import type {
  CallChannel,
  CallDirection,
  CallListQuery,
  CallNumericFilterOperator,
  CallStatus,
} from "@workspace/shared/api/calls/types"
import type { PhoneNumberListResponse } from "@workspace/shared/api/phone-numbers/types"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox"
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
import { cn } from "@workspace/ui/lib/utils"
import { useUserTimeZone } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"
import { formatDate, zonedDayBounds } from "@/lib/time"

const channelFilterOptions = [
  { value: "all", label: "All channels" },
  { value: "phone_call", label: "Phone" },
  { value: "web_call", label: "Web" },
]

const directionFilterOptions = [
  { value: "all", label: "All directions" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
]

const statusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In progress" },
]

const numericOperatorOptions: {
  value: CallNumericFilterOperator
  label: string
}[] = [
  { value: "eq", label: "is equal to" },
  { value: "between", label: "is between" },
  { value: "gte", label: "is greater than or equal to" },
  { value: "lte", label: "is less than or equal to" },
]

type CallListFilters = Omit<
  CallListQuery,
  "page" | "pageSize" | "sortBy" | "sortDir"
>

type CallsFiltersProps = {
  filters: CallListFilters
  onFiltersChange: (filters: CallListFilters) => void
}

type MultiSelectOption = {
  value: string
  label: string
  description?: string
}

function FilterMultiSelect({
  label,
  placeholder,
  items,
  selectedValues,
  onSelectedValuesChange,
}: {
  label: string
  placeholder: string
  items: MultiSelectOption[]
  selectedValues: string[]
  onSelectedValuesChange: (values: string[]) => void
}) {
  const anchor = useComboboxAnchor()
  const selectedItems = items.filter((item) =>
    selectedValues.includes(item.value)
  )

  return (
    <Field className="w-72 gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Combobox
        multiple
        autoHighlight
        items={items}
        value={selectedItems}
        onValueChange={(next) => {
          onSelectedValuesChange(next.map((item) => item.value))
        }}
        itemToStringValue={(item) =>
          item.description ? `${item.label} ${item.description}` : item.label
        }
      >
        <ComboboxChips ref={anchor} className="w-full">
          <ComboboxValue>
            {(values: MultiSelectOption[]) => (
              <>
                {values.map((item) => (
                  <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
                ))}
                <ComboboxChipsInput
                  placeholder={values.length === 0 ? placeholder : undefined}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxInput showTrigger={false} placeholder="Search..." />
          <ComboboxEmpty>No items found</ComboboxEmpty>
          <ComboboxList>
            {(item: MultiSelectOption) => (
              <ComboboxItem key={item.value} value={item}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{item.label}</span>
                  {item.description ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}

function FilterSingleSelect({
  label,
  placeholder,
  items,
  selectedValue,
  onSelectedValueChange,
}: {
  label: string
  placeholder: string
  items: MultiSelectOption[]
  selectedValue?: string
  onSelectedValueChange: (value: string | undefined) => void
}) {
  const selectedItem =
    items.find((item) => item.value === selectedValue) ?? null

  return (
    <Field className="w-48 gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Combobox
        autoHighlight
        items={items}
        value={selectedItem}
        onValueChange={(next) => {
          onSelectedValueChange(next?.value)
        }}
        itemToStringValue={(item) =>
          item.description ? `${item.label} ${item.description}` : item.label
        }
      >
        <ComboboxInput placeholder={placeholder} showClear={!!selectedItem} />
        <ComboboxContent>
          <ComboboxEmpty>No batches found</ComboboxEmpty>
          <ComboboxList>
            {(item: MultiSelectOption) => (
              <ComboboxItem key={item.value} value={item}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{item.label}</span>
                  {item.description ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}

function NumericFilter({
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
  operator?: CallNumericFilterOperator
  value?: number
  valueMax?: number
  onChange: (next: {
    operator?: CallNumericFilterOperator
    value?: number
    valueMax?: number
  }) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftOperator, setDraftOperator] = useState<CallNumericFilterOperator>(
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
              const operatorValue = nextOperator as CallNumericFilterOperator
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

export function CallsFilters({ filters, onFiltersChange }: CallsFiltersProps) {
  const timeZone = useUserTimeZone()
  const { data: agents = [] } = useQuery({
    queryKey: ["agents", "list"],
    queryFn: () => api.get<AgentsListResponse>("/agents"),
  })
  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["phone-numbers"],
    queryFn: () => api.get<PhoneNumberListResponse>("/phone-numbers"),
  })
  const { data: batchCalls = [] } = useQuery({
    queryKey: ["batch-calls"],
    queryFn: () => api.get<BatchCallListResponse>("/batch-calls"),
  })

  const agentItems = useMemo<MultiSelectOption[]>(
    () =>
      agents.map((agent) => ({
        value: agent.id,
        label: agent.name,
      })),
    [agents]
  )
  const phoneNumberItems = useMemo<MultiSelectOption[]>(
    () =>
      phoneNumbers.map((phoneNumber) => ({
        value: phoneNumber.number,
        label: phoneNumber.number,
      })),
    [phoneNumbers]
  )
  const batchCallItems = useMemo<MultiSelectOption[]>(
    () =>
      batchCalls.map((batchCall) => ({
        value: batchCall.id,
        label: batchCall.name,
        description: formatDate(
          batchCall.scheduledAt ?? batchCall.createdAt,
          timeZone
        ),
      })),
    [batchCalls, timeZone]
  )

  const channelFilter = filters.channel ?? "all"
  const directionFilter = filters.direction ?? "all"
  const statusFilter = filters.status ?? "all"
  const selectedDateRange = filters.startedAtFrom
    ? {
        from: new Date(filters.startedAtFrom),
        to: filters.startedAtTo ? new Date(filters.startedAtTo) : undefined,
      }
    : undefined

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <Field className="w-60 gap-1.5">
        <FieldLabel htmlFor="calls-date-range">Date</FieldLabel>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                id="calls-date-range"
                className={cn(
                  "justify-start px-2.5 font-normal",
                  !selectedDateRange?.from && "text-muted-foreground"
                )}
              />
            }
          >
            <CalendarIcon data-icon="inline-start" />
            {selectedDateRange?.from ? (
              selectedDateRange.to ? (
                <>
                  {formatDate(selectedDateRange.from, timeZone)} -{" "}
                  {formatDate(selectedDateRange.to, timeZone)}
                </>
              ) : (
                formatDate(selectedDateRange.from, timeZone)
              )
            ) : (
              <span>All dates</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={selectedDateRange?.from}
              selected={selectedDateRange}
              numberOfMonths={2}
              onSelect={(range) => {
                if (!range?.from) {
                  onFiltersChange({
                    ...filters,
                    startedAtFrom: undefined,
                    startedAtTo: undefined,
                  })
                  return
                }

                const from = new Date(range.from)
                const to = range.to ? new Date(range.to) : undefined
                const bounds = zonedDayBounds(from, timeZone)

                onFiltersChange({
                  ...filters,
                  startedAtFrom: bounds.start,
                  startedAtTo: to
                    ? zonedDayBounds(to, timeZone).end
                    : undefined,
                })
              }}
            />
          </PopoverContent>
        </Popover>
      </Field>

      <FilterMultiSelect
        label="Agent"
        placeholder="All agents"
        items={agentItems}
        selectedValues={
          Array.isArray(filters.agentIds)
            ? filters.agentIds
            : filters.agentIds
              ? filters.agentIds.split(",")
              : []
        }
        onSelectedValuesChange={(agentIds) =>
          onFiltersChange({
            ...filters,
            agentIds: agentIds.length > 0 ? agentIds : undefined,
          })
        }
      />
      <FilterMultiSelect
        label="From"
        placeholder="All numbers"
        items={phoneNumberItems}
        selectedValues={
          Array.isArray(filters.fromNumbers)
            ? filters.fromNumbers
            : filters.fromNumbers
              ? filters.fromNumbers.split(",")
              : []
        }
        onSelectedValuesChange={(fromNumbers) =>
          onFiltersChange({
            ...filters,
            fromNumbers: fromNumbers.length > 0 ? fromNumbers : undefined,
          })
        }
      />
      <FilterMultiSelect
        label="To"
        placeholder="All numbers"
        items={phoneNumberItems}
        selectedValues={
          Array.isArray(filters.toNumbers)
            ? filters.toNumbers
            : filters.toNumbers
              ? filters.toNumbers.split(",")
              : []
        }
        onSelectedValuesChange={(toNumbers) =>
          onFiltersChange({
            ...filters,
            toNumbers: toNumbers.length > 0 ? toNumbers : undefined,
          })
        }
      />
      <FilterSingleSelect
        label="Batch"
        placeholder="All batches"
        items={batchCallItems}
        selectedValue={filters.batchId}
        onSelectedValueChange={(batchId) =>
          onFiltersChange({
            ...filters,
            batchId,
          })
        }
      />
      <NumericFilter
        label="Duration"
        placeholder="Duration"
        unitAfter="s"
        operator={filters.durationOp}
        value={filters.duration}
        valueMax={filters.durationMax}
        onChange={(next) =>
          onFiltersChange({
            ...filters,
            durationOp: next.operator,
            duration: next.value,
            durationMax: next.valueMax,
          })
        }
      />
      <NumericFilter
        label="Cost"
        placeholder="Cost"
        unitBefore="$"
        operator={filters.costOp}
        value={filters.cost}
        valueMax={filters.costMax}
        onChange={(next) =>
          onFiltersChange({
            ...filters,
            costOp: next.operator,
            cost: next.value,
            costMax: next.valueMax,
          })
        }
      />
      <Field className="w-40 gap-1.5">
        <FieldLabel>Channel</FieldLabel>
        <Select
          value={channelFilter}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              channel: value === "all" ? undefined : (value as CallChannel),
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {
                channelFilterOptions.find(
                  (option) => option.value === channelFilter
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {channelFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field className="w-40 gap-1.5">
        <FieldLabel>Direction</FieldLabel>
        <Select
          value={directionFilter}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              direction: value === "all" ? undefined : (value as CallDirection),
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {
                directionFilterOptions.find(
                  (option) => option.value === directionFilter
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {directionFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field className="w-40 gap-1.5">
        <FieldLabel>Status</FieldLabel>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status: value === "all" ? undefined : (value as CallStatus),
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {
                statusFilterOptions.find(
                  (option) => option.value === statusFilter
                )?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
