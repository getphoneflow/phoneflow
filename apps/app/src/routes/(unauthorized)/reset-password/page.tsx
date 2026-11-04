import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { Captcha } from "@/components/captcha"
import { PhoneflowIcon } from "@/components/logos/phoneflow"
import { requestPasswordReset } from "@/lib/auth/client"
import { env } from "@/lib/env"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

export const Route = createFileRoute("/(unauthorized)/reset-password/")({
  component: Page,
})

const recoverPasswordFormSchema = z.object({
  email: z.email("routes.reset_password.email.invalid"),
})

type RecoverPasswordFormValues = z.infer<typeof recoverPasswordFormSchema>

function Page() {
  const { t } = useTranslation()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const form = useForm<RecoverPasswordFormValues>({
    resolver: zodResolverI18n(recoverPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (values: RecoverPasswordFormValues) => {
      const result = await requestPasswordReset({
        email: values.email,
        redirectTo: `${env.FRONTEND_URL}/set-new-password`,
        fetchOptions: {
          headers: {
            "x-captcha-response": captchaToken,
          },
        },
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(t("routes.reset_password.success"))
      form.reset()
      setCaptchaToken(null)
    },
    onError: (error) => {
      setCaptchaToken(null)
      toast.error(error.message)
    },
  })

  return (
    <>
      <title>{t("routes.reset_password.page_title")}</title>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 py-8">
        <div className="flex items-center gap-2">
          <PhoneflowIcon className="size-6" />
          <span className="select-none text-2xl font-medium">Phoneflow</span>
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {t("routes.reset_password.title")}
            </CardTitle>
            <CardDescription>
              {t("routes.reset_password.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((values) =>
                resetPasswordMutation.mutate(values)
              )}
              noValidate
            >
              <FieldGroup>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t("routes.reset_password.email.label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder={t(
                          "routes.reset_password.email.placeholder"
                        )}
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                        disabled={resetPasswordMutation.isPending}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Captcha
                  key={resetPasswordMutation.submittedAt}
                  onTokenChange={setCaptchaToken}
                />

                <Button
                  type="submit"
                  disabled={
                    resetPasswordMutation.isPending ||
                    (env.IS_CLOUD && !captchaToken)
                  }
                >
                  {resetPasswordMutation.isPending ? (
                    <Spinner className="mx-12" />
                  ) : (
                    t("routes.reset_password.submit")
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    {t("routes.reset_password.remember_password")}{" "}
                  </span>
                  <Link to="/signin" className="underline">
                    {t("routes.reset_password.sign_in_link")}
                  </Link>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
