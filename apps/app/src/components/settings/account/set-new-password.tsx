import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
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
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@workspace/ui/components/item"
import { PasswordInput } from "@workspace/ui/components/password-input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { changePassword } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

const setNewPasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(
        1,
        "components.settings.account.set_new_password.current_password.required"
      ),
    password: z
      .string()
      .min(8, "components.settings.account.set_new_password.password.min")
      .regex(
        /[A-Z]/,
        "components.settings.account.set_new_password.password.uppercase"
      )
      .regex(
        /[a-z]/,
        "components.settings.account.set_new_password.password.lowercase"
      )
      .regex(
        /[0-9]/,
        "components.settings.account.set_new_password.password.number"
      ),
    confirmPassword: z
      .string()
      .min(
        1,
        "components.settings.account.set_new_password.confirm_password.required"
      ),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message:
      "components.settings.account.set_new_password.confirm_password.mismatch",
    path: ["confirmPassword"],
  })

type SetNewPasswordValues = z.infer<typeof setNewPasswordSchema>

type SetNewPasswordProps = {
  accounts: { providerId: string }[]
}

export function SetNewPassword({ accounts }: SetNewPasswordProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const hasPassword = accounts.some(
    (account) => account.providerId === "credential"
  )

  const form = useForm<SetNewPasswordValues>({
    resolver: zodResolverI18n(setNewPasswordSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
  })

  const setNewPasswordMutation = useMutation({
    mutationFn: async (values: SetNewPasswordValues) => {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.password,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(
        t("components.settings.account.set_new_password.toasts.updated")
      )
      form.reset()
      setOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!hasPassword) {
    return null
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        form.reset()
        setNewPasswordMutation.reset()
      }}
    >
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>
            {t("components.settings.account.set_new_password.title")}
          </ItemTitle>
          <ItemDescription>
            {t("components.settings.account.set_new_password.description")}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <DialogTrigger
            render={
              <Button type="button" variant="outline">
                {t("components.settings.account.set_new_password.trigger")}
              </Button>
            }
          />
        </ItemActions>
      </Item>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("components.settings.account.set_new_password.dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "components.settings.account.set_new_password.dialog.description"
            )}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) =>
            setNewPasswordMutation.mutate(values)
          )}
          noValidate
        >
          <FieldGroup>
            <Controller
              name="currentPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t(
                      "components.settings.account.set_new_password.current_password.label"
                    )}
                  </FieldLabel>
                  <PasswordInput
                    {...field}
                    id={field.name}
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    disabled={setNewPasswordMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t(
                      "components.settings.account.set_new_password.password.label"
                    )}
                  </FieldLabel>
                  <PasswordInput
                    {...field}
                    id={field.name}
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    disabled={setNewPasswordMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t(
                      "components.settings.account.set_new_password.confirm_password.label"
                    )}
                  </FieldLabel>
                  <PasswordInput
                    {...field}
                    id={field.name}
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    disabled={setNewPasswordMutation.isPending}
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
                disabled={setNewPasswordMutation.isPending}
              >
                {t("common.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={setNewPasswordMutation.isPending}>
              {setNewPasswordMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                t("components.settings.account.set_new_password.dialog.submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
