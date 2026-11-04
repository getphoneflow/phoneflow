import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Trash2Icon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@workspace/ui/components/item"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { organization } from "@/lib/auth/client"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

const deleteOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      1,
      "components.settings.organization.delete_organization.name.required"
    ),
})

type DeleteOrganizationValues = z.infer<typeof deleteOrganizationSchema>

type DeleteOrganizationProps = {
  organizationId: string
  name: string
}

export function DeleteOrganization({
  organizationId,
  name,
}: DeleteOrganizationProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canDelete = useCheckPermission({ organization: ["delete"] })

  const form = useForm<DeleteOrganizationValues>({
    resolver: zodResolverI18n(
      deleteOrganizationSchema.superRefine((values, ctx) => {
        if (values.name !== name) {
          ctx.addIssue({
            code: "custom",
            message:
              "components.settings.organization.delete_organization.name.mismatch",
            path: ["name"],
          })
        }
      })
    ),
    defaultValues: {
      name: "",
    },
  })

  const enteredName = form.watch("name")

  const deleteOrganizationMutation = useMutation({
    mutationFn: async (_values: DeleteOrganizationValues) => {
      const result = await organization.delete({ organizationId })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: async () => {
      toast.success(
        t("components.settings.organization.delete_organization.toasts.deleted")
      )
      await queryClient.refetchQueries()
      navigate({ to: "/select-organization" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend className="mb-0">
          {t(
            "components.settings.organization.delete_organization.danger_zone"
          )}
        </FieldLegend>
      </FieldSet>

      <AlertDialog
        onOpenChange={() => {
          form.reset()
          deleteOrganizationMutation.reset()
        }}
      >
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>
              {t("components.settings.organization.delete_organization.title")}
            </ItemTitle>
            <ItemDescription>
              {t(
                "components.settings.organization.delete_organization.description"
              )}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <AlertDialogTrigger
              disabled={!canDelete}
              render={
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canDelete}
                >
                  <Trash2Icon className="size-4" />
                  {t(
                    "components.settings.organization.delete_organization.trigger"
                  )}
                </Button>
              }
            />
          </ItemActions>
        </Item>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "components.settings.organization.delete_organization.dialog.title"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "components.settings.organization.delete_organization.dialog.description"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form
            onSubmit={form.handleSubmit((values) =>
              deleteOrganizationMutation.mutate(values)
            )}
            noValidate
          >
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t(
                        "components.settings.organization.delete_organization.name.label"
                      )}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      autoComplete="organization"
                      placeholder={name}
                      aria-invalid={fieldState.invalid}
                      disabled={deleteOrganizationMutation.isPending}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <AlertDialogFooter className="mt-8">
              <AlertDialogCancel
                disabled={deleteOrganizationMutation.isPending}
              >
                {t("common.actions.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                type="submit"
                disabled={
                  deleteOrganizationMutation.isPending || enteredName !== name
                }
              >
                {deleteOrganizationMutation.isPending ? (
                  <Spinner className="mx-5 size-4" />
                ) : (
                  t(
                    "components.settings.organization.delete_organization.dialog.confirm"
                  )
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </FieldGroup>
  )
}
