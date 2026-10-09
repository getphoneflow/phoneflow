import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { XIcon } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { captureEvent } from "@/lib/analytics"
import { organization } from "@/lib/auth/client"
import { fullOrganizationQueryOptions } from "@/lib/auth/organization"
import {
  type AssignableRole,
  assignableRoleSchema,
  assignableRoles,
  roleLabels,
} from "@/lib/auth/roles"

type InviteRole = AssignableRole

async function inviteMember(email: string, role: InviteRole) {
  const result = await organization.inviteMember({ email, role })
  if (result.error) {
    toast.error(`${email}: ${result.error.message}`)
    return
  }
  captureEvent("organization_member_invited", { role })
  toast.success(`Invitation sent to ${email}`)
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/invite-members/"
)({
  component: Page,
})

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: activeOrganization } = useSuspenseQuery(
    fullOrganizationQueryOptions()
  )

  const inviteMembersFormSchema = z.object({
    emails: z
      .array(
        z.object({
          address: z.email("Enter a valid email address"),
          role: assignableRoleSchema,
        })
      )
      .min(1, "Add at least one email address.")
      .max(5, "You can add up to 5 email addresses."),
  })

  type InviteMembersFormValues = z.infer<typeof inviteMembersFormSchema>

  const form = useForm<InviteMembersFormValues>({
    resolver: zodResolver(inviteMembersFormSchema),
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
      values.emails.map(({ address, role }) => inviteMember(address, role))
    )
    await queryClient.invalidateQueries({ queryKey: ["full-organization"] })
    navigate({ to: "/" })
  }

  return (
    <>
      <title>Invite members - PhoneFlow</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Invite members</CardTitle>
            <CardDescription>
              Send email invitations to join {activeOrganization?.name}
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
                                placeholder="name@example.com"
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
                          <Field className="w-28 shrink-0">
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={form.formState.isSubmitting}
                            >
                              <SelectTrigger
                                id={field.name}
                                className="w-full"
                                aria-label={`Role for email ${index + 1}`}
                              >
                                <SelectValue>
                                  {roleLabels[field.value]}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {assignableRoles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {roleLabels[role]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                          aria-label={`Remove email ${index + 1}`}
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
                      Add email address
                    </Button>
                  )}
                </FieldGroup>

                {form.formState.errors.emails?.root && (
                  <FieldError errors={[form.formState.errors.emails.root]} />
                )}

                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Spinner /> : "Invite members"}
                </Button>

                <Button render={<Link to="/" />} variant="ghost">
                  Skip for now
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
