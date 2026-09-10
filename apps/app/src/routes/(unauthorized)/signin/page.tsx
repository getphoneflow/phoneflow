import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
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
import { GoogleIcon } from "@/components/logos/google"
import { getLastUsedLoginMethod, signIn } from "@/lib/auth/client"
import { env } from "@/lib/env"

export const Route = createFileRoute("/(unauthorized)/signin/")({
  component: Page,
})

function Page() {
  const navigate = useNavigate()
  const { searchStr } = useLocation()
  const redirect = new URLSearchParams(searchStr).get("redirect") ?? undefined
  const email =
    new URLSearchParams(redirect?.split("?")[1] ?? "").get("email") ?? ""
  const queryClient = useQueryClient()
  const lastLoginMethod = getLastUsedLoginMethod()

  const callbackURL = redirect
    ? `${env.FRONTEND_URL}${redirect}`
    : env.FRONTEND_URL

  const signInFormSchema = z.object({
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })

  type SignInFormValues = z.infer<typeof signInFormSchema>

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
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
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["session"] })

      if (redirect) {
        navigate({ href: redirect })
        return
      }

      navigate({ to: "/" })
    },
    onError: (error) => {
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
      <title>Sign in</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Enter your email and password below to sign in
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
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder="name@example.com"
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
                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                        <Link
                          to="/reset-password"
                          className="ml-auto inline-block text-sm underline"
                        >
                          Forgot your password?
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

                <Button
                  type="submit"
                  disabled={signInMutation.isPending}
                  className="relative"
                >
                  {signInMutation.isPending ? <Spinner /> : "Sign in"}
                  {lastLoginMethod === "email" && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 right-2"
                    >
                      Last used
                    </Badge>
                  )}
                </Button>

                <FieldSeparator>Or continue with</FieldSeparator>

                <Button
                  variant="outline"
                  disabled={signInMutation.isPending}
                  onClick={handleGoogleSignIn}
                  className="relative"
                >
                  <GoogleIcon className="size-5" />
                  Sign in with Google
                  {lastLoginMethod === "google" && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 right-2"
                    >
                      Last used
                    </Badge>
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    Don't have an account?{" "}
                  </span>
                  <Link
                    to="/signup"
                    search={{ redirect }}
                    className="underline"
                  >
                    Sign up
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
