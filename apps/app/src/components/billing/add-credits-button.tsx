import { zodResolver } from "@hookform/resolvers/zod"
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
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"

type AddCreditsButtonProps = {
  size?: ComponentProps<typeof Button>["size"]
  className?: string
}

export function AddCreditsButton({
  size = "default",
  className,
}: AddCreditsButtonProps) {
  const canPurchase = useCheckPermission({ billing: ["purchase"] })
  const [open, setOpen] = useState(false)
  const form = useForm<CreateCheckoutRequest>({
    resolver: zodResolver(createCheckoutRequestSchema),
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
    onSuccess: (data) => {
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
            <DialogTitle>Add credits</DialogTitle>
            <DialogDescription>
              Add more credits to this organization balance
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
                    <FieldLabel htmlFor={field.name}>Credit amount</FieldLabel>
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
              Sales tax, VAT, or other indirect taxes may be added to the charge
              according to your local regulations.
            </p>
          </form>

          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                Cancel
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
                "Add credits"
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
        Add credits
      </Button>
    </>
  )
}
