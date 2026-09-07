import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { RefreshCwIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { updateAutoReloadRequestSchema } from "@workspace/shared/api/billing/schemas"
import type {
  AutoReloadResponse,
  UpdateAutoReloadRequest,
} from "@workspace/shared/api/billing/types"
import {
  DEFAULT_CREDIT_AUTO_RELOAD_AMOUNT,
  DEFAULT_CREDIT_AUTO_RELOAD_THRESHOLD,
  MIN_CREDIT_PURCHASE_AMOUNT,
} from "@workspace/shared/constants/credits"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { Switch } from "@workspace/ui/components/switch"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { autoReloadQueryOptions } from "@/lib/billing"

const defaultSettings: UpdateAutoReloadRequest = {
  enabled: false,
  amount: DEFAULT_CREDIT_AUTO_RELOAD_AMOUNT,
  threshold: DEFAULT_CREDIT_AUTO_RELOAD_THRESHOLD,
}

export function AutoReloadButton() {
  const canPurchase = useCheckPermission({ billing: ["purchase"] })
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: settings, isPending } = useQuery(autoReloadQueryOptions())

  const form = useForm<UpdateAutoReloadRequest>({
    resolver: zodResolver(updateAutoReloadRequestSchema),
    values: settings ?? defaultSettings,
  })

  const saveMutation = useMutation({
    mutationFn: (values: UpdateAutoReloadRequest) =>
      api.put<AutoReloadResponse, UpdateAutoReloadRequest>(
        "/billing/auto-reload",
        { body: values }
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(autoReloadQueryOptions().queryKey, data)
      toast.success(
        data.enabled ? "Auto reload enabled" : "Auto reload settings saved"
      )
      setOpen(false)
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
          form.reset(settings ?? defaultSettings)
          saveMutation.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto reload</DialogTitle>
          </DialogHeader>

          {isPending || !settings ? (
            <Skeleton className="h-90 w-full" />
          ) : (
            <form
              id="auto-reload-form"
              onSubmit={form.handleSubmit((values) =>
                saveMutation.mutate(values)
              )}
              noValidate
            >
              <FieldGroup>
                <Controller
                  name="enabled"
                  control={form.control}
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <div className="space-y-1">
                        <FieldLabel htmlFor="auto-reload-enabled">
                          Enable auto reload
                        </FieldLabel>
                        <FieldDescription>
                          Automatically purchase credits when balance is low
                        </FieldDescription>
                      </div>
                      <Switch
                        id="auto-reload-enabled"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={saveMutation.isPending}
                      />
                    </Field>
                  )}
                />

                <Controller
                  name="amount"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Amount to reload
                      </FieldLabel>
                      <FieldDescription>
                        How many credits to add each time auto reload runs
                      </FieldDescription>
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
                          disabled={saveMutation.isPending}
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

                <Controller
                  name="threshold"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        When threshold reaches
                      </FieldLabel>
                      <FieldDescription>
                        Reload once your balance drops to this amount
                      </FieldDescription>
                      <InputGroup>
                        <InputGroupAddon>$</InputGroupAddon>
                        <InputGroupInput
                          {...field}
                          id={field.name}
                          type="number"
                          min={1}
                          step="1"
                          inputMode="decimal"
                          aria-invalid={fieldState.invalid}
                          disabled={saveMutation.isPending}
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

              <DialogFooter className="mt-8">
                <DialogClose>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saveMutation.isPending}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  form="auto-reload-form"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Spinner className="mx-5" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        variant="outline"
        disabled={!canPurchase}
        onClick={() => setOpen(true)}
      >
        <RefreshCwIcon />
        Auto reload
        {settings ? (
          <Badge variant="secondary">{settings.enabled ? "On" : "Off"}</Badge>
        ) : null}
      </Button>
    </>
  )
}
