import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

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
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { captureEvent, identifyOrganization } from "@/lib/analytics"
import { organization } from "@/lib/auth/client"
import { sessionQueryOptions } from "@/lib/auth/session"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

export const Route = createFileRoute("/(authorized)/create-organization/")({
  component: Page,
})

const createOrganizationFormSchema = z.object({
  name: z.string().trim().min(1, "routes.create_organization.name.required"),
})

type CreateOrganizationFormValues = z.infer<typeof createOrganizationFormSchema>

function Page() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = useSuspenseQuery(sessionQueryOptions())

  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolverI18n(createOrganizationFormSchema),
    defaultValues: {
      name: session?.user.name
        ? t("routes.create_organization.name.default_value", {
            name: session.user.name,
          })
        : "",
    },
  })

  const createOrganizationMutation = useMutation({
    mutationFn: async (values: CreateOrganizationFormValues) => {
      const result = await organization.create({
        name: values.name,
        slug: crypto.randomUUID(),
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    onSuccess: async (org) => {
      identifyOrganization(org)
      captureEvent("organization_created", {
        organization_id: org?.id,
        name: org?.name,
      })
      toast.success(t("routes.create_organization.toasts.created"))
      await queryClient.refetchQueries()
      navigate({ to: "/invite-members" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <title>{t("routes.create_organization.page_title")}</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">
              {t("routes.create_organization.title")}
            </CardTitle>
            <CardDescription>
              {t("routes.create_organization.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((values) =>
                createOrganizationMutation.mutate(values)
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
                        {t("routes.create_organization.name.label")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder={t(
                          "routes.create_organization.name.placeholder"
                        )}
                        autoComplete="organization"
                        autoFocus
                        aria-invalid={fieldState.invalid}
                        disabled={createOrganizationMutation.isPending}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createOrganizationMutation.isPending}
                >
                  {createOrganizationMutation.isPending ? (
                    <Spinner />
                  ) : (
                    t("routes.create_organization.submit")
                  )}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
