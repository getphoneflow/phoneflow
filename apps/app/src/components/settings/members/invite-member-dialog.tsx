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
import { SelectRole } from "@/components/settings/members/select-role"
import { captureEvent } from "@/lib/analytics"
import { organization } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

const inviteMemberFormSchema = z.object({
  email: z.email(
    "components.settings.members.invite_member_dialog.email.invalid"
  ),
  role: z.string().min(1),
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
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolverI18n(inviteMemberFormSchema),
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
      toast.success(
        t("components.settings.members.invite_member_dialog.toasts.sent", {
          email: values.email,
        })
      )
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
          <DialogTitle>
            {t("components.settings.members.invite_member_dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.settings.members.invite_member_dialog.description")}
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
                  <FieldLabel htmlFor={field.name}>
                    {t(
                      "components.settings.members.invite_member_dialog.email.label"
                    )}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    placeholder={t(
                      "components.settings.members.invite_member_dialog.email.placeholder"
                    )}
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
                <Field className="w-36 shrink-0">
                  <FieldLabel htmlFor={field.name}>
                    {t(
                      "components.settings.members.invite_member_dialog.role.label"
                    )}
                  </FieldLabel>
                  <SelectRole
                    id={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={inviteMemberMutation.isPending}
                    ariaLabel={t(
                      "components.settings.members.invite_member_dialog.role.label"
                    )}
                  />
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
                {t("common.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={inviteMemberMutation.isPending}>
              {inviteMemberMutation.isPending ? (
                <Spinner className="mx-6" />
              ) : (
                t("components.settings.members.invite_member_dialog.submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
