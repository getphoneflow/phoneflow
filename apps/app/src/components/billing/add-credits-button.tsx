import { useMutation } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import { type ComponentProps, useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { createCheckoutRequestSchema } from "@workspace/shared/api/billing/schemas"
import type {
  CheckoutResponse,
  CreateCheckoutRequest,
} from "@workspace/shared/api/billing/types"
import {
  DEFAULT_CREDIT_PURCHASE_AMOUNT,
  MIN_CREDIT_PURCHASE_AMOUNT,
} from "@workspace/shared/constants/credits"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { captureEvent } from "@/lib/analytics"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

type AddCreditsButtonProps = {
  size?: ComponentProps<typeof Button>["size"]
  className?: string
}

export function AddCreditsButton({
  size = "default",
  className,
}: AddCreditsButtonProps) {
  const { t } = useTranslation()
  const canPurchase = useCheckPermission({ billing: ["purchase"] })
  const [open, setOpen] = useState(false)
  const form = useForm<CreateCheckoutRequest>({
    resolver: zodResolverI18n(createCheckoutRequestSchema),
    defaultValues: {
      amount: DEFAULT_CREDIT_PURCHASE_AMOUNT,
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: async (values: CreateCheckoutRequest) => {
      return api.post<CheckoutResponse, CreateCheckoutRequest>(
        "/billing/checkout",
        {
          body: values,
        }
      )
    },
    onSuccess: (data, values) => {
      captureEvent("billing_checkout_started", { amount: values.amount })
      window.location.href = data.url
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          form.reset()
          checkoutMutation.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("components.billing.add_credits_button.title")}
            </DialogTitle>
            <DialogDescription>
              {t("components.billing.add_credits_button.description")}
            </DialogDescription>
          </DialogHeader>

          <form
            id="add-credits-form"
            onSubmit={form.handleSubmit((values) =>
              checkoutMutation.mutate(values)
            )}
            noValidate
          >
            <FieldGroup>
              <Controller
                name="amount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("components.billing.add_credits_button.amount.label")}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>$</InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id={field.name}
                        type="number"
                        min={MIN_CREDIT_PURCHASE_AMOUNT}
                        step="1"
                        inputMode="decimal"
                        aria-invalid={fieldState.invalid}
                        disabled={checkoutMutation.isPending}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                        value={Number.isNaN(field.value) ? "" : field.value}
                      />
                    </InputGroup>
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                )}
              />
            </FieldGroup>

            <p className="mt-6 text-xs text-muted-foreground">
              {t("components.billing.add_credits_button.tax_notice")}
            </p>
          </form>

          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                {t("common.actions.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="add-credits-form"
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                t("components.billing.add_credits_button.submit")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        size={size}
        className={className}
        disabled={!canPurchase}
        onClick={() => {
          form.reset()
          setOpen(true)
        }}
      >
        <PlusIcon className={size === "sm" ? "size-3.5" : undefined} />
        {t("components.billing.add_credits_button.trigger")}
      </Button>
    </>
  )
}
