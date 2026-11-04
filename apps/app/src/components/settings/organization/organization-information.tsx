import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { organization } from "@/lib/auth/client"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

const organizationInformationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      1,
      "components.settings.organization.organization_information.name.required"
    ),
  slug: z
    .string()
    .trim()
    .min(
      1,
      "components.settings.organization.organization_information.slug.required"
    )
    .regex(
      /^[a-z0-9-]+$/,
      "components.settings.organization.organization_information.slug.format"
    ),
})

type OrganizationInformationValues = z.infer<
  typeof organizationInformationSchema
>

type OrganizationInformationProps = {
  organizationId: string
  name: string
  slug: string
}

export function OrganizationInformation({
  organizationId,
  name,
  slug,
}: OrganizationInformationProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canUpdate = useCheckPermission({ organization: ["update"] })

  const form = useForm<OrganizationInformationValues>({
    resolver: zodResolverI18n(organizationInformationSchema),
    defaultValues: { name, slug },
  })

  const updateOrganizationInformationMutation = useMutation({
    mutationFn: async (values: OrganizationInformationValues) => {
      const result = await organization.update({
        organizationId,
        data: {
          name: values.name,
          slug: values.slug,
        },
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(
        t(
          "components.settings.organization.organization_information.toasts.updated"
        )
      )
      queryClient.invalidateQueries({ queryKey: ["full-organization"] })
      queryClient.invalidateQueries({ queryKey: ["organizations-list"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const formDisabled =
    !canUpdate || updateOrganizationInformationMutation.isPending

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>
          {t("components.settings.organization.organization_information.title")}
        </FieldLegend>
        <FieldDescription>
          {t(
            "components.settings.organization.organization_information.description"
          )}
        </FieldDescription>
      </FieldSet>

      <form
        onSubmit={form.handleSubmit((values) =>
          updateOrganizationInformationMutation.mutate(values)
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
                    "components.settings.organization.organization_information.name.label"
                  )}
                </FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  autoComplete="organization"
                  aria-invalid={fieldState.invalid}
                  disabled={formDisabled}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="slug"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  {t(
                    "components.settings.organization.organization_information.slug.label"
                  )}
                </FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  disabled={formDisabled}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Button type="submit" disabled={formDisabled}>
            {updateOrganizationInformationMutation.isPending ? (
              <Spinner />
            ) : (
              t("common.actions.save")
            )}
          </Button>
        </FieldGroup>
      </form>
    </FieldGroup>
  )
}
