import { useMutation } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
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
  FieldSeparator,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { PasswordInput } from "@workspace/ui/components/password-input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { Captcha } from "@/components/captcha"
import { GoogleIcon } from "@/components/logos/google"
import { PhoneflowIcon } from "@/components/logos/phoneflow"
import { captureEvent, identifyUser } from "@/lib/analytics"
import { signIn, signUp } from "@/lib/auth/client"
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/lib/constants"
import { env } from "@/lib/env"
import { Trans, useTranslation } from "@/lib/i18n"
import { TIME_ZONES } from "@/lib/time"
import { zodResolverI18n } from "@/lib/zod-resolver"

export const Route = createFileRoute("/(unauthorized)/signup/")({
  component: Page,
})

const signUpFormSchema = z
  .object({
    name: z.string().trim().min(1, "routes.signup.name.required"),
    email: z.email("routes.signup.email.invalid"),
    password: z
      .string()
      .min(8, "routes.signup.password.min_length")
      .regex(/[A-Z]/, "routes.signup.password.uppercase")
      .regex(/[a-z]/, "routes.signup.password.lowercase")
      .regex(/[0-9]/, "routes.signup.password.number"),
    confirmPassword: z
      .string()
      .min(1, "routes.signup.confirm_password.required"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "routes.signup.confirm_password.mismatch",
    path: ["confirmPassword"],
  })

type SignUpFormValues = z.infer<typeof signUpFormSchema>

function Page() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { searchStr } = useLocation()
  const redirect = new URLSearchParams(searchStr).get("redirect") ?? undefined
  const email =
    new URLSearchParams(redirect?.split("?")[1] ?? "").get("email") ?? ""
  const callbackURL = redirect
    ? `${env.FRONTEND_URL}${redirect}`
    : env.FRONTEND_URL
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const form = useForm<SignUpFormValues>({
    resolver: zodResolverI18n(signUpFormSchema),
    defaultValues: {
      name: "",
      email,
      password: "",
      confirmPassword: "",
    },
  })

  const signUpMutation = useMutation({
    mutationFn: async (values: SignUpFormValues) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const result = await signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
        timezone: TIME_ZONES.includes(timezone) ? timezone : "America/New_York",
        fetchOptions: {
          headers: {
            "x-captcha-response": captchaToken,
          },
        },
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    onSuccess: (data, values) => {
      identifyUser(data.user)
      captureEvent("user_signed_up", { method: "email" })
      navigate({
        to: "/email-verification",
        search: { email: values.email, redirect },
      })
    },
    onError: (error) => {
      setCaptchaToken(null)
      toast.error(error.message)
    },
  })

  async function handleGoogleSignUp() {
    await signIn.social(
      {
        provider: "google",
        callbackURL,
      },
      {
        onError: (ctx) => {
          toast.error(ctx.error.message)
        },
      }
    )
  }

  return (
    <>
      <title>{t("routes.signup.page_title")}</title>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 py-8">
        <div className="flex items-center gap-2">
          <PhoneflowIcon className="size-6" />
          <span className="select-none text-2xl font-medium">Phoneflow</span>
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {t("routes.signup.title")}
            </CardTitle>
            <CardDescription>{t("routes.signup.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((values) =>
                signUpMutation.mutate(values)
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
                        {t("routes.signup.name.label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder={t("routes.signup.name.placeholder")}
                        autoComplete="name"
                        aria-invalid={fieldState.invalid}
                        disabled={signUpMutation.isPending}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t("routes.signup.email.label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder={t("routes.signup.email.placeholder")}
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                        disabled={signUpMutation.isPending || !!email}
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
                        {t("routes.signup.password.label")}
                      </FieldLabel>
                      <PasswordInput
                        {...field}
                        id={field.name}
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                        disabled={signUpMutation.isPending}
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
                        {t("routes.signup.confirm_password.label")}
                      </FieldLabel>
                      <PasswordInput
                        {...field}
                        id={field.name}
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                        disabled={signUpMutation.isPending}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Captcha
                  key={signUpMutation.failureCount}
                  onTokenChange={setCaptchaToken}
                />

                <Button
                  type="submit"
                  disabled={
                    signUpMutation.isPending || (env.IS_CLOUD && !captchaToken)
                  }
                >
                  {signUpMutation.isPending ? (
                    <Spinner />
                  ) : (
                    t("routes.signup.submit")
                  )}
                </Button>

                <Button
                  variant="outline"
                  render={<Link to="/signin/sso" search={{ redirect }} />}
                >
                  {t("routes.signup.sso_button")}
                </Button>

                <FieldSeparator>
                  {t("routes.signup.or_continue_with")}
                </FieldSeparator>

                <Button
                  variant="outline"
                  disabled={signUpMutation.isPending}
                  onClick={handleGoogleSignUp}
                >
                  <GoogleIcon className="size-5" />
                  {t("routes.signup.google")}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    {t("routes.signup.has_account")}{" "}
                  </span>
                  <Link
                    to="/signin"
                    search={{ redirect }}
                    className="underline"
                  >
                    {t("routes.signup.sign_in_link")}
                  </Link>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground max-w-75">
          <Trans
            i18nKey="routes.signup.legal"
            components={{
              terms: (
                <a
                  href={TERMS_OF_SERVICE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                />
              ),
              privacy: (
                <a
                  href={PRIVACY_POLICY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                />
              ),
            }}
          />
        </p>
      </div>
    </>
  )
}
