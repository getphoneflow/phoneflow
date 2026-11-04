import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { PhoneflowIcon } from "@/components/logos/phoneflow"
import { captureEvent } from "@/lib/analytics"
import { twoFactor } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

export const Route = createFileRoute("/(unauthorized)/two-factor/")({
  component: Page,
})

const backupCodeSchema = z.object({
  code: z.string().trim().min(1, "routes.two_factor.backup_code.required"),
})

type BackupCodeValues = z.infer<typeof backupCodeSchema>

type VerificationMethod = "totp" | "backup-code"

function Page() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { redirect: redirectTo } = Route.useSearch()
  const [method, setMethod] = useState<VerificationMethod>("totp")
  const [otp, setOtp] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)

  const backupForm = useForm<BackupCodeValues>({
    resolver: zodResolverI18n(backupCodeSchema),
    defaultValues: { code: "" },
  })

  async function completeSignIn() {
    captureEvent("user_signed_in", { method: "email" })
    await queryClient.refetchQueries({ queryKey: ["session"] })

    if (redirectTo) {
      navigate({ href: redirectTo })
      return
    }

    navigate({ to: "/" })
  }

  const verifyTotpMutation = useMutation({
    mutationFn: async (code: string) => {
      const result = await twoFactor.verifyTotp({
        code,
        trustDevice,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: completeSignIn,
    onError: (error) => {
      toast.error(error.message)
      setOtp("")
    },
  })

  const verifyBackupCodeMutation = useMutation({
    mutationFn: async (values: BackupCodeValues) => {
      const result = await twoFactor.verifyBackupCode({
        code: values.code,
        trustDevice,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: completeSignIn,
    onError: (error) => {
      toast.error(error.message)
      backupForm.reset()
    },
  })

  const isPending =
    verifyTotpMutation.isPending || verifyBackupCodeMutation.isPending

  function switchMethod(next: VerificationMethod) {
    setMethod(next)
    setOtp("")
    backupForm.reset()
  }

  return (
    <>
      <title>{t("routes.two_factor.page_title")}</title>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 py-8">
        <div className="flex items-center gap-2">
          <PhoneflowIcon className="size-6" />
          <span className="select-none text-2xl font-medium">Phoneflow</span>
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {t("routes.two_factor.title")}
            </CardTitle>
            <CardDescription>
              {method === "backup-code"
                ? t("routes.two_factor.description_backup_code")
                : t("routes.two_factor.description_totp")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {method === "backup-code" ? (
                <form
                  onSubmit={backupForm.handleSubmit((values) =>
                    verifyBackupCodeMutation.mutate(values)
                  )}
                  noValidate
                >
                  <FieldGroup>
                    <Controller
                      name="code"
                      control={backupForm.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            {t("routes.two_factor.backup_code.label")}
                          </FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            autoComplete="one-time-code"
                            aria-invalid={fieldState.invalid}
                            disabled={isPending}
                            autoFocus
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Button type="submit" disabled={isPending}>
                      {isPending ? <Spinner /> : t("routes.two_factor.verify")}
                    </Button>
                  </FieldGroup>
                </form>
              ) : (
                <InputOTP
                  maxLength={6}
                  id="totp-verification"
                  value={otp}
                  onChange={setOtp}
                  disabled={isPending}
                  autoFocus
                  containerClassName="justify-center my-6"
                  onComplete={(value) => verifyTotpMutation.mutate(value)}
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
              )}

              <Field orientation="horizontal">
                <Checkbox
                  id="trust-device"
                  checked={trustDevice}
                  onCheckedChange={setTrustDevice}
                  disabled={isPending}
                />
                <FieldLabel htmlFor="trust-device">
                  {t("routes.two_factor.trust_device")}
                </FieldLabel>
              </Field>

              <FieldDescription className="text-center">
                <button
                  type="button"
                  className="underline disabled:opacity-50"
                  disabled={isPending}
                  onClick={() =>
                    switchMethod(method === "totp" ? "backup-code" : "totp")
                  }
                >
                  {method === "backup-code"
                    ? t("routes.two_factor.use_authenticator")
                    : t("routes.two_factor.use_backup_code")}
                </button>
              </FieldDescription>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
