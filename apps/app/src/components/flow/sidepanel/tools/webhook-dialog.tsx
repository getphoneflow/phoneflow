import { Plus, Trash2 } from "lucide-react"
import { Controller, useFieldArray, useForm } from "react-hook-form"

import { webhookToolSchema } from "@workspace/shared/api/agent-config/schemas"
import type { WebhookTool } from "@workspace/shared/api/agent-config/types"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
  FieldDescription,
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
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

const methods: WebhookTool["method"][] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]

const parameterTypes: {
  value: WebhookTool["parameters"][number]["type"]
  label: string
}[] = [
  {
    value: "string",
    label:
      "components.flow.sidepanel.tools.webhook_dialog.parameters.types.string",
  },
  {
    value: "number",
    label:
      "components.flow.sidepanel.tools.webhook_dialog.parameters.types.number",
  },
  {
    value: "boolean",
    label:
      "components.flow.sidepanel.tools.webhook_dialog.parameters.types.boolean",
  },
]

const bodyMethods = new Set<WebhookTool["method"]>(["POST", "PUT", "PATCH"])

export function createWebhookToolDraft(): WebhookTool {
  return {
    id: crypto.randomUUID(),
    type: "webhook",
    name: "",
    description: "",
    parameters: [],
    method: "POST",
    url: "",
    timeoutMs: 120_000,
    maxRetries: 0,
    headers: [],
    queryParameters: [],
    body: "",
    responseVariables: [],
  }
}

