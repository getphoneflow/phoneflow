import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { addDoNotCallRequestSchema } from "@workspace/shared/api/do-not-call/schemas"
import type {
  AddDoNotCallRequest,
  DoNotCallNumber,
} from "@workspace/shared/api/do-not-call/types"
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
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

export function AddDoNotCallDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const canCreate = useCheckPermission({ doNotCall: ["create"] })

  const form = useForm<AddDoNotCallRequest>({
    resolver: zodResolverI18n(addDoNotCallRequestSchema),
    defaultValues: {
      number: "",
      reason: null,
    },
  })

  const addMutation = useMutation({
    mutationFn: (body: AddDoNotCallRequest) =>
      api.post<DoNotCallNumber, AddDoNotCallRequest>("/do-not-call", { body }),
    onSuccess: (entry) => {
      toast.success(
        t("components.do_not_call.add_dialog.toasts.added", {
          number: entry.number,
        })
      )
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["do-not-call"] })
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      queryClient.invalidateQueries({ queryKey: ["calls"] })
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
        addMutation.reset()
      }}
    >
      <DialogTrigger disabled={!canCreate}>
        <Button disabled={!canCreate}>
          <PlusIcon />
          {t("components.do_not_call.add_dialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("components.do_not_call.add_dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.do_not_call.add_dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) => addMutation.mutate(values))}
          noValidate
        >
          <FieldGroup>
            <Controller
              name="number"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("components.do_not_call.add_dialog.number.label")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="+14155551234"
                    autoComplete="off"
                    disabled={addMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="reason"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("components.do_not_call.add_dialog.reason.label")}
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder={t(
                      "components.do_not_call.add_dialog.reason.placeholder"
                    )}
                    autoComplete="off"
                    value={field.value ?? ""}
                    disabled={addMutation.isPending}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="mt-6">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={addMutation.isPending}
                />
              }
            >
              {t("common.actions.cancel")}
            </DialogClose>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <Spinner />
              ) : (
                t("components.do_not_call.add_dialog.submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
