import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { UploadIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { publishAgentRequestSchema } from "@workspace/shared/api/agents/schemas"
import type {
  AgentVersionResponse,
  PublishAgentRequest,
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
import { Textarea } from "@workspace/ui/components/textarea"
import { api } from "@/lib/api"
import { useAgentStore } from "@/stores/agent"

export function PublishAgentForm() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const agent = useAgentStore((state) => state.agent)
  const readOnly = useAgentStore((state) => state.readOnly)
  const isValid = useAgentStore((state) => state.validation.success)
  const versions = agent.versions
  const nextVersionNumber =
    versions.length > 0
      ? Math.max(...versions.map((version) => version.number)) + 1
      : 1

  const form = useForm<PublishAgentRequest>({
    resolver: zodResolver(publishAgentRequestSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const publishAgentMutation = useMutation({
    mutationFn: (values: PublishAgentRequest) =>
      api.post<AgentVersionResponse, PublishAgentRequest>(
        `/agents/${agent.id}/publish`,
        { body: values }
      ),
    onSuccess: (publishedVersion) => {
      toast.success(`V${publishedVersion.number} published`)
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({
        queryKey: ["agents", "detail", agent.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["agents", "versions", agent.id],
      })
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
        publishAgentMutation.reset()
      }}
    >
      <Button disabled={readOnly || !isValid} onClick={() => setOpen(true)}>
        <UploadIcon />
        Publish
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish V{nextVersionNumber}</DialogTitle>
          <DialogDescription>Publish a new agent version</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) =>
            publishAgentMutation.mutate(values)
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
                    value={field.value ?? ""}
                    aria-invalid={fieldState.invalid}
                    placeholder="Version name (optional)"
                    autoComplete="off"
                    disabled={publishAgentMutation.isPending}
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
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    value={field.value ?? ""}
                    aria-invalid={fieldState.invalid}
                    placeholder="Version description (optional)"
                    disabled={publishAgentMutation.isPending}
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
                disabled={publishAgentMutation.isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={publishAgentMutation.isPending || !isValid}
            >
              {publishAgentMutation.isPending ? (
                <Spinner className="mx-5" />
              ) : (
                "Publish"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
