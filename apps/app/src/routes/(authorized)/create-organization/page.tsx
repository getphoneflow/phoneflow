import { zodResolver } from "@hookform/resolvers/zod"
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
import { organization } from "@/lib/auth/client"
import { sessionQueryOptions } from "@/lib/auth/session"

export const Route = createFileRoute("/(authorized)/create-organization/")({
  component: Page,
})

function Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = useSuspenseQuery(sessionQueryOptions())

  const createOrganizationFormSchema = z.object({
    name: z.string().trim().min(1, "Organization name is required"),
  })

  type CreateOrganizationFormValues = z.infer<
    typeof createOrganizationFormSchema
  >

  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationFormSchema),
    defaultValues: {
      name: session?.user.name ? `${session.user.name}'s Org` : "",
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
    },
    onSuccess: async () => {
      toast.success("Organization created")
      await queryClient.refetchQueries()
      navigate({ to: "/invite-members" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <title>Create organization</title>
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Create organization</CardTitle>
            <CardDescription>Create an organization</CardDescription>
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
                        Organization name
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="Acme Inc"
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
                    "Create organization"
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
