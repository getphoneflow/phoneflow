import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { Controller, useFieldArray, useForm } from "react-hook-form"

import { transferCallToolSchema } from "@workspace/shared/api/agent-config/schemas"
import type { TransferCallTool } from "@workspace/shared/api/agent-config/types"
import { Button } from "@workspace/ui/components/button"
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
import { Textarea } from "@workspace/ui/components/textarea"

export function createTransferCallDraft(): TransferCallTool {
  return {
    destinations: [{ number: "", condition: "" }],
  }
}

export function TransferCallDialog({
  open,
  tool,
  readOnly,
  onOpenChange,
  onSave,
}: {
  open: boolean
  tool: TransferCallTool
  readOnly: boolean
  onOpenChange: (open: boolean) => void
  onSave: (tool: TransferCallTool) => void
}) {
  const form = useForm<TransferCallTool>({
    resolver: zodResolver(transferCallToolSchema),
    defaultValues: tool,
    values: tool,
  })
  const destinations = useFieldArray({
    control: form.control,
    name: "destinations",
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
          <DialogTitle>Transfer call</DialogTitle>
          <DialogDescription>
            Transfer the call to a different phone number
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={form.handleSubmit(onSave)}
        >
          <FieldGroup className="gap-4">
            {destinations.fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col gap-3 rounded-md border border-border p-3"
              >
                <Controller
                  name={`destinations.${index}.number`}
                  control={form.control}
                  render={({ field: numberField, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Number</FieldLabel>
                      <div className="flex items-center gap-2">
                        <Input
                          {...numberField}
                          placeholder="+1234567890"
                          readOnly={readOnly}
                          aria-invalid={fieldState.invalid}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-destructive!"
                          size="icon-sm"
                          disabled={readOnly || destinations.fields.length <= 1}
                          onClick={() => destinations.remove(index)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name={`destinations.${index}.condition`}
                  control={form.control}
                  render={({ field: conditionField, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Condition</FieldLabel>
                      <Textarea
                        {...conditionField}
                        rows={2}
                        placeholder="The caller asks to speak with a representative"
                        readOnly={readOnly}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
            ))}
            {form.formState.errors.destinations?.message ? (
              <FieldError errors={[form.formState.errors.destinations]} />
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={readOnly}
              onClick={() =>
                destinations.append({
                  number: "",
                  condition: "",
                })
              }
            >
              <Plus />
              Add destination
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
