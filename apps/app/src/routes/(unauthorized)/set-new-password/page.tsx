import { zodResolver } from "@hookform/resolvers/zod"
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
import { resetPassword } from "@/lib/auth/client"

export const Route = createFileRoute("/(unauthorized)/set-new-password/")({
  component: Page,
})

function Page() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = new URLSearchParams(location.searchStr).get("token")

  const setNewPasswordFormSchema = z
    .object({
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must include at least one uppercase letter")
        .regex(/[a-z]/, "Password must include at least one lowercase letter")
        .regex(/[0-9]/, "Password must include at least one number"),
      confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    })

  type SetNewPasswordFormValues = z.infer<typeof setNewPasswordFormSchema>

  const form = useForm<SetNewPasswordFormValues>({
    resolver: zodResolver(setNewPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const setNewPasswordMutation = useMutation({
    mutationFn: async (values: SetNewPasswordFormValues) => {
      if (!token) {
        throw new Error("Invalid or missing reset token")
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
      toast.success("New password set")
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
      <title>Set new password</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Set new password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
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
                      <FieldLabel htmlFor={field.name}>New Password</FieldLabel>
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
                        Confirm Password
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
                    "Set new password"
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
