import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"

import { updateAgentNameRequestSchema } from "@workspace/shared/api/agents/schemas"
import type {
  AgentResponse,
  UpdateAgentNameRequest,
  UpdateAgentNameResponse,
} from "@workspace/shared/api/agents/types"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
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
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

type EditAgentNameDialogProps = {
  agent: Pick<AgentResponse, "id" | "name">
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditAgentNameDialog({
  agent,
  open,
  onOpenChange,
}: EditAgentNameDialogProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const form = useForm<UpdateAgentNameRequest>({
    resolver: zodResolverI18n(updateAgentNameRequestSchema),
    defaultValues: {
      name: agent.name,
    },
  })

  const updateNameMutation = useMutation({
    mutationFn: (values: UpdateAgentNameRequest) =>
      api.patch<UpdateAgentNameResponse, UpdateAgentNameRequest>(
        `/agents/${agent.id}/name`,
        { body: values }
      ),
    onSuccess: () => {
      toast.success(
        t("components.agents.edit_agent_name_dialog.toasts.updated")
      )
      onOpenChange(false)
      queryClient.invalidateQueries({
        queryKey: ["agents", "detail", agent.id],
      })
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        form.reset({ name: agent.name })
        updateNameMutation.reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("components.agents.edit_agent_name_dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.agents.edit_agent_name_dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) =>
            updateNameMutation.mutate(values)
          )}
          noValidate
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("components.agents.edit_agent_name_dialog.name.label")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder={t(
                      "components.agents.edit_agent_name_dialog.name.placeholder"
                    )}
                    autoComplete="off"
                    disabled={updateNameMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="mt-8">
            <DialogClose>
              <Button variant="outline" disabled={updateNameMutation.isPending}>
                {t("common.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={updateNameMutation.isPending}>
              {updateNameMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                t("common.actions.save")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
