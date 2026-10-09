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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { captureEvent } from "@/lib/analytics"
import { organization } from "@/lib/auth/client"
import {
  assignableRoleSchema,
  assignableRoles,
  roleLabels,
} from "@/lib/auth/roles"

const inviteMemberFormSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: assignableRoleSchema,
})

type InviteMemberFormValues = z.infer<typeof inviteMemberFormSchema>

type InviteMemberDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteMemberDialog({
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberFormSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  })

  const inviteMemberMutation = useMutation({
    mutationFn: async (values: InviteMemberFormValues) => {
      const result = await organization.inviteMember({
        email: values.email,
        role: values.role,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: (_data, values) => {
      captureEvent("organization_member_invited", { role: values.role })
      toast.success(`Invitation sent to ${values.email}`)
      form.reset()
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["organization-invitations"] })
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
        inviteMemberMutation.reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Send an email invitation to join this organization
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) =>
            inviteMemberMutation.mutate(values)
          )}
          noValidate
        >
          <FieldGroup className="flex-row items-start gap-2">
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="min-w-0 flex-1"
                >
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    autoFocus
                    aria-invalid={fieldState.invalid}
                    disabled={inviteMemberMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Field className="w-28 shrink-0">
                  <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={inviteMemberMutation.isPending}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue>{roleLabels[field.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="mt-8">
            <DialogClose>
              <Button
                variant="outline"
                disabled={inviteMemberMutation.isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={inviteMemberMutation.isPending}>
              {inviteMemberMutation.isPending ? (
                <Spinner className="mx-6" />
              ) : (
                "Send invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
