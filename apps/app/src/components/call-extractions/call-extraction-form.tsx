import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, XIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import type { AgentsListResponse } from "@workspace/shared/api/agents/types"
import { callExtractionRequestSchema } from "@workspace/shared/api/call-extractions/schemas"
import type {
  CallExtractionListResponse,
  CallExtractionRequest,
  CallExtractionResponse,
} from "@workspace/shared/api/call-extractions/types"
import {
  CALL_EXTRACTION_MODEL_LABELS,
  CALL_EXTRACTION_MODELS,
  type CallExtractionModel,
  DEFAULT_CALL_EXTRACTION_MODEL,
} from "@workspace/shared/call-extraction/constants"
import { Button } from "@workspace/ui/components/button"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
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
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

const schemaTypes = ["boolean", "string", "number"] as const

type AgentOption = {
  value: string
  label: string
}

export function CallExtractionForm({
  open,
  extraction,
  onOpenChange,
}: {
  open: boolean
  extraction?: CallExtractionListResponse[number]
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const anchor = useComboboxAnchor()
  const form = useForm({
    resolver: zodResolverI18n(callExtractionRequestSchema),
    defaultValues: {
      name: extraction?.name ?? "",
      description: extraction?.description ?? "",
      model: (extraction?.model ??
        DEFAULT_CALL_EXTRACTION_MODEL) as CallExtractionModel,
      schema: extraction?.schema ?? { type: "string", choices: [] },
      agentIds: extraction?.agents.map((agent) => agent.agentId) ?? [],
    },
  })
  const schema = form.watch("schema")
  const choices = schema.type === "string" ? (schema.choices ?? []) : []

  const agents = useQuery({
    queryKey: ["agents", "list"],
    queryFn: () => api.get<AgentsListResponse>("/agents"),
    enabled: open,
  })
  const agentItems: AgentOption[] = (agents.data ?? []).map((agent) => ({
    value: agent.id,
    label: agent.name,
  }))

  const save = useMutation({
    mutationFn: (body: CallExtractionRequest) =>
      extraction
        ? api.patch<CallExtractionResponse, CallExtractionRequest>(
            `/call-extractions/${extraction.id}`,
            { body }
          )
        : api.post<CallExtractionResponse, CallExtractionRequest>(
            "/call-extractions",
            { body }
          ),
    onSuccess: () => {
      toast.success(
        extraction
          ? t("components.call_extractions.form.toasts.updated")
          : t("components.call_extractions.form.toasts.created")
      )
      if (!extraction) form.reset()
      save.reset()
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["call-extractions"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function handleOpenChange(next: boolean) {
    if (!extraction || !next) form.reset()
    if (!next) save.reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {extraction
              ? t("components.call_extractions.form.edit_title")
              : t("components.call_extractions.form.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.call_extractions.form.description")}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={form.handleSubmit((body) => save.mutate(body))}
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>
                    {t("components.call_extractions.form.name.label")}
                  </FieldLabel>
                  <Input
                    {...field}
                    placeholder={t(
                      "components.call_extractions.form.name.placeholder"
                    )}
                    aria-invalid={fieldState.invalid}
                    disabled={save.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="schema.type"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>
                    {t("components.call_extractions.form.format.label")}
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value === "boolean") {
                        form.setValue("schema", { type: "boolean" })
                      }
                      if (value === "string") {
                        const current = form.getValues("schema")
                        form.setValue("schema", {
                          type: "string",
                          choices:
                            current.type === "string" ? current.choices : [],
                        })
                      }
                      if (value === "number") {
                        const current = form.getValues("schema")
                        form.setValue(
                          "schema",
                          current.type === "number"
                            ? current
                            : { type: "number" }
                        )
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {t(
                          `components.call_extractions.form.format.options.${field.value}`
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {schemaTypes.map((schemaType) => (
                        <SelectItem key={schemaType} value={schemaType}>
                          {t(
                            `components.call_extractions.form.format.options.${schemaType}`
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>
                    {t("components.call_extractions.form.prompt.label")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    rows={4}
                    placeholder={t(
                      `components.call_extractions.form.prompt.placeholders.${schema.type}`
                    )}
                    aria-invalid={fieldState.invalid}
                    disabled={save.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            {schema.type === "string" ? (
              <FieldGroup className="gap-4">
                <FieldLabel>
                  {t("components.call_extractions.form.choices.label")}
                </FieldLabel>
                {choices.map((_, index) => (
                  <Controller
                    key={`${index}`}
                    name={`schema.choices.${index}`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <div className="flex gap-2">
                        <Field
                          data-invalid={fieldState.invalid}
                          className="min-w-0 flex-1"
                        >
                          <Input
                            {...field}
                            placeholder={t(
                              "components.call_extractions.form.choices.placeholder"
                            )}
                            aria-invalid={fieldState.invalid}
                            disabled={save.isPending}
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="mt-0.5 shrink-0"
                          onClick={() => {
                            const current = form.getValues("schema")
                            if (current.type !== "string") return
                            form.setValue("schema", {
                              type: "string",
                              choices: current.choices.filter(
                                (_, choiceIndex) => choiceIndex !== index
                              ),
                            })
                          }}
                          disabled={save.isPending}
                          aria-label={t(
                            "components.call_extractions.form.choices.remove",
                            { index: index + 1 }
                          )}
                        >
                          <XIcon />
                        </Button>
                      </div>
                    )}
                  />
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const current = form.getValues("schema")
                    if (current.type !== "string") return
                    form.setValue("schema", {
                      type: "string",
                      choices: [...current.choices, ""],
                    })
                  }}
                  disabled={save.isPending}
                >
                  <PlusIcon />
                  {t("components.call_extractions.form.choices.add")}
                </Button>
              </FieldGroup>
            ) : null}
            {schema.type === "number" ? (
              <div className="grid gap-4 grid-cols-2">
                <Controller
                  name="schema.minimum"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        {t("components.call_extractions.form.bounds.minimum")}
                      </FieldLabel>
                      <Input
                        name={field.name}
                        ref={field.ref}
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          field.onChange(
                            event.target.value === ""
                              ? undefined
                              : event.target.valueAsNumber
                          )
                        }}
                        placeholder={t(
                          "components.call_extractions.form.bounds.placeholder"
                        )}
                        aria-invalid={fieldState.invalid}
                        disabled={save.isPending}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="schema.maximum"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        {t("components.call_extractions.form.bounds.maximum")}
                      </FieldLabel>
                      <Input
                        name={field.name}
                        ref={field.ref}
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          field.onChange(
                            event.target.value === ""
                              ? undefined
                              : event.target.valueAsNumber
                          )
                        }}
                        placeholder={t(
                          "components.call_extractions.form.bounds.placeholder"
                        )}
                        aria-invalid={fieldState.invalid}
                        disabled={save.isPending}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
            ) : null}
            <Controller
              name="model"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>
                    {t("components.call_extractions.form.model.label")}
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (
                        value &&
                        CALL_EXTRACTION_MODELS.includes(
                          value as CallExtractionModel
                        )
                      ) {
                        field.onChange(value)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {field.value
                          ? CALL_EXTRACTION_MODEL_LABELS[field.value]
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_EXTRACTION_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                          {CALL_EXTRACTION_MODEL_LABELS[model]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              name="agentIds"
              control={form.control}
              render={({ field, fieldState }) => {
                const selected = agentItems.filter((agent) =>
                  (field.value ?? []).includes(agent.value)
                )
                return (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      {t("components.call_extractions.form.agents.label")}
                    </FieldLabel>
                    <Combobox
                      multiple
                      autoHighlight
                      items={agentItems}
                      value={selected}
                      onValueChange={(next: AgentOption[] | null) => {
                        field.onChange((next ?? []).map((agent) => agent.value))
                      }}
                      itemToStringValue={(agent) => agent.label}
                      isItemEqualToValue={(item, value) =>
                        item.value === value.value
                      }
                    >
                      <ComboboxChips ref={anchor}>
                        <ComboboxValue>
                          {(selectedAgents: AgentOption[] | undefined) => {
                            const agents = selectedAgents ?? []
                            return (
                              <>
                                {agents.map((agent) => (
                                  <ComboboxChip key={agent.value}>
                                    {agent.label}
                                  </ComboboxChip>
                                ))}
                                <ComboboxChipsInput
                                  placeholder={
                                    agents.length === 0
                                      ? t(
                                          "components.call_extractions.form.agents.placeholder"
                                        )
                                      : undefined
                                  }
                                />
                              </>
                            )
                          }}
                        </ComboboxValue>
                      </ComboboxChips>
                      <ComboboxContent anchor={anchor} className="z-[60]">
                        <ComboboxInput
                          showTrigger={false}
                          placeholder={t("common.actions.search")}
                        />
                        <ComboboxEmpty>
                          {t("components.call_extractions.form.agents.empty")}
                        </ComboboxEmpty>
                        <ComboboxList>
                          {(agent: AgentOption) => (
                            <ComboboxItem key={agent.value} value={agent}>
                              {agent.label}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )
              }}
            />
          </FieldGroup>
          <DialogFooter className="mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={save.isPending}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? (
                <Spinner className="mx-4" />
              ) : extraction ? (
                t("common.actions.save")
              ) : (
                t("common.actions.create")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
