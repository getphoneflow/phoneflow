import { zodResolver } from "@hookform/resolvers/zod"
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
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
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
  const form = useForm<WebhookTool>({
    resolver: zodResolver(webhookToolSchema),
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
          <DialogTitle>Webhook</DialogTitle>
          <DialogDescription>
            Call any external API during the conversation
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
                    <FieldLabel>Name</FieldLabel>
                    <Input
                      {...field}
                      placeholder="tool_name"
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
                    <FieldLabel>Description</FieldLabel>
                    <VariableTextField
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      multiline
                      rows={3}
                      placeholder="Describe what this tool does"
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
                      <FieldLabel>Method</FieldLabel>
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
                      <FieldLabel>URL</FieldLabel>
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
                      <FieldLabel>Timeout (s)</FieldLabel>
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
                      <FieldLabel>Max retries</FieldLabel>
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
                label="Headers"
                keyPlaceholder="Key, e.g. Authorization"
                valuePlaceholder="Value, e.g. Bearer {{api_key}}"
                readOnly={readOnly}
                extraKeys={parameterNames}
              />
              <KeyValueFields
                control={form.control}
                name="queryParameters"
                label="Query parameters"
                keyPlaceholder="Key, e.g. user_id"
                valuePlaceholder="Value, e.g. {{user_id}}"
                readOnly={readOnly}
                extraKeys={parameterNames}
              />
              {bodyMethods.has(method) ? (
                <Controller
                  name="body"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Request body</FieldLabel>
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
              Cancel
            </Button>
            <Button type="submit" disabled={readOnly}>
              Save
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
        Add
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
  const { fields, append, remove } = useFieldArray({
    control,
    name: "parameters",
  })

  return (
    <Field>
      <FieldLabel>Parameters</FieldLabel>
      <FieldDescription className="nth-last-2:mt-0! text-wrap!">
        Values the agent provides when calling this tool. Use {"{{user_id}}"} in
        the URL, headers, query parameters, or body
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
                    placeholder="Parameter name, e.g. user_id"
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
                      {
                        parameterTypes.find(
                          (entry) => entry.value === field.value
                        )?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {parameterTypes.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
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
                placeholder="Description (optional), e.g. The id of {{user_name}}"
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
                  Required
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
        Add parameter
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
  const { fields, append, remove } = useFieldArray({
    control,
    name: "responseVariables",
  })

  return (
    <Field>
      <FieldLabel>Store in variables</FieldLabel>
      <FieldDescription>
        Extract values from the response and store them in variables
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
                  placeholder="Variable name, e.g. user_name"
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
                  placeholder="Response path, e.g. user.name"
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
        Add variable
      </Button>
    </Field>
  )
}