export function WebhookToolDialog({
  open,
  tool,
  readOnly,
  onOpenChange,
  onSave,
}: {
  open: boolean
  tool: WebhookTool
  readOnly: boolean
  onOpenChange: (open: boolean) => void
  onSave: (tool: WebhookTool) => void
}) {
  const { t } = useTranslation()
  const form = useForm<WebhookTool>({
    resolver: zodResolverI18n(webhookToolSchema),
    defaultValues: tool,
    values: tool,
  })
  const method = form.watch("method")
  const parameterNames = form
    .watch("parameters")
    .map((parameter) => parameter.name)
    .filter((name) => name.length > 0)

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset(tool)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-4rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="px-6 pt-6 pr-14 pb-4">
          <DialogTitle>
            {t("components.flow.sidepanel.tools.webhook_dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.flow.sidepanel.tools.webhook_dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={form.handleSubmit(onSave)}
        >
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <FieldGroup className="gap-5 px-6 py-1">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      {t(
                        "components.flow.sidepanel.tools.webhook_dialog.name.label"
                      )}
                    </FieldLabel>
                    <Input
                      {...field}
                      placeholder={t(
                        "components.flow.sidepanel.tools.webhook_dialog.name.placeholder"
                      )}
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
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      {t(
                        "components.flow.sidepanel.tools.webhook_dialog.tool_description.label"
                      )}
                    </FieldLabel>
                    <VariableTextField
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      multiline
                      rows={3}
                      placeholder={t(
                        "components.flow.sidepanel.tools.webhook_dialog.tool_description.placeholder"
                      )}
                      readOnly={readOnly}
                      aria-invalid={fieldState.invalid}
                      onChange={field.onChange}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <ParameterFields control={form.control} readOnly={readOnly} />
              <div className="flex gap-2">
                <Controller
                  name="method"
                  control={form.control}
                  render={({ field }) => (
                    <Field className="w-32">
                      <FieldLabel>
                        {t(
                          "components.flow.sidepanel.tools.webhook_dialog.method.label"
                        )}
                      </FieldLabel>
                      <Select
                        value={field.value}
                        readOnly={readOnly}
                        onValueChange={(value) => {
                          if (
                            value === "GET" ||
                            value === "POST" ||
                            value === "PUT" ||
                            value === "PATCH" ||
                            value === "DELETE"
                          ) {
                            field.onChange(value)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {methods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  name="url"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        {t(
                          "components.flow.sidepanel.tools.webhook_dialog.url.label"
                        )}
                      </FieldLabel>
                      <VariableTextField
                        name={field.name}
                        value={field.value}
                        onBlur={field.onBlur}
                        placeholder="https://api.example.com/users/{{user_id}}"
                        readOnly={readOnly}
                        aria-invalid={fieldState.invalid}
                        extraKeys={parameterNames}
                        onChange={field.onChange}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Controller
                  name="timeoutMs"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        {t(
                          "components.flow.sidepanel.tools.webhook_dialog.timeout.label"
                        )}
                      </FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        max={600}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={
                          Number.isFinite(field.value) ? field.value / 1000 : ""
                        }
                        readOnly={readOnly}
                        aria-invalid={fieldState.invalid}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber * 1000)
                        }
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="maxRetries"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        {t(
                          "components.flow.sidepanel.tools.webhook_dialog.max_retries.label"
                        )}
                      </FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={Number.isFinite(field.value) ? field.value : ""}
                        readOnly={readOnly}
                        aria-invalid={fieldState.invalid}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
              <KeyValueFields
                control={form.control}
                name="headers"
                label={t(
                  "components.flow.sidepanel.tools.webhook_dialog.headers.label"
                )}
                keyPlaceholder={t(
                  "components.flow.sidepanel.tools.webhook_dialog.headers.key_placeholder"
                )}
                valuePlaceholder={t(
                  "components.flow.sidepanel.tools.webhook_dialog.headers.value_placeholder",
                  {
                    api_key: "{{api_key}}",
                  }
                )}
                readOnly={readOnly}
                extraKeys={parameterNames}
              />
              <KeyValueFields
                control={form.control}
                name="queryParameters"
                label={t(
                  "components.flow.sidepanel.tools.webhook_dialog.query_parameters.label"
                )}
                keyPlaceholder={t(
                  "components.flow.sidepanel.tools.webhook_dialog.query_parameters.key_placeholder"
                )}
                valuePlaceholder={t(
                  "components.flow.sidepanel.tools.webhook_dialog.query_parameters.value_placeholder",
                  {
                    user_id: "{{user_id}}",
                  }
                )}
                readOnly={readOnly}
                extraKeys={parameterNames}
              />
              {bodyMethods.has(method) ? (
                <Controller
                  name="body"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        {t(
                          "components.flow.sidepanel.tools.webhook_dialog.body.label"
                        )}
                      </FieldLabel>
                      <VariableTextField
                        name={field.name}
                        value={field.value}
                        onBlur={field.onBlur}
                        multiline
                        rows={6}
                        className="font-mono"
                        placeholder={'{\n  "user_id": "{{user_id}}"\n}'}
                        readOnly={readOnly}
                        aria-invalid={fieldState.invalid}
                        extraKeys={parameterNames}
                        onChange={field.onChange}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              ) : null}
              <ResponseVariableFields
                control={form.control}
                readOnly={readOnly}
              />
            </FieldGroup>
          </div>
          <DialogFooter className="px-6 pt-4 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={readOnly}>
              {t("common.actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function KeyValueFields({
  control,
  name,
  label,
  keyPlaceholder,
  valuePlaceholder,
  readOnly,
  extraKeys,
}: {
  control: ReturnType<typeof useForm<WebhookTool>>["control"]
  name: "headers" | "queryParameters"
  label: string
  keyPlaceholder: string
  valuePlaceholder: string
  readOnly: boolean
  extraKeys: string[]
}) {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({ control, name })

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {fields.map((row, index) => (
        <div key={row.id} className="flex gap-2">
          <Controller
            name={`${name}.${index}.key`}
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-1 flex-col gap-1">
                <VariableTextField
                  name={field.name}
                  value={field.value}
                  onBlur={field.onBlur}
                  placeholder={keyPlaceholder}
                  readOnly={readOnly}
                  aria-invalid={fieldState.invalid}
                  extraKeys={extraKeys}
                  onChange={field.onChange}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </div>
            )}
          />
          <Controller
            name={`${name}.${index}.value`}
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-1 flex-col gap-1">
                <VariableTextField
                  name={field.name}
                  value={field.value}
                  onBlur={field.onBlur}
                  placeholder={valuePlaceholder}
                  readOnly={readOnly}
                  aria-invalid={fieldState.invalid}
                  extraKeys={extraKeys}
                  onChange={field.onChange}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </div>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            className="text-destructive!"
            size="icon-sm"
            disabled={readOnly}
            onClick={() => remove(index)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={readOnly}
        onClick={() => append({ key: "", value: "" })}
      >
        <Plus />
        {t("common.actions.add")}
      </Button>
    </Field>
  )
}

function ParameterFields({
  control,
  readOnly,
}: {
  control: ReturnType<typeof useForm<WebhookTool>>["control"]
  readOnly: boolean
}) {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "parameters",
  })

  return (
    <Field>
      <FieldLabel>
        {t("components.flow.sidepanel.tools.webhook_dialog.parameters.label")}
      </FieldLabel>
      <FieldDescription className="nth-last-2:mt-0! text-wrap!">
        {t(
          "components.flow.sidepanel.tools.webhook_dialog.parameters.description",
          { user_id: "{{user_id}}" }
        )}
      </FieldDescription>
      {fields.map((row, index) => (
        <div
          key={row.id}
          className="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <div className="flex gap-2">
            <Controller
              name={`parameters.${index}.name`}
              control={control}
              render={({ field, fieldState }) => (
                <div className="flex flex-1 flex-col gap-1">
                  <Input
                    {...field}
                    placeholder={t(
                      "components.flow.sidepanel.tools.webhook_dialog.parameters.name_placeholder"
                    )}
                    readOnly={readOnly}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </div>
              )}
            />
            <Controller
              name={`parameters.${index}.type`}
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  readOnly={readOnly}
                  onValueChange={(value) => {
                    if (
                      value === "string" ||
                      value === "number" ||
                      value === "boolean"
                    ) {
                      field.onChange(value)
                    }
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue>
                      {t(
                        parameterTypes.find(
                          (entry) => entry.value === field.value
                        )?.label ?? parameterTypes[0].label
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {parameterTypes.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {t(label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              className="text-destructive!"
              size="icon-sm"
              disabled={readOnly}
              onClick={() => remove(index)}
            >
              <Trash2 />
            </Button>
          </div>
          <Controller
            name={`parameters.${index}.description`}
            control={control}
            render={({ field }) => (
              <VariableTextField
                name={field.name}
                value={field.value}
                onBlur={field.onBlur}
                multiline
                rows={2}
                placeholder={t(
                  "components.flow.sidepanel.tools.webhook_dialog.parameters.description_placeholder",
                  {
                    user_name: "{{user_name}}",
                  }
                )}
                readOnly={readOnly}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name={`parameters.${index}.required`}
            control={control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id={`webhook-parameter-${index}-required`}
                  checked={field.value}
                  disabled={readOnly}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
                <FieldLabel htmlFor={`webhook-parameter-${index}-required`}>
                  {t(
                    "components.flow.sidepanel.tools.webhook_dialog.parameters.required"
                  )}
                </FieldLabel>
              </Field>
            )}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={readOnly}
        onClick={() =>
          append({
            name: "",
            type: "string",
            description: "",
            required: true,
          })
        }
      >
        <Plus />
        {t("components.flow.sidepanel.tools.webhook_dialog.parameters.add")}
      </Button>
    </Field>
  )
}

function ResponseVariableFields({
  control,
  readOnly,
}: {
  control: ReturnType<typeof useForm<WebhookTool>>["control"]
  readOnly: boolean
}) {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "responseVariables",
  })

  return (
    <Field>
      <FieldLabel>
        {t(
          "components.flow.sidepanel.tools.webhook_dialog.response_variables.label"
        )}
      </FieldLabel>
      <FieldDescription>
        {t(
          "components.flow.sidepanel.tools.webhook_dialog.response_variables.description"
        )}
      </FieldDescription>
      {fields.map((row, index) => (
        <div key={row.id} className="flex gap-2">
          <Controller
            name={`responseVariables.${index}.name`}
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-1 flex-col gap-1">
                <Input
                  {...field}
                  placeholder={t(
                    "components.flow.sidepanel.tools.webhook_dialog.response_variables.name_placeholder"
                  )}
                  readOnly={readOnly}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </div>
            )}
          />
          <Controller
            name={`responseVariables.${index}.path`}
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-1 flex-col gap-1">
                <Input
                  {...field}
                  placeholder={t(
                    "components.flow.sidepanel.tools.webhook_dialog.response_variables.path_placeholder"
                  )}
                  readOnly={readOnly}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </div>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            className="text-destructive!"
            size="icon-sm"
            disabled={readOnly}
            onClick={() => remove(index)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={readOnly}
        onClick={() => append({ name: "", path: "" })}
      >
        <Plus />
        {t(
          "components.flow.sidepanel.tools.webhook_dialog.response_variables.add"
        )}
      </Button>
    </Field>
  )
}
