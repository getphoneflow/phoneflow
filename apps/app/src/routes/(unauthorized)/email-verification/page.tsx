import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"
import { toast } from "@workspace/ui/components/sonner"
import { emailOtp } from "@/lib/auth/client"

export const Route = createFileRoute("/(unauthorized)/email-verification/")({
  beforeLoad: ({ search }) => {
    if (!search.email) {
      throw redirect({
        to: "/signup",
        search: { redirect: search.redirect },
      })
    }
  },
  component: Page,
})

function Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { email, redirect: redirectTo } = Route.useSearch()
  const [otp, setOtp] = useState("")

  const verifyEmailMutation = useMutation({
    mutationFn: async (code: string) => {
      const result = await emailOtp.verifyEmail({
        email: email!,
        otp: code,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["session"] })

      if (redirectTo) {
        navigate({ href: redirectTo })
        return
      }

      navigate({ to: "/" })
    },
    onError: (error) => {
      toast.error(error.message)
      setOtp("")
    },
  })

  const sendVerificationOtpMutation = useMutation({
    mutationFn: async () => {
      const result = await emailOtp.sendVerificationOtp({
        email: email!,
        type: "email-verification",
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success("A new verification code was sent")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const isPending =
    verifyEmailMutation.isPending || sendVerificationOtpMutation.isPending

  return (
    <>
      <title>Verify your email - PhoneFlow</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Verify your email</CardTitle>
            <CardDescription>
              Enter the verification code sent to your email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InputOTP
              maxLength={6}
              id="otp-verification"
              value={otp}
              onChange={setOtp}
              disabled={isPending}
              autoFocus
              containerClassName="justify-center mt-6 mb-12"
              onComplete={(value) => verifyEmailMutation.mutate(value)}
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
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Didn't receive an email?{" "}
              </span>
              <button
                className="underline disabled:opacity-50"
                disabled={isPending}
                onClick={() => sendVerificationOtpMutation.mutate()}
              >
                Resend
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
