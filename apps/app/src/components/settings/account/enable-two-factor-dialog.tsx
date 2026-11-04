import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import QRCode from "react-qr-code"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"
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
      "components.settings.account.enable_two_factor_dialog.password.required"
    ),
})

type PasswordValues = z.infer<typeof passwordSchema>

type EnableStep = "password" | "setup" | "backup-codes"

export function EnableTwoFactorDialog() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<EnableStep>("password")
  const [totpURI, setTotpURI] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifyCode, setVerifyCode] = useState("")

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolverI18n(passwordSchema),
    defaultValues: { password: "" },
  })

  function resetState() {
    setStep("password")
    setTotpURI(null)
    setBackupCodes([])
    setVerifyCode("")
    passwordForm.reset()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      const shouldRefetchSession = step === "backup-codes"
      setOpen(false)
      resetState()
      if (shouldRefetchSession) {
        queryClient.invalidateQueries({ queryKey: ["session"] })
      }
      return
    }

    setOpen(true)
  }

  const enableMutation = useMutation({
    mutationFn: async (password: string) => {
      const result = await twoFactor.enable({ password })
      if (result.error) {
        throw new Error(result.error.message)
      }
      if (!result.data || !("totpURI" in result.data)) {
        throw new Error(
          t(
            "components.settings.account.enable_two_factor_dialog.errors.enable_failed"
          )
        )
      }
      return result.data
    },
    onSuccess: (data) => {
      setTotpURI(data.totpURI)
      setBackupCodes(data.backupCodes)
      setStep("setup")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const result = await twoFactor.verifyTotp({ code })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(
        t("components.settings.account.enable_two_factor_dialog.toasts.enabled")
      )
      setStep("backup-codes")
    },
    onError: (error) => {
      toast.error(error.message)
      setVerifyCode("")
    },
  })

  const isPending = enableMutation.isPending || verifyMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            {t("components.settings.account.enable_two_factor_dialog.trigger")}
          </Button>
        }
      />

      <DialogContent>
        {step === "password" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t(
                  "components.settings.account.enable_two_factor_dialog.title"
                )}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "components.settings.account.enable_two_factor_dialog.password_description"
                )}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={passwordForm.handleSubmit((values) =>
                enableMutation.mutate(values.password)
              )}
              noValidate
            >
              <FieldGroup>
                <Controller
                  name="password"
                  control={passwordForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t(
                          "components.settings.account.enable_two_factor_dialog.password.label"
                        )}
                      </FieldLabel>
                      <PasswordInput
                        {...field}
                        id={field.name}
                        autoComplete="current-password"
                        aria-invalid={fieldState.invalid}
                        disabled={isPending}
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
                  <Button variant="outline" disabled={isPending}>
                    {t("common.actions.cancel")}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {enableMutation.isPending ? (
                    <Spinner className="mx-8" />
                  ) : (
                    t("common.actions.continue")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}

        {step === "setup" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t(
                  "components.settings.account.enable_two_factor_dialog.title"
                )}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "components.settings.account.enable_two_factor_dialog.setup_description"
                )}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              {totpURI ? (
                <div className="flex justify-center rounded-md bg-white p-4">
                  <QRCode value={totpURI} size={180} />
                </div>
              ) : null}

              <Field>
                <FieldDescription>
                  {t(
                    "components.settings.account.enable_two_factor_dialog.code_description"
                  )}
                </FieldDescription>
                <InputOTP
                  maxLength={6}
                  id="enable-totp-verification"
                  value={verifyCode}
                  onChange={setVerifyCode}
                  disabled={isPending}
                  autoFocus
                  containerClassName="justify-center mt-6"
                  onComplete={(code) => verifyMutation.mutate(code)}
                >
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator className="mx-2" />
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </Field>

              <DialogFooter className="mt-6">
                <DialogClose>
                  <Button variant="outline" disabled={isPending}>
                    {t("common.actions.cancel")}
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  disabled={isPending || verifyCode.length !== 6}
                  onClick={() => verifyMutation.mutate(verifyCode)}
                >
                  {verifyMutation.isPending ? (
                    <Spinner className="mx-7" />
                  ) : (
                    t(
                      "components.settings.account.enable_two_factor_dialog.submit"
                    )
                  )}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </>
        ) : null}

        {step === "backup-codes" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t(
                  "components.settings.account.enable_two_factor_dialog.backup_codes.title"
                )}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "components.settings.account.enable_two_factor_dialog.backup_codes.description"
                )}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <BackupCodesList codes={backupCodes} />
              <DialogFooter>
                <Button type="button" onClick={() => handleOpenChange(false)}>
                  {t(
                    "components.settings.account.enable_two_factor_dialog.backup_codes.confirm"
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
