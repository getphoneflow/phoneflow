import { zodResolver } from "@hookform/resolvers/zod"
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
import { requestPasswordReset } from "@/lib/auth/client"
import { env } from "@/lib/env"

export const Route = createFileRoute("/(unauthorized)/reset-password/")({
  component: Page,
})

function Page() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const recoverPasswordFormSchema = z.object({
    email: z.email("Enter a valid email address"),
  })

  type RecoverPasswordFormValues = z.infer<typeof recoverPasswordFormSchema>

  const form = useForm<RecoverPasswordFormValues>({
    resolver: zodResolver(recoverPasswordFormSchema),
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
      toast.success(
        "If an account exists for this email, a reset link has been sent"
      )
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
      <title>Reset password - PhoneFlow</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Reset password</CardTitle>
            <CardDescription>
              Enter your email below to receive a password reset link
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
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder="name@example.com"
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
                    "Send reset link"
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    Already remember it?{" "}
                  </span>
                  <Link to="/signin" className="underline">
                    Sign in
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
