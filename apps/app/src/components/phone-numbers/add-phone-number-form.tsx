import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { createPhoneNumberRequestSchema } from "@workspace/shared/api/phone-numbers/schemas"
import type {
  CreatePhoneNumberRequest,
  PhoneNumberResponse,
} from "@workspace/shared/api/phone-numbers/types"
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
import { Input } from "@workspace/ui/components/input"
import { PasswordInput } from "@workspace/ui/components/password-input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { captureEvent } from "@/lib/analytics"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"

export function AddPhoneNumberForm() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const canCreate = useCheckPermission({ phoneNumber: ["create"] })

  const form = useForm<CreatePhoneNumberRequest>({
    resolver: zodResolver(createPhoneNumberRequestSchema),
    defaultValues: {
      number: "",
      sipAddress: null,
      sipUsername: null,
      sipPassword: null,
    },
  })

  const saveMutation = useMutation({
    mutationFn: (values: CreatePhoneNumberRequest) =>
      api.post<PhoneNumberResponse, CreatePhoneNumberRequest>(
        "/phone-numbers",
        { body: values }
      ),
    onSuccess: (phoneNumber) => {
      captureEvent("phone_number_created", {
        phone_number_id: phoneNumber.id,
      })
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] })
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
        saveMutation.reset()
      }}
    >
      <DialogTrigger disabled={!canCreate}>
        <Button disabled={!canCreate}>
          <PlusIcon />
          Add phone number
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add phone number</DialogTitle>
          <DialogDescription>Add a new phone number</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
        >
          <FieldGroup>
            <Controller
              name="number"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Phone number</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="+14155551234"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="sipAddress"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>SIP address</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    ref={field.ref}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                    aria-invalid={fieldState.invalid}
                    placeholder="sip.example.com"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="sipUsername"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>SIP username</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    ref={field.ref}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                    aria-invalid={fieldState.invalid}
                    placeholder="username"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="sipPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>SIP password</FieldLabel>
                  <PasswordInput
                    id={field.name}
                    name={field.name}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                    disabled={saveMutation.isPending}
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
              <Button variant="outline" disabled={saveMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                "Add phone number"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
