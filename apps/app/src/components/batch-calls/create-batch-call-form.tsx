import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ChevronDownIcon, DownloadIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import type {
  AgentConfigResponse,
  AgentsListResponse,
  AgentVersionConfigResponse,
  AgentVersionsListResponse,
} from "@workspace/shared/api/agents/types"
import type {
  CreateBatchCallRequest,
  CreateBatchCallResponse,
} from "@workspace/shared/api/batch-calls/types"
import type {
  CheckDoNotCallRequest,
  CheckDoNotCallResponse,
} from "@workspace/shared/api/do-not-call/types"
import type { PhoneNumberListResponse } from "@workspace/shared/api/phone-numbers/types"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Dropzone } from "@workspace/ui/components/dropzone"
import {
  Field,
  FieldDescription,
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
import { formatAgentVersionLabel } from "@/components/helpers"
import { useUserTimeZone } from "@/components/user-timezone-provider"
import { captureEvent } from "@/lib/analytics"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { type TFunction, useTranslation } from "@/lib/i18n"
import { TIME_ZONES, zonedDateTimeToIso } from "@/lib/time"
import { zodResolverI18n } from "@/lib/zod-resolver"

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

type ParsedRecipients = {
  columns: string[]
  recipients: ParsedCsvRecipient[]
  error: string | null
}

const emptyRecipients: ParsedRecipients = {
  columns: [],
  recipients: [],
  error: null,
}

function readRecipients(
  text: string,
  keys: string[],
  t: TFunction
): ParsedRecipients {
  try {
    const parsed = parseRecipientsCsv(text, keys, t)
    return { ...parsed, error: null }
  } catch (error) {
    return {
      ...emptyRecipients,
      error:
        error instanceof Error
          ? error.message
          : t(
              "components.batch_calls.create_batch_call_form.errors.invalid_csv"
            ),
    }
  }
}

export function CreateBatchCallForm() {
  const { t } = useTranslation()
  const canCreate = useCheckPermission({ calls: ["create"] })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userTimeZone = useUserTimeZone()

  const [csvFile, setCsvFile] = useState<{
    file: File
    text: string | null
  } | null>(null)
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolverI18n(formSchema),
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
  const selectedVersionId = form.watch("agentVersionId") || undefined
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

  const selectedVersionNumber = selectedVersionId
    ? agentVersions.find((version) => version.id === selectedVersionId)?.number
    : undefined

  const { data: agentConfig } = useQuery({
    queryKey: ["agent-config", selectedAgentId, selectedVersionId ?? "draft"],
    queryFn: () =>
      selectedVersionId
        ? api.get<AgentVersionConfigResponse>(
            `/agents/${selectedAgentId}/versions/${selectedVersionNumber}/config`
          )
        : api.get<AgentConfigResponse>(`/agents/${selectedAgentId}/config`),
    enabled:
      canCreate &&
      Boolean(selectedAgentId) &&
      (!selectedVersionId || selectedVersionNumber !== undefined),
  })

  const variableKeys = useMemo(
    () => agentConfig?.dynamicVariables.map((variable) => variable.key) ?? [],
    [agentConfig]
  )
  const parsedRecipients = useMemo(() => {
    if (!csvFile?.text || (selectedAgentId && !agentConfig)) {
      return emptyRecipients
    }
    return readRecipients(csvFile.text, variableKeys, t)
  }, [agentConfig, csvFile?.text, selectedAgentId, variableKeys])

  const recipientNumbers = useMemo(
    () => parsedRecipients.recipients.map((recipient) => recipient.toNumber),
    [parsedRecipients.recipients]
  )

  const { data: doNotCallCheck } = useQuery({
    queryKey: ["do-not-call", "check", recipientNumbers],
    queryFn: () =>
      api.post<CheckDoNotCallResponse, CheckDoNotCallRequest>(
        "/do-not-call/check",
        { body: { numbers: recipientNumbers } }
      ),
    enabled: recipientNumbers.length > 0 && recipientNumbers.length <= 500,
  })

  const doNotCallNumbers = useMemo(
    () => new Set(doNotCallCheck?.numbers),
    [doNotCallCheck]
  )
  const doNotCallCount = recipientNumbers.filter((number) =>
    doNotCallNumbers.has(number)
  ).length

  const createMutation = useMutation({
    mutationFn: (body: CreateBatchCallRequest) =>
      api.post<CreateBatchCallResponse, CreateBatchCallRequest>(
        "/batch-calls",
        { body }
      ),
    onSuccess: (batchCall) => {
      captureEvent("batch_call_created", { batch_call_id: batchCall.id })
      toast.success(
        t("components.batch_calls.create_batch_call_form.toasts.created")
      )
      if (batchCall.doNotCallCount > 0) {
        toast.warning(
          t("components.batch_calls.create_batch_call_form.do_not_call_count", {
            count: batchCall.doNotCallCount,
          })
        )
      }
      queryClient.invalidateQueries({ queryKey: ["batch-calls"] })
      navigate({ to: "/batch-calls" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onFileChange = async (nextFile: File | null) => {
    if (!nextFile) {
      setCsvFile(null)
      return
    }

    setCsvFile({ file: nextFile, text: null })
    const text = await nextFile.text()
    setCsvFile((current) =>
      current?.file === nextFile ? { file: nextFile, text } : current
    )
  }

  const onSubmit = form.handleSubmit((values) => {
    if (parsedRecipients.recipients.length === 0) {
      toast.error(
        t("components.batch_calls.create_batch_call_form.errors.no_recipients")
      )
      return
    }

    let scheduledAt: string | null = null

    if (values.triggerMode === "schedule") {
      if (!scheduleDate || !values.scheduleTime || !values.timezone) {
        toast.error(
          t(
            "components.batch_calls.create_batch_call_form.errors.schedule_required"
          )
        )
        return
      }

      scheduledAt = zonedDateTimeToIso(
        scheduleDate,
        values.scheduleTime,
        values.timezone
      )

      if (new Date(scheduledAt).getTime() <= Date.now()) {
        toast.error(
          t(
            "components.batch_calls.create_batch_call_form.errors.schedule_in_past"
          )
        )
        return
      }
    }

    createMutation.mutate({
      name: values.name,
      phoneNumberId: values.phoneNumberId,
      agentId: values.agentId,
      agentVersionId: values.agentVersionId ?? null,
      recipients: parsedRecipients.recipients,
      scheduledAt,
    })
  })

  const readOnly = !canCreate || createMutation.isPending
  const canSubmit =
    canCreate &&
    parsedRecipients.recipients.length > 0 &&
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
                <FieldLabel htmlFor={field.name}>
                  {t(
                    "components.batch_calls.create_batch_call_form.name.label"
                  )}
                </FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder={t(
                    "components.batch_calls.create_batch_call_form.name.placeholder"
                  )}
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
                <FieldLabel htmlFor={field.name}>
                  {t(
                    "components.batch_calls.create_batch_call_form.phone_number.label"
                  )}
                </FieldLabel>
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  readOnly={readOnly}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue
                      placeholder={t(
                        "components.batch_calls.create_batch_call_form.phone_number.placeholder"
                      )}
                    >
                      {field.value
                        ? callablePhoneNumbers.find(
                            (phoneNumber) => phoneNumber.id === field.value
                          )?.number
                        : t(
                            "components.batch_calls.create_batch_call_form.phone_number.placeholder"
                          )}
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
              <FieldLabel>
                {t(
                  "components.batch_calls.create_batch_call_form.recipients.label"
                )}
              </FieldLabel>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0"
                onClick={() => downloadCsvTemplate(variableKeys)}
              >
                <DownloadIcon />
                {t(
                  "components.batch_calls.create_batch_call_form.recipients.download_template"
                )}
              </Button>
            </div>
            <Dropzone
              accept=".csv,text/csv"
              value={csvFile?.file ?? null}
              onValueChange={onFileChange}
              disabled={readOnly}
              className="h-40"
              placeholder={t(
                "components.batch_calls.create_batch_call_form.recipients.placeholder"
              )}
            />
            {parsedRecipients.error ? (
              <FieldError>{parsedRecipients.error}</FieldError>
            ) : null}
            {doNotCallCount > 0 ? (
              <FieldDescription>
                {t(
                  "components.batch_calls.create_batch_call_form.do_not_call_count",
                  { count: doNotCallCount }
                )}
              </FieldDescription>
            ) : null}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="agentId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t(
                      "components.batch_calls.create_batch_call_form.agent.label"
                    )}
                  </FieldLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("agentVersionId", null)
                    }}
                    readOnly={readOnly}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue
                        placeholder={t(
                          "components.batch_calls.create_batch_call_form.agent.placeholder"
                        )}
                      >
                        {field.value
                          ? agents.find((agent) => agent.id === field.value)
                              ?.name
                          : t(
                              "components.batch_calls.create_batch_call_form.agent.placeholder"
                            )}
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
                  <FieldLabel htmlFor={field.name}>
                    {t(
                      "components.batch_calls.create_batch_call_form.version.label"
                    )}
                  </FieldLabel>
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
                          ? t(
                              "components.batch_calls.create_batch_call_form.version.select_agent_first"
                            )
                          : formatAgentVersionLabel(
                              field.value
                                ? agentVersions.find(
                                    (version) => version.id === field.value
                                  )
                                : null,
                              t
                            )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        {t("components.helpers.agent_version_draft")}
                      </SelectItem>
                      {agentVersions.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          {formatAgentVersionLabel(version, t)}
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
                <FieldLabel>
                  {t(
                    "components.batch_calls.create_batch_call_form.trigger.label"
                  )}
                </FieldLabel>
                <Tabs
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="now" disabled={readOnly}>
                      {t(
                        "components.batch_calls.create_batch_call_form.trigger.now"
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="schedule" disabled={readOnly}>
                      {t(
                        "components.batch_calls.create_batch_call_form.trigger.schedule"
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="schedule" className="mt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="schedule-date">
                          {t(
                            "components.batch_calls.create_batch_call_form.schedule.date.label"
                          )}
                        </FieldLabel>
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
                              : t(
                                  "components.batch_calls.create_batch_call_form.schedule.date.placeholder"
                                )}
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
                              {t(
                                "components.batch_calls.create_batch_call_form.schedule.time.label"
                              )}
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
                              {t(
                                "components.batch_calls.create_batch_call_form.schedule.timezone.label"
                              )}
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
                                <SelectValue
                                  placeholder={t(
                                    "components.batch_calls.create_batch_call_form.schedule.timezone.placeholder"
                                  )}
                                >
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
          {createMutation.isPending ? (
            <Spinner />
          ) : (
            t("components.batch_calls.create_batch_call_form.submit")
          )}
        </Button>
      </form>

      <RecipientsPreview
        columns={parsedRecipients.columns}
        recipients={parsedRecipients.recipients}
        doNotCallNumbers={doNotCallNumbers}
      />
    </div>
  )
}
