import { Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { ContactListQuery } from "@workspace/shared/api/contacts/types"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { DateRangeFilter } from "@/components/filters/date-range-filter"
import { NumericFilter } from "@/components/filters/numeric-filter"
import { useTranslation } from "@/lib/i18n"

type ContactListFilters = Omit<
  ContactListQuery,
  "page" | "pageSize" | "sortBy" | "sortDir"
>

type ContactsFiltersProps = {
  filters: ContactListFilters
  onFiltersChange: (filters: ContactListFilters) => void
}

export function ContactsFilters({
  filters,
  onFiltersChange,
}: ContactsFiltersProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState(filters.q ?? "")
  const filtersRef = useRef(filters)
  const onFiltersChangeRef = useRef(onFiltersChange)
  filtersRef.current = filters
  onFiltersChangeRef.current = onFiltersChange

  useEffect(() => {
    setSearch(filters.q ?? "")
  }, [filters.q])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = search.trim() || undefined
      if (filtersRef.current.q === next) {
        return
      }
      onFiltersChangeRef.current({
        ...filtersRef.current,
        q: next,
      })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [search])

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <Field className="w-85 gap-1.5">
        <FieldLabel htmlFor="contacts-search">
          {t("components.contacts.contacts_filters.search.label")}
        </FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="contacts-search"
            placeholder={t(
              "components.contacts.contacts_filters.search.placeholder"
            )}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </Field>

      <NumericFilter
        label={t("components.contacts.contacts_filters.calls.label")}
        placeholder={t(
          "components.contacts.contacts_filters.calls.placeholder"
        )}
        operator={filters.callCountOp}
        value={filters.callCount}
        valueMax={filters.callCountMax}
        onChange={(next) =>
          onFiltersChange({
            ...filters,
            callCountOp: next.operator,
            callCount: next.value,
            callCountMax: next.valueMax,
          })
        }
      />

      <NumericFilter
        label={t("components.contacts.contacts_filters.total_time.label")}
        placeholder={t(
          "components.contacts.contacts_filters.total_time.placeholder"
        )}
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

      <DateRangeFilter
        id="contacts-first-call"
        label={t("components.contacts.contacts_filters.first_call.label")}
        from={filters.firstCallFrom}
        to={filters.firstCallTo}
        onChange={({ from, to }) =>
          onFiltersChange({
            ...filters,
            firstCallFrom: from,
            firstCallTo: to,
          })
        }
      />

      <DateRangeFilter
        id="contacts-last-call"
        label={t("components.contacts.contacts_filters.last_call.label")}
        from={filters.latestCallFrom}
        to={filters.latestCallTo}
        onChange={({ from, to }) =>
          onFiltersChange({
            ...filters,
            latestCallFrom: from,
            latestCallTo: to,
          })
        }
      />
    </div>
  )
}
