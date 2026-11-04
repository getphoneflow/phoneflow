import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"
import { createAgentRequestSchema } from "@workspace/shared/api/agents/schemas"
import type {
  CreateAgentRequest,
  CreateAgentResponse,
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
  DialogTrigger,
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
import { captureEvent } from "@/lib/analytics"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

export function CreateAgentForm() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const canCreate = useCheckPermission({ agent: ["create"] })

  const form = useForm<CreateAgentRequest>({
    resolver: zodResolverI18n(createAgentRequestSchema),
    defaultValues: {
      name: "",
      config: createDefaultAgentConfig(),
    },
  })

  const createAgentMutation = useMutation({
    mutationFn: (values: CreateAgentRequest) =>
      api.post<CreateAgentResponse, CreateAgentRequest>("/agents", {
        body: values,
      }),
    onSuccess: (agent) => {
      captureEvent("agent_created", { agent_id: agent.id })
      form.reset()
      setOpen(false)
      navigate({
        to: "/agents/$agentId",
        params: { agentId: agent.id },
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
        setOpen(nextOpen)
        form.reset()
        createAgentMutation.reset()
      }}
    >
      <DialogTrigger disabled={!canCreate}>
        <Button disabled={!canCreate}>
          <PlusIcon />
          {t("components.agents.create_agent_form.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("components.agents.create_agent_form.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.agents.create_agent_form.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) =>
            createAgentMutation.mutate(values)
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
                    {t("components.agents.create_agent_form.name.label")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder={t(
                      "components.agents.create_agent_form.name.placeholder"
                    )}
                    autoComplete="off"
                    disabled={createAgentMutation.isPending}
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
              <Button
                variant="outline"
                disabled={createAgentMutation.isPending}
              >
                {t("common.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createAgentMutation.isPending}>
              {createAgentMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                t("components.agents.create_agent_form.submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
