import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { Controller, useFieldArray, useForm } from "react-hook-form"

import { extractVariablesToolSchema } from "@workspace/shared/api/agent-config/schemas"
import type {
  ExtractVariable,
  ExtractVariablesTool,
} from "@workspace/shared/api/agent-config/types"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Field, FieldError, FieldGroup } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { VariableTextField } from "@/components/flow/variables/variable-text-field"

const variableTypes: { value: ExtractVariable["type"]; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
]

export function createExtractVariablesDraft(): ExtractVariablesTool {
  return {
    variables: [{ key: "", type: "string", description: "" }],
  }
}

export function ExtractVariablesDialog({
  open,
  tool,
  readOnly,
  onOpenChange,
  onSave,
}: {
  open: boolean
  tool: ExtractVariablesTool
  readOnly: boolean
  onOpenChange: (open: boolean) => void
  onSave: (tool: ExtractVariablesTool) => void
}) {
  const form = useForm<ExtractVariablesTool>({
    resolver: zodResolver(extractVariablesToolSchema),
    defaultValues: tool,
    values: tool,
  })
  const variables = useFieldArray({
    control: form.control,
    name: "variables",
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset(tool)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Extract variables</DialogTitle>
          <DialogDescription>
            Extract variables from the conversation
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={form.handleSubmit(onSave)}
        >
          <FieldGroup className="gap-4">
            {variables.fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col gap-2 rounded-md border border-border p-3"
              >
                <div className="flex items-start gap-2">
                  <Controller
                    name={`variables.${index}.key`}
                    control={form.control}
                    render={({ field: keyField, fieldState }) => (
                      <Field
                        className="min-w-0 flex-1"
                        data-invalid={fieldState.invalid}
                      >
                        <Input
                          {...keyField}
                          placeholder="variable_name"
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
                    name={`variables.${index}.type`}
                    control={form.control}
                    render={({ field: typeField }) => (
                      <Select
                        value={typeField.value}
                        readOnly={readOnly}
                        onValueChange={(value) => {
                          if (
                            value === "string" ||
                            value === "number" ||
                            value === "boolean"
                          ) {
                            typeField.onChange(value)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {
                              variableTypes.find(
                                (entry) => entry.value === typeField.value
                              )?.label
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {variableTypes.map(({ value, label }) => (
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
                    disabled={readOnly || variables.fields.length <= 1}
                    onClick={() => variables.remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Controller
                  name={`variables.${index}.description`}
                  control={form.control}
                  render={({ field: descriptionField }) => (
                    <VariableTextField
                      name={descriptionField.name}
                      value={descriptionField.value}
                      onBlur={descriptionField.onBlur}
                      multiline
                      rows={2}
                      placeholder="Describe what to extract (optional)"
                      readOnly={readOnly}
                      onChange={descriptionField.onChange}
                    />
                  )}
                />
              </div>
            ))}
            {form.formState.errors.variables?.message ? (
              <FieldError errors={[form.formState.errors.variables]} />
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={readOnly}
              onClick={() =>
                variables.append({
                  key: "",
                  type: "string",
                  description: "",
                })
              }
            >
              <Plus />
              Add variable
            </Button>
          </FieldGroup>
          <DialogFooter>
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
