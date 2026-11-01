import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { CopyButton } from "@/components/copy-button"
import { authClient } from "@/lib/auth/client"
import { env } from "@/lib/env"
import { DomainList, domainListSchema } from "./domain-list"

const oidcSchema = z.object({
  issuer: z.url("Enter the identity provider issuer URL"),
  clientId: z.string().trim().min(1, "Client ID is required"),
  clientSecret: z.string().trim().min(1, "Client secret is required"),
  domains: domainListSchema,
})

type OidcValues = z.infer<typeof oidcSchema>

type OidcFormProps = {
  canUpdate: boolean
  organizationId: string
  providerId: string
  onCreated: () => void
}

export function OidcForm({
  canUpdate,
  organizationId,
  providerId,
  onCreated,
}: OidcFormProps) {
  const redirectUrl = `${env.API_URL}/api/auth/sso/callback/${providerId}`

  const form = useForm<OidcValues>({
    resolver: zodResolver(oidcSchema),
    defaultValues: {
      issuer: "",
      clientId: "",
      clientSecret: "",
      domains: [{ value: "" }],
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (values: OidcValues) => {
      const result = await authClient.sso.register({
        providerId,
        issuer: values.issuer,
        domain: values.domains.map((domain) => domain.value).join(","),
        organizationId,
        oidcConfig: {
          clientId: values.clientId,
          clientSecret: values.clientSecret,
        },
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success("Provider connected")
      onCreated()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const disabled = !canUpdate || registerMutation.isPending

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}
      noValidate
    >
      <FieldGroup>
        <Field>
          <FieldLabel>Redirect URL</FieldLabel>
          <div className="flex gap-2">
            <Input readOnly value={redirectUrl} />
            <CopyButton value={redirectUrl} />
          </div>
        </Field>
        <Controller
          name="issuer"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Issuer</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="https://idp.example.com"
                aria-invalid={fieldState.invalid}
                disabled={disabled}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="clientId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Client ID</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                disabled={disabled}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="clientSecret"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Client secret</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                disabled={disabled}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <DomainList control={form.control} disabled={disabled} />
        <Button type="submit" disabled={disabled}>
          {registerMutation.isPending ? <Spinner /> : "Connect provider"}
        </Button>
      </FieldGroup>
    </form>
  )
}
