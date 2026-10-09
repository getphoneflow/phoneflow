import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

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
import { captureEvent, identifyOrganization } from "@/lib/analytics"
import { organization } from "@/lib/auth/client"

const createOrganizationFormSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required"),
})

type CreateOrganizationFormValues = z.infer<typeof createOrganizationFormSchema>

type CreateOrganizationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: CreateOrganizationDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationFormSchema),
    defaultValues: {
      name: "",
    },
  })

  const createOrganizationMutation = useMutation({
    mutationFn: async (values: CreateOrganizationFormValues) => {
      const result = await organization.create({
        name: values.name,
        slug: crypto.randomUUID(),
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    onSuccess: async (org) => {
      identifyOrganization(org)
      captureEvent("organization_created", {
        organization_id: org?.id,
        name: org?.name,
      })
      toast.success("Organization created")
      form.reset()
      onOpenChange(false)
      await queryClient.refetchQueries()
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
        form.reset()
        createOrganizationMutation.reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>Create an organization</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) =>
            createOrganizationMutation.mutate(values)
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
                    Organization name
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Acme Inc"
                    autoComplete="organization"
                    autoFocus
                    aria-invalid={fieldState.invalid}
                    disabled={createOrganizationMutation.isPending}
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
                disabled={createOrganizationMutation.isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={createOrganizationMutation.isPending}
            >
              {createOrganizationMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                "Create organization"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
