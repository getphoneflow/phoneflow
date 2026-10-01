import { zodResolver } from "@hookform/resolvers/zod"
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

  const form = useForm<UpdateAgentNameRequest>({
    resolver: zodResolver(updateAgentNameRequestSchema),
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
      toast.success("Agent name updated")
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
          <DialogTitle>Edit name</DialogTitle>
          <DialogDescription>Change the agent name</DialogDescription>
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
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Agent name"
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
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={updateNameMutation.isPending}>
              {updateNameMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
