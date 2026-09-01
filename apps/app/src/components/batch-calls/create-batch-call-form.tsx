import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ChevronDownIcon, DownloadIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import type {
  AgentsListResponse,
  AgentVersionsListResponse,
} from "@workspace/shared/api/agents/types"
import type {
  CreateBatchCallRequest,
  CreateBatchCallResponse,
} from "@workspace/shared/api/batch-calls/types"
import type { PhoneNumberListResponse } from "@workspace/shared/api/phone-numbers/types"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Dropzone } from "@workspace/ui/components/dropzone"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
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
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  downloadCsvTemplate,
  type ParsedCsvRecipient,
  parseRecipientsCsv,
} from "@/components/batch-calls/recipients-csv"
import { RecipientsPreview } from "@/components/batch-calls/recipients-preview"
import {
  AGENT_VERSION_DRAFT_LABEL,
  formatAgentVersionLabel,
} from "@/components/helpers"
import { useUserTimeZone } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { TIME_ZONES, zonedDateTimeToIso } from "@/lib/time"

const formSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    phoneNumberId: z.uuid(),
    agentId: z.uuid(),
    agentVersionId: z.uuid().nullable().optional(),
    triggerMode: z.enum(["now", "schedule"]),
    scheduleTime: z.string().optional(),
    timezone: z.string().optional(),
  })
  .strict()

type FormValues = z.infer<typeof formSchema>

function hasSipConnection(phoneNumber: PhoneNumberListResponse[number]) {
  return Boolean(
    phoneNumber.sipAddress && phoneNumber.sipUsername && phoneNumber.sipPassword
  )
}

