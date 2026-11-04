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
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

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
  const { t } = useTranslation()
  const form = useForm<TransferCallTool>({
    resolver: zodResolverI18n(transferCallToolSchema),
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
          <DialogTitle>
            {t("components.flow.sidepanel.tools.transfer_call_dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "components.flow.sidepanel.tools.transfer_call_dialog.description"
            )}
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
                      <FieldLabel>
                        {t(
                          "components.flow.sidepanel.tools.transfer_call_dialog.number.label"
                        )}
                      </FieldLabel>
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
                      <FieldLabel>
                        {t(
                          "components.flow.sidepanel.tools.transfer_call_dialog.condition.label"
                        )}
                      </FieldLabel>
                      <VariableTextField
                        name={conditionField.name}
                        value={conditionField.value}
                        onBlur={conditionField.onBlur}
                        multiline
                        rows={2}
                        placeholder={t(
                          "components.flow.sidepanel.tools.transfer_call_dialog.condition.placeholder"
                        )}
                        readOnly={readOnly}
                        aria-invalid={fieldState.invalid}
                        onChange={conditionField.onChange}
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
              {t(
                "components.flow.sidepanel.tools.transfer_call_dialog.add_destination"
              )}
            </Button>
          </FieldGroup>
          <DialogFooter>
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
