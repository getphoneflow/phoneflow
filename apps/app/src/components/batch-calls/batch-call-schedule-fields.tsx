import type { FieldErrors } from "react-hook-form"

import type { BatchCallSchedule } from "@workspace/shared/api/batch-calls/types"
import {
  Field,
  FieldDescription,
  FieldError,
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
import { Toggle } from "@workspace/ui/components/toggle"
import { useTranslation } from "@/lib/i18n"
import { TIME_ZONES } from "@/lib/time"

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function BatchCallScheduleFields({
  value,
  onChange,
  errors,
  readOnly,
}: {
  value: BatchCallSchedule
  onChange: (value: BatchCallSchedule) => void
  errors?: FieldErrors<BatchCallSchedule>
  readOnly: boolean
}) {
  const { t } = useTranslation()

  const toggleDay = (day: number, pressed: boolean) => {
    onChange({
      ...value,
      days: pressed
        ? [...value.days, day]
        : value.days.filter((item) => item !== day),
    })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2" data-invalid={Boolean(errors?.days)}>
        <FieldLabel>
          {t("components.batch_calls.schedule_fields.days.label")}
        </FieldLabel>
        <div className="flex flex-wrap gap-1">
          {WEEK_ORDER.map((day) => (
            <Toggle
              key={day}
              variant="outline"
              size="sm"
              pressed={value.days.includes(day)}
              disabled={readOnly}
              onPressedChange={(pressed) => toggleDay(day, pressed)}
            >
              {t(`common.weekdays_short.${day}`)}
            </Toggle>
          ))}
        </div>
        {errors?.days && <FieldError errors={[errors.days]} />}
      </Field>

      <Field data-invalid={Boolean(errors?.startTime)}>
        <FieldLabel htmlFor="schedule-start-time">
          {t("components.batch_calls.schedule_fields.start_time")}
        </FieldLabel>
        <Input
          id="schedule-start-time"
          type="time"
          value={value.startTime}
          readOnly={readOnly}
          onChange={(event) =>
            onChange({ ...value, startTime: event.target.value })
          }
          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
        {errors?.startTime && <FieldError errors={[errors.startTime]} />}
      </Field>

      <Field data-invalid={Boolean(errors?.endTime)}>
        <FieldLabel htmlFor="schedule-end-time">
          {t("components.batch_calls.schedule_fields.end_time")}
        </FieldLabel>
        <Input
          id="schedule-end-time"
          type="time"
          value={value.endTime}
          readOnly={readOnly}
          onChange={(event) =>
            onChange({ ...value, endTime: event.target.value })
          }
          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
        {errors?.endTime && <FieldError errors={[errors.endTime]} />}
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="schedule-window-timezone">
          {t("components.batch_calls.schedule_fields.timezone")}
        </FieldLabel>
        <Select
          value={value.timezone}
          onValueChange={(timezone) =>
            timezone && onChange({ ...value, timezone })
          }
          disabled={readOnly}
        >
          <SelectTrigger
            id="schedule-window-timezone"
            className="w-full min-w-0"
          >
            <SelectValue>{value.timezone}</SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            align="start"
            className="max-h-72"
          >
            {TIME_ZONES.map((timeZone) => (
              <SelectItem key={timeZone} value={timeZone}>
                {timeZone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          {t("components.batch_calls.schedule_fields.description")}
        </FieldDescription>
      </Field>
    </div>
  )
}
