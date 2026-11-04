import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { PlusIcon, XIcon } from "lucide-react"
import { Suspense } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field, FieldError, FieldGroup } from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { SelectRole } from "@/components/settings/members/select-role"
import { captureEvent } from "@/lib/analytics"
import { organization } from "@/lib/auth/client"
import { fullOrganizationQueryOptions } from "@/lib/auth/organization"
import { type TFunction, useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"

async function inviteMember(email: string, role: string, t: TFunction) {
  const result = await organization.inviteMember({ email, role })
  if (result.error) {
    toast.error(
      t("routes.invite_members.toasts.invite_failed", {
        email,
        message: result.error.message,
      })
    )
    return
  }
  captureEvent("organization_member_invited", { role })
  toast.success(t("routes.invite_members.toasts.invited", { email }))
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/invite-members/"
)({
  component: Page,
})

const inviteMembersFormSchema = z.object({
  emails: z
    .array(
      z.object({
        address: z.email("routes.invite_members.email.invalid"),
        role: z.string().min(1),
      })
    )
    .min(1, "routes.invite_members.emails.min")
    .max(5, "routes.invite_members.emails.max"),
})

type InviteMembersFormValues = z.infer<typeof inviteMembersFormSchema>

function InviteMembersSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-6">
      <Skeleton className="h-80 w-full max-w-md" />
    </div>
  )
}

function Page() {
  return (
    <Suspense fallback={<InviteMembersSkeleton />}>
      <InviteMembersContent />
    </Suspense>
  )
}

function InviteMembersContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: activeOrganization } = useSuspenseQuery(
    fullOrganizationQueryOptions()
  )

  const form = useForm<InviteMembersFormValues>({
    resolver: zodResolverI18n(inviteMembersFormSchema),
    defaultValues: {
      emails: [{ address: "", role: "member" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emails",
  })

  async function handleInviteMembers(values: InviteMembersFormValues) {
    await Promise.all(
      values.emails.map(({ address, role }) => inviteMember(address, role, t))
    )
    await queryClient.invalidateQueries({ queryKey: ["full-organization"] })
    navigate({ to: "/" })
  }

  return (
    <>
      <title>{t("routes.invite_members.page_title")}</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">
              {t("routes.invite_members.title")}
            </CardTitle>
            <CardDescription>
              {t("routes.invite_members.description", {
                organization: activeOrganization?.name,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleInviteMembers)} noValidate>
              <FieldGroup>
                <FieldGroup className="gap-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <Controller
                        name={`emails.${index}.address`}
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field
                            data-invalid={fieldState.invalid}
                            className="min-w-0 flex-1"
                          >
                            <InputGroup>
                              <InputGroupInput
                                {...field}
                                id={field.name}
                                type="email"
                                placeholder={t(
                                  "routes.invite_members.email.placeholder"
                                )}
                                autoComplete={index === 0 ? "email" : "off"}
                                aria-invalid={fieldState.invalid}
                                disabled={form.formState.isSubmitting}
                              />
                            </InputGroup>
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />

                      <Controller
                        name={`emails.${index}.role`}
                        control={form.control}
                        render={({ field }) => (
                          <Field className="w-36 shrink-0">
                            <SelectRole
                              id={field.name}
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={form.formState.isSubmitting}
                              ariaLabel={t(
                                "routes.invite_members.role_aria_label",
                                { index: index + 1 }
                              )}
                            />
                          </Field>
                        )}
                      />

                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="mt-0.5 shrink-0"
                          onClick={() => remove(index)}
                          disabled={form.formState.isSubmitting}
                          aria-label={t(
                            "routes.invite_members.remove_aria_label",
                            { index: index + 1 }
                          )}
                        >
                          <XIcon />
                        </Button>
                      )}
                    </div>
                  ))}

                  {fields.length < 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => append({ address: "", role: "member" })}
                      disabled={form.formState.isSubmitting}
                    >
                      <PlusIcon />
                      {t("routes.invite_members.add_email")}
                    </Button>
                  )}
                </FieldGroup>

                {form.formState.errors.emails?.root && (
                  <FieldError errors={[form.formState.errors.emails.root]} />
                )}

                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Spinner />
                  ) : (
                    t("routes.invite_members.submit")
                  )}
                </Button>

                <Button render={<Link to="/" />} variant="ghost">
                  {t("routes.invite_members.skip")}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
