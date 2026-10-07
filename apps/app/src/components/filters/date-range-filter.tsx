import { cn } from "cn"
import { CalendarIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { useUserTimeZone } from "@/components/user-timezone-provider"
import { formatDate, zonedDayBounds } from "@/lib/time"

export function DateRangeFilter({
  id,
  label,
  from,
  to,
  onChange,
}: {
  id: string
  label: string
  from?: string
  to?: string
  onChange: (next: { from?: string; to?: string }) => void
}) {
  const timeZone = useUserTimeZone()
  const selectedDateRange = from
    ? {
        from: new Date(from),
        to: to ? new Date(to) : undefined,
      }
    : undefined

  return (
    <Field className="w-60 gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id={id}
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
                onChange({ from: undefined, to: undefined })
                return
              }

              const rangeFrom = new Date(range.from)
              const rangeTo = range.to ? new Date(range.to) : undefined
              const bounds = zonedDayBounds(rangeFrom, timeZone)

              onChange({
                from: bounds.start,
                to: rangeTo ? zonedDayBounds(rangeTo, timeZone).end : undefined,
              })
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