export function CreateBatchCallForm() {
  const canCreate = useCheckPermission({ calls: ["create"] })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userTimeZone = useUserTimeZone()

  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [recipients, setRecipients] = useState<ParsedCsvRecipient[]>([])
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phoneNumberId: "",
      agentId: "",
      agentVersionId: null,
      triggerMode: "now",
      scheduleTime: new Date().toTimeString().slice(0, 8),
      timezone: userTimeZone,
    },
  })

  const selectedAgentId = form.watch("agentId") || undefined
  const selectedTimezone = form.watch("timezone") || userTimeZone

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["phone-numbers"],
    queryFn: () => api.get<PhoneNumberListResponse>("/phone-numbers"),
    enabled: canCreate,
  })

  const callablePhoneNumbers = useMemo(
    () => phoneNumbers.filter(hasSipConnection),
    [phoneNumbers]
  )

  const { data: agents = [] } = useQuery({
    queryKey: ["agents", "list"],
    queryFn: () => api.get<AgentsListResponse>("/agents"),
    enabled: canCreate,
  })

  const { data: agentVersions = [] } = useQuery({
    queryKey: ["agents", "versions", selectedAgentId],
    queryFn: () =>
      api.get<AgentVersionsListResponse>(`/agents/${selectedAgentId}/versions`),
    enabled: canCreate && Boolean(selectedAgentId),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateBatchCallRequest) =>
      api.post<CreateBatchCallResponse, CreateBatchCallRequest>(
        "/batch-calls",
        { body }
      ),
    onSuccess: () => {
      toast.success("Batch call triggered")
      queryClient.invalidateQueries({ queryKey: ["batch-calls"] })
      navigate({ to: "/batch-calls" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onFileChange = async (nextFile: File | null) => {
    setFile(nextFile)
    setColumns([])
    setRecipients([])

    if (!nextFile) return

    try {
      const parsed = parseRecipientsCsv(await nextFile.text())
      setColumns(parsed.columns)
      setRecipients(parsed.recipients)
    } catch (error) {
      setFile(null)
      toast.error(error instanceof Error ? error.message : "Invalid CSV")
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    if (recipients.length === 0) {
      toast.error("Upload a CSV with at least one recipient")
      return
    }

    let scheduledAt: string | null = null

    if (values.triggerMode === "schedule") {
      if (!scheduleDate || !values.scheduleTime || !values.timezone) {
        toast.error("Pick a date, time, and timezone")
        return
      }

      scheduledAt = zonedDateTimeToIso(
        scheduleDate,
        values.scheduleTime,
        values.timezone
      )

      if (new Date(scheduledAt).getTime() <= Date.now()) {
        toast.error("Scheduled time must be in the future")
        return
      }
    }

    createMutation.mutate({
      name: values.name,
      phoneNumberId: values.phoneNumberId,
      agentId: values.agentId,
      agentVersionId: values.agentVersionId ?? null,
      recipients,
      scheduledAt,
    })
  })

  const readOnly = !canCreate || createMutation.isPending
  const canSubmit =
    canCreate &&
    recipients.length > 0 &&
    Boolean(form.watch("name")) &&
    Boolean(form.watch("phoneNumberId")) &&
    Boolean(form.watch("agentId"))

  return (
    <div className="grid flex-1 gap-6 p-5 pt-0 lg:grid-cols-[1fr_2fr]">
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-5 overflow-y-auto p-1"
      >
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Batch call name</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Batch call name"
                  autoComplete="off"
                  readOnly={readOnly}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="phoneNumberId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Call from</FieldLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  readOnly={readOnly}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select a phone number">
                      {field.value
                        ? callablePhoneNumbers.find(
                            (phoneNumber) => phoneNumber.id === field.value
                          )?.number
                        : "Select a phone number"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {callablePhoneNumbers.map((phoneNumber) => (
                      <SelectItem key={phoneNumber.id} value={phoneNumber.id}>
                        {phoneNumber.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Field>
            <div className="mb-2 flex items-center justify-between gap-2">
              <FieldLabel>Upload recipients</FieldLabel>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0"
                onClick={downloadCsvTemplate}
              >
                <DownloadIcon />
                Download template
              </Button>
            </div>
            <Dropzone
              accept=".csv,text/csv"
              value={file}
              onValueChange={onFileChange}
              disabled={readOnly}
              className="h-40"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="agentId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Agent</FieldLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("agentVersionId", null)
                    }}
                    readOnly={readOnly}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Select">
                        {field.value
                          ? agents.find((agent) => agent.id === field.value)
                              ?.name
                          : "Select"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="agentVersionId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Version</FieldLabel>
                  <Select
                    value={
                      selectedAgentId ? (field.value ?? "draft") : "no-version"
                    }
                    onValueChange={(value) =>
                      field.onChange(value === "draft" ? null : value)
                    }
                    readOnly={!selectedAgentId || readOnly}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue>
                        {!selectedAgentId
                          ? "Select agent first"
                          : formatAgentVersionLabel(
                              field.value
                                ? agentVersions.find(
                                    (version) => version.id === field.value
                                  )
                                : null
                            )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        {AGENT_VERSION_DRAFT_LABEL}
                      </SelectItem>
                      {agentVersions.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          {formatAgentVersionLabel(version)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            name="triggerMode"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>When to trigger</FieldLabel>
                <Tabs
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="now" disabled={readOnly}>
                      Now
                    </TabsTrigger>
                    <TabsTrigger value="schedule" disabled={readOnly}>
                      Schedule
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="schedule" className="mt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="schedule-date">Date</FieldLabel>
                        <Popover
                          open={datePickerOpen}
                          onOpenChange={setDatePickerOpen}
                        >
                          <PopoverTrigger
                            render={
                              <Button
                                variant="outline"
                                id="schedule-date"
                                data-empty={!scheduleDate}
                                className="w-full justify-between"
                                disabled={readOnly}
                              />
                            }
                          >
                            {scheduleDate
                              ? scheduleDate.toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  timeZone: selectedTimezone,
                                })
                              : "Select date"}
                            <ChevronDownIcon data-icon="inline-end" />
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={scheduleDate}
                              captionLayout="dropdown"
                              defaultMonth={scheduleDate}
                              timeZone={selectedTimezone}
                              disabled={{ before: new Date() }}
                              onSelect={(date) => {
                                setScheduleDate(date)
                                setDatePickerOpen(false)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </Field>

                      <Controller
                        name="scheduleTime"
                        control={form.control}
                        render={({ field: timeField }) => (
                          <Field>
                            <FieldLabel htmlFor={timeField.name}>
                              Time
                            </FieldLabel>
                            <Input
                              {...timeField}
                              id={timeField.name}
                              type="time"
                              step="1"
                              readOnly={readOnly}
                              className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                            />
                          </Field>
                        )}
                      />

                      <Controller
                        name="timezone"
                        control={form.control}
                        render={({ field: timezoneField }) => (
                          <Field className="sm:col-span-2">
                            <FieldLabel htmlFor={timezoneField.name}>
                              Timezone
                            </FieldLabel>
                            <Select
                              value={timezoneField.value}
                              onValueChange={(value) =>
                                value && timezoneField.onChange(value)
                              }
                              disabled={readOnly}
                            >
                              <SelectTrigger
                                id={timezoneField.name}
                                className="w-full min-w-0"
                              >
                                <SelectValue placeholder="Timezone">
                                  {timezoneField.value}
                                </SelectValue>
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
                          </Field>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </Field>
            )}
          />
        </FieldGroup>

        <Button
          type="submit"
          className="w-full"
          disabled={!canSubmit || createMutation.isPending}
        >
          {createMutation.isPending ? <Spinner /> : "Create batch call"}
        </Button>
      </form>

      <RecipientsPreview columns={columns} recipients={recipients} />
    </div>
  )
}
