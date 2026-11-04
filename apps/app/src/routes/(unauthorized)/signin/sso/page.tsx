import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link, useLocation } from "@tanstack/react-router"
import { useEffect } from "react"
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
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { PhoneflowIcon } from "@/components/logos/phoneflow"
import { getLastUsedLoginMethod, signIn } from "@/lib/auth/client"
import { env } from "@/lib/env"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

export const Route = createFileRoute("/(unauthorized)/signin/sso/")({
  component: Page,
})

const ssoSignInSchema = z.object({
  email: z.email("routes.signin_sso.email.invalid"),
})

type SsoSignInValues = z.infer<typeof ssoSignInSchema>

function Page() {
  const { t } = useTranslation()
  const { searchStr } = useLocation()
  const params = new URLSearchParams(searchStr)
  const redirect = params.get("redirect") ?? undefined
  const lastLoginMethod = getLastUsedLoginMethod()
  const callbackURL = redirect
    ? `${env.FRONTEND_URL}${redirect}`
    : env.FRONTEND_URL
  const form = useForm<SsoSignInValues>({
    resolver: zodResolverI18n(ssoSignInSchema),
    defaultValues: { email: params.get("email") ?? "" },
  })

  useEffect(() => {
    const searchParams = new URLSearchParams(searchStr)
    const message =
      searchParams.get("error_description") ?? searchParams.get("error")
    if (message) {
      toast.error(message)
    }
  }, [searchStr])

  const signInMutation = useMutation({
    mutationFn: async (values: SsoSignInValues) => {
      const result = await signIn.sso({
        email: values.email,
        callbackURL,
        errorCallbackURL: `${env.FRONTEND_URL}/signin/sso`,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <title>{t("routes.signin_sso.page_title")}</title>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 py-8">
        <div className="flex items-center gap-2">
          <PhoneflowIcon className="size-6" />
          <span className="select-none text-2xl font-medium">Phoneflow</span>
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {t("routes.signin_sso.title")}
            </CardTitle>
            <CardDescription>
              {t("routes.signin_sso.description")}
            </CardDescription>
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
                        {t("routes.signin_sso.email.label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder={t("routes.signin_sso.email.placeholder")}
                        autoComplete="username"
                        aria-invalid={fieldState.invalid}
                        disabled={signInMutation.isPending}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Button
                  type="submit"
                  disabled={signInMutation.isPending}
                  className="relative"
                >
                  {signInMutation.isPending ? (
                    <Spinner />
                  ) : (
                    t("routes.signin_sso.submit")
                  )}
                  {lastLoginMethod?.startsWith("sso-") && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 right-2"
                    >
                      {t("routes.signin_sso.last_used")}
                    </Badge>
                  )}
                </Button>
                <div className="text-center text-sm">
                  <Link
                    to="/signin"
                    search={{ redirect }}
                    className="underline"
                  >
                    {t("routes.signin_sso.back_to_sign_in")}
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
