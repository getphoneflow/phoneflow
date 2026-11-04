import { useMutation } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
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
import { PasswordInput } from "@workspace/ui/components/password-input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { PhoneflowIcon } from "@/components/logos/phoneflow"
import { resetPassword } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

export const Route = createFileRoute("/(unauthorized)/set-new-password/")({
  component: Page,
})

const setNewPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(8, "routes.set_new_password.password.min_length")
      .regex(/[A-Z]/, "routes.set_new_password.password.uppercase")
      .regex(/[a-z]/, "routes.set_new_password.password.lowercase")
      .regex(/[0-9]/, "routes.set_new_password.password.number"),
    confirmPassword: z
      .string()
      .min(1, "routes.set_new_password.confirm_password.required"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "routes.set_new_password.confirm_password.mismatch",
    path: ["confirmPassword"],
  })

type SetNewPasswordFormValues = z.infer<typeof setNewPasswordFormSchema>

function Page() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const token = new URLSearchParams(location.searchStr).get("token")

  const form = useForm<SetNewPasswordFormValues>({
    resolver: zodResolverI18n(setNewPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const setNewPasswordMutation = useMutation({
    mutationFn: async (values: SetNewPasswordFormValues) => {
      if (!token) {
        throw new Error(t("routes.set_new_password.invalid_token"))
      }

      const result = await resetPassword({
        newPassword: values.password,
        token,
      })

      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(t("routes.set_new_password.toasts.success"))
      navigate({ to: "/signin" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!token) {
    return null
  }

  return (
    <>
      <title>{t("routes.set_new_password.page_title")}</title>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 py-8">
        <div className="flex items-center gap-2">
          <PhoneflowIcon className="size-6" />
          <span className="select-none text-2xl font-medium">Phoneflow</span>
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {t("routes.set_new_password.title")}
            </CardTitle>
            <CardDescription>
              {t("routes.set_new_password.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((values) =>
                setNewPasswordMutation.mutate(values)
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
                        {t("routes.set_new_password.password.label")}
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
                        {t("routes.set_new_password.confirm_password.label")}
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

                <Button
                  type="submit"
                  disabled={setNewPasswordMutation.isPending}
                >
                  {setNewPasswordMutation.isPending ? (
                    <Spinner className="mx-12" />
                  ) : (
                    t("routes.set_new_password.submit")
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    {t("routes.set_new_password.remember_password")}{" "}
                  </span>
                  <Link to="/signin" className="underline">
                    {t("routes.set_new_password.sign_in_link")}
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
