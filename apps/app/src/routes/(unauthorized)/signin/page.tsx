import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import { Badge } from "@workspace/ui/components/badge"
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
import { captureEvent } from "@/lib/analytics"
import { getLastUsedLoginMethod, signIn } from "@/lib/auth/client"
import { env } from "@/lib/env"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

export const Route = createFileRoute("/(unauthorized)/signin/")({
  component: Page,
})

const signInFormSchema = z.object({
  email: z.email("routes.signin.email.invalid"),
  password: z.string().min(8, "routes.signin.password.min_length"),
})

type SignInFormValues = z.infer<typeof signInFormSchema>

function Page() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { searchStr } = useLocation()
  const redirect = new URLSearchParams(searchStr).get("redirect") ?? undefined
  const email =
    new URLSearchParams(redirect?.split("?")[1] ?? "").get("email") ?? ""
  const queryClient = useQueryClient()
  const lastLoginMethod = getLastUsedLoginMethod()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const callbackURL = redirect
    ? `${env.FRONTEND_URL}${redirect}`
    : env.FRONTEND_URL

  const form = useForm<SignInFormValues>({
    resolver: zodResolverI18n(signInFormSchema),
    defaultValues: {
      email,
      password: "",
    },
  })

  const signInMutation = useMutation({
    mutationFn: async (values: SignInFormValues) => {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
        fetchOptions: {
          headers: {
            "x-captcha-response": captchaToken,
          },
        },
      })
      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          navigate({
            to: "/email-verification",
            search: { email: values.email, redirect },
          })
        }
        throw new Error(result.error.message)
      }
      return result.data
    },
    onSuccess: async (data) => {
      if ("twoFactorRedirect" in data) {
        navigate({
          to: "/two-factor",
          search: { redirect },
        })
        return
      }

      captureEvent("user_signed_in", { method: "email" })
      await queryClient.refetchQueries({ queryKey: ["session"] })

      if (redirect) {
        navigate({ href: redirect })
        return
      }

      navigate({ to: "/" })
    },
    onError: (error) => {
      setCaptchaToken(null)
      toast.error(error.message)
    },
  })

  async function handleGoogleSignIn() {
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
      <title>{t("routes.signin.page_title")}</title>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 py-8">
        <div className="flex items-center gap-2">
          <PhoneflowIcon className="size-6" />
          <span className="select-none text-2xl font-medium">Phoneflow</span>
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {t("routes.signin.title")}
            </CardTitle>
            <CardDescription>{t("routes.signin.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((values) =>
                signInMutation.mutate(values)
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
                        {t("routes.signin.email.label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder={t("routes.signin.email.placeholder")}
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                        disabled={signInMutation.isPending || !!email}
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
                      <div className="flex items-center">
                        <FieldLabel htmlFor={field.name}>
                          {t("routes.signin.password.label")}
                        </FieldLabel>
                        <Link
                          to="/reset-password"
                          className="ml-auto inline-block text-sm underline"
                        >
                          {t("routes.signin.forgot_password")}
                        </Link>
                      </div>
                      <PasswordInput
                        {...field}
                        id={field.name}
                        autoComplete="current-password"
                        aria-invalid={fieldState.invalid}
                        disabled={signInMutation.isPending}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Captcha
                  key={signInMutation.failureCount}
                  onTokenChange={setCaptchaToken}
                />

                <Button
                  type="submit"
                  disabled={
                    signInMutation.isPending || (env.IS_CLOUD && !captchaToken)
                  }
                  className="relative"
                >
                  {signInMutation.isPending ? (
                    <Spinner />
                  ) : (
                    t("routes.signin.submit")
                  )}
                  {lastLoginMethod === "email" && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 right-2"
                    >
                      {t("routes.signin.last_used")}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant="outline"
                  render={<Link to="/signin/sso" search={{ redirect }} />}
                  className="relative"
                >
                  {t("routes.signin.sso_button")}
                  {lastLoginMethod?.startsWith("sso-") && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 right-2"
                    >
                      {t("routes.signin.last_used")}
                    </Badge>
                  )}
                </Button>

                <FieldSeparator>
                  {t("routes.signin.or_continue_with")}
                </FieldSeparator>

                <Button
                  variant="outline"
                  disabled={signInMutation.isPending}
                  onClick={handleGoogleSignIn}
                  className="relative"
                >
                  <GoogleIcon className="size-5" />
                  {t("routes.signin.google")}
                  {lastLoginMethod === "google" && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 right-2"
                    >
                      {t("routes.signin.last_used")}
                    </Badge>
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    {t("routes.signin.no_account")}{" "}
                  </span>
                  <Link
                    to="/signup"
                    search={{ redirect }}
                    className="underline"
                  >
                    {t("routes.signin.sign_up_link")}
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
