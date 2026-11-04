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
import { PasswordInput } from "@workspace/ui/components/password-input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { BackupCodesList } from "@/components/settings/account/backup-codes-list"
import { twoFactor } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

const passwordSchema = z.object({
  password: z
    .string()
    .min(
      1,
      "components.settings.account.regenerate_backup_codes_dialog.password.required"
    ),
})

type PasswordValues = z.infer<typeof passwordSchema>

type RegenerateStep = "password" | "backup-codes"

export function RegenerateBackupCodesDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<RegenerateStep>("password")
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const form = useForm<PasswordValues>({
    resolver: zodResolverI18n(passwordSchema),
    defaultValues: { password: "" },
  })

  function resetState() {
    setStep("password")
    setBackupCodes([])
    form.reset()
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetState()
    }
  }

  const regenerateMutation = useMutation({
    mutationFn: async (password: string) => {
      const result = await twoFactor.generateBackupCodes({ password })
      if (result.error) {
        throw new Error(result.error.message)
      }
      if (!result.data?.backupCodes) {
        throw new Error(
          t(
            "components.settings.account.regenerate_backup_codes_dialog.errors.generate_failed"
          )
        )
      }
      return result.data.backupCodes
    },
    onSuccess: (codes) => {
      setBackupCodes(codes)
      setStep("backup-codes")
      toast.success(
        t(
          "components.settings.account.regenerate_backup_codes_dialog.toasts.generated"
        )
      )
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            {t(
              "components.settings.account.regenerate_backup_codes_dialog.trigger"
            )}
          </Button>
        }
      />

      <DialogContent>
        {step === "password" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t(
                  "components.settings.account.regenerate_backup_codes_dialog.title"
                )}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "components.settings.account.regenerate_backup_codes_dialog.description"
                )}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit((values) =>
                regenerateMutation.mutate(values.password)
              )}
              noValidate
            >
              <FieldGroup>
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t(
                          "components.settings.account.regenerate_backup_codes_dialog.password.label"
                        )}
                      </FieldLabel>
                      <PasswordInput
                        {...field}
                        id={field.name}
                        autoComplete="current-password"
                        aria-invalid={fieldState.invalid}
                        disabled={regenerateMutation.isPending}
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
                    disabled={regenerateMutation.isPending}
                  >
                    {t("common.actions.cancel")}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={regenerateMutation.isPending}>
                  {regenerateMutation.isPending ? (
                    <Spinner className="mx-8" />
                  ) : (
                    t(
                      "components.settings.account.regenerate_backup_codes_dialog.submit"
                    )
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}

        {step === "backup-codes" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t(
                  "components.settings.account.regenerate_backup_codes_dialog.backup_codes.title"
                )}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "components.settings.account.regenerate_backup_codes_dialog.backup_codes.description"
                )}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <BackupCodesList codes={backupCodes} />
              <DialogFooter>
                <Button type="button" onClick={() => handleOpenChange(false)}>
                  {t(
                    "components.settings.account.regenerate_backup_codes_dialog.backup_codes.confirm"
                  )}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
