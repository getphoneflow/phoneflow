import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import type { AgentsListResponse } from "@workspace/shared/api/agents/types"
import type { BatchCallListResponse } from "@workspace/shared/api/batch-calls/types"
import type {
  CallChannel,
  CallDirection,
  CallListQuery,
  CallStatus,
} from "@workspace/shared/api/calls/types"
import type { PhoneNumberListResponse } from "@workspace/shared/api/phone-numbers/types"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { DateRangeFilter } from "@/components/filters/date-range-filter"
import {
  FilterMultiSelect,
  type MultiSelectOption,
} from "@/components/filters/filter-multi-select"
import {
  FilterSingleSelect,
  type SingleSelectOption,
} from "@/components/filters/filter-single-select"
import { NumericFilter } from "@/components/filters/numeric-filter"
import { useUserTimeZone } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"
import { env } from "@/lib/env"
import { useTranslation } from "@/lib/i18n"
import { formatDate } from "@/lib/time"

const channelFilterOptionKeys = [
  {
    value: "all",
    label: "components.calls.calls_filters.channel.all",
  },
  {
    value: "phone_call",
    label: "components.calls.calls_filters.channel.phone_call",
  },
  {
    value: "web_call",
    label: "components.calls.calls_filters.channel.web_call",
  },
]

const directionFilterOptionKeys = [
  {
    value: "all",
    label: "components.calls.calls_filters.direction.all",
  },
  {
    value: "inbound",
    label: "components.calls.calls_filters.direction.inbound",
  },
  {
    value: "outbound",
    label: "components.calls.calls_filters.direction.outbound",
  },
]

const statusFilterOptionKeys = [
  { value: "all", label: "components.calls.calls_filters.status.all" },
  {
    value: "completed",
    label: "components.calls.calls_filters.status.completed",
  },
  {
    value: "in_progress",
    label: "components.calls.calls_filters.status.in_progress",
  },
  {
    value: "no_answer",
    label: "components.calls.calls_filters.status.no_answer",
  },
  {
    value: "failed",
    label: "components.calls.calls_filters.status.failed",
  },
]

type FilterOptionKey = { value: string; label: string }

type CallListFilters = Omit<
  CallListQuery,
  "page" | "pageSize" | "sortBy" | "sortDir"
>

type CallsFiltersProps = {
  filters: CallListFilters
  onFiltersChange: (filters: CallListFilters) => void
}

export function CallsFilters({ filters, onFiltersChange }: CallsFiltersProps) {
  const { t } = useTranslation()
  const timeZone = useUserTimeZone()
  const translateOptions = (options: FilterOptionKey[]) =>
    options.map((option) => ({ ...option, label: t(option.label) }))
  const channelFilterOptions = translateOptions(channelFilterOptionKeys)
  const directionFilterOptions = translateOptions(directionFilterOptionKeys)
  const statusFilterOptions = translateOptions(statusFilterOptionKeys)
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
  const batchCallItems = useMemo<SingleSelectOption[]>(
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

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <DateRangeFilter
        id="calls-date-range"
        label={t("components.calls.calls_filters.date.label")}
        from={filters.startedAtFrom}
        to={filters.startedAtTo}
        onChange={({ from, to }) =>
          onFiltersChange({
            ...filters,
            startedAtFrom: from,
            startedAtTo: to,
          })
        }
      />

      <FilterMultiSelect
        label={t("components.calls.calls_filters.agent.label")}
        placeholder={t("components.calls.calls_filters.agent.placeholder")}
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
        label={t("components.calls.calls_filters.from.label")}
        placeholder={t("components.calls.calls_filters.from.placeholder")}
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
        label={t("components.calls.calls_filters.to.label")}
        placeholder={t("components.calls.calls_filters.to.placeholder")}
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
        label={t("components.calls.calls_filters.batch.label")}
        placeholder={t("components.calls.calls_filters.batch.placeholder")}
        items={batchCallItems}
        selectedValue={filters.batchId}
        emptyText={t("components.calls.calls_filters.batch.empty")}
        onSelectedValueChange={(batchId) =>
          onFiltersChange({
            ...filters,
            batchId,
          })
        }
      />
      <NumericFilter
        label={t("components.calls.calls_filters.duration.label")}
        placeholder={t("components.calls.calls_filters.duration.placeholder")}
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
      {env.IS_CLOUD ? (
        <NumericFilter
          label={t("components.calls.calls_filters.cost.label")}
          placeholder={t("components.calls.calls_filters.cost.placeholder")}
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
      ) : null}
      <Field className="w-40 gap-1.5">
        <FieldLabel>
          {t("components.calls.calls_filters.channel.label")}
        </FieldLabel>
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
        <FieldLabel>
          {t("components.calls.calls_filters.direction.label")}
        </FieldLabel>
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
        <FieldLabel>
          {t("components.calls.calls_filters.status.label")}
        </FieldLabel>
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
