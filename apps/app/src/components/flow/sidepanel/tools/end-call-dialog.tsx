import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { endCallToolSchema } from "@workspace/shared/api/agent-config/schemas"
import type { EndCallTool } from "@workspace/shared/api/agent-config/types"
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

export function createEndCallDraft(): EndCallTool {
  return { description: "" }
}

export function EndCallDialog({
  open,
  tool,
  readOnly,
  onOpenChange,
  onSave,
}: {
  open: boolean
  tool: EndCallTool
  readOnly: boolean
  onOpenChange: (open: boolean) => void
  onSave: (tool: EndCallTool) => void
}) {
  const form = useForm<EndCallTool>({
    resolver: zodResolver(endCallToolSchema),
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
          <DialogTitle>End call</DialogTitle>
          <DialogDescription>
            Enable the agent to end the call
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
                <VariableTextField
                  name={field.name}
                  value={field.value}
                  onBlur={field.onBlur}
                  multiline
                  rows={4}
                  placeholder="Describe when to end the call"
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
