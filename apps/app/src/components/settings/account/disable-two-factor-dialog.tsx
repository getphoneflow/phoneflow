import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { PasswordInput } from "@workspace/ui/components/password-input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { twoFactor } from "@/lib/auth/client"

const passwordSchema = z.object({
  password: z.string().min(1, "Password is required"),
})

type PasswordValues = z.infer<typeof passwordSchema>

export function DisableTwoFactorDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  })

  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      const result = await twoFactor.disable({ password })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: async () => {
      toast.success("Two-factor authentication disabled")
      form.reset()
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["session"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        form.reset()
        disableMutation.reset()
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="destructive">
            Disable
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable two-factor authentication</DialogTitle>
          <DialogDescription>
            Enter your password to disable two-factor authentication
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) =>
            disableMutation.mutate(values.password)
          )}
          noValidate
        >
          <FieldGroup>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <PasswordInput
                    {...field}
                    id={field.name}
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    disabled={disableMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-8">
            <DialogClose>
              <Button variant="outline" disabled={disableMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={disableMutation.isPending}
            >
              {disableMutation.isPending ? (
                <Spinner className="mx-7" />
              ) : (
                "Disable"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
