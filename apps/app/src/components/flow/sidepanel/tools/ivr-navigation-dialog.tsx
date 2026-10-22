import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { ivrNavigationToolSchema } from "@workspace/shared/api/agent-config/schemas"
import type { IvrNavigationTool } from "@workspace/shared/api/agent-config/types"
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
import { Textarea } from "@workspace/ui/components/textarea"

export function createIvrNavigationDraft(): IvrNavigationTool {
  return { description: "" }
}

export function IvrNavigationDialog({
  open,
  tool,
  readOnly,
  onOpenChange,
  onSave,
}: {
  open: boolean
  tool: IvrNavigationTool
  readOnly: boolean
  onOpenChange: (open: boolean) => void
  onSave: (tool: IvrNavigationTool) => void
}) {
  const form = useForm<IvrNavigationTool>({
    resolver: zodResolver(ivrNavigationToolSchema),
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
          <DialogTitle>IVR navigation</DialogTitle>
          <DialogDescription>
            Send keypad tones to navigate a phone menu
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
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  {...field}
                  rows={4}
                  placeholder="Describe which phone menu to get through"
                  readOnly={readOnly}
                  aria-invalid={fieldState.invalid}
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
