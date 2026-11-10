import { Controller, useForm } from "react-hook-form"

import { skipTurnToolSchema } from "@workspace/shared/api/agent-config/schemas"
import type { SkipTurnTool } from "@workspace/shared/api/agent-config/types"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

export function createSkipTurnDraft(): SkipTurnTool {
  return { description: "" }
}

export function SkipTurnDialog({
  open,
  tool,
  readOnly,
  onOpenChange,
  onSave,
}: {
  open: boolean
  tool: SkipTurnTool
  readOnly: boolean
  onOpenChange: (open: boolean) => void
  onSave: (tool: SkipTurnTool) => void
}) {
  const { t } = useTranslation()
  const form = useForm<SkipTurnTool>({
    resolver: zodResolverI18n(skipTurnToolSchema),
    defaultValues: tool,
    values: tool,
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
            {t("components.flow.sidepanel.tools.skip_turn_dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.flow.sidepanel.tools.skip_turn_dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={form.handleSubmit(onSave)}
        >
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>
                  {t(
                    "components.flow.sidepanel.tools.skip_turn_dialog.prompt.label"
                  )}
                </FieldLabel>
                <VariableTextField
                  name={field.name}
                  value={field.value}
                  onBlur={field.onBlur}
                  multiline
                  rows={4}
                  placeholder={t(
                    "components.flow.sidepanel.tools.skip_turn_dialog.prompt.placeholder"
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
