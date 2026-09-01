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
  FieldSeparator,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { PasswordInput } from "@workspace/ui/components/password-input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { signIn, signUp } from "@/lib/auth/client"
import { env } from "@/lib/env"
import { TIME_ZONES } from "@/lib/time"

export const Route = createFileRoute("/(unauthorized)/signup/")({
  component: Page,
})

function Page() {
  const navigate = useNavigate()
  const { searchStr } = useLocation()
  const redirect = new URLSearchParams(searchStr).get("redirect") ?? undefined
  const email =
    new URLSearchParams(redirect?.split("?")[1] ?? "").get("email") ?? ""
  const callbackURL = redirect
    ? `${env.FRONTEND_URL}${redirect}`
    : env.FRONTEND_URL

  const signUpFormSchema = z
    .object({
      name: z.string().trim().min(1, "Name is required"),
      email: z.email("Enter a valid email address"),
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

  type SignUpFormValues = z.infer<typeof signUpFormSchema>

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
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
        timezone: TIME_ZONES.includes(timezone) ? timezone : "UTC",
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: (_, values) => {
      navigate({
        to: "/email-verification",
        search: { email: values.email, redirect },
      })
    },
    onError: (error) => {
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
      <title>Sign up</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Sign up</CardTitle>
            <CardDescription>
              Enter your information below to sign up
            </CardDescription>
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
                      <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="John Doe"
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
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder="name@example.com"
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
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
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
                        Confirm Password
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

                <Button type="submit" disabled={signUpMutation.isPending}>
                  {signUpMutation.isPending ? <Spinner /> : "Sign up"}
                </Button>

                <FieldSeparator>Or continue with</FieldSeparator>

                <Button
                  variant="outline"
                  disabled={signUpMutation.isPending}
                  onClick={handleGoogleSignUp}
                >
                  <img
                    src="/logos/google.svg"
                    alt="Google logo"
                    className="size-5"
                  />
                  Sign up with Google
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    Already have an account?{" "}
                  </span>
                  <Link
                    to="/signin"
                    search={{ redirect }}
                    className="underline"
                  >
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
