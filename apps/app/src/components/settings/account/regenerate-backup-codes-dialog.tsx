import { zodResolver } from "@hookform/resolvers/zod"
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

const passwordSchema = z.object({
  password: z.string().min(1, "Password is required"),
})

type PasswordValues = z.infer<typeof passwordSchema>

type RegenerateStep = "password" | "backup-codes"

export function RegenerateBackupCodesDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<RegenerateStep>("password")
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
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
        throw new Error("Failed to generate backup codes")
      }
      return result.data.backupCodes
    },
    onSuccess: (codes) => {
      setBackupCodes(codes)
      setStep("backup-codes")
      toast.success("New backup codes generated")
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
            Re-generate codes
          </Button>
        }
      />

      <DialogContent>
        {step === "password" ? (
          <>
            <DialogHeader>
              <DialogTitle>Re-generate backup codes</DialogTitle>
              <DialogDescription>
                Enter your password to re-generate backup codes
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
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
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
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={regenerateMutation.isPending}>
                  {regenerateMutation.isPending ? (
                    <Spinner className="mx-8" />
                  ) : (
                    "Re-generate codes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}

        {step === "backup-codes" ? (
          <>
            <DialogHeader>
              <DialogTitle>Save your backup codes</DialogTitle>
              <DialogDescription>
                Save these backup codes in a secure place. Previous codes will
                no longer work
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <BackupCodesList codes={backupCodes} />
              <DialogFooter>
                <Button type="button" onClick={() => handleOpenChange(false)}>
                  I saved my codes
                </Button>
              </DialogFooter>
            </FieldGroup>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
