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
import { Textarea } from "@workspace/ui/components/textarea"
import { CopyButton } from "@/components/copy-button"
import { authClient } from "@/lib/auth/client"
import { env } from "@/lib/env"
import { DomainList, domainListSchema } from "./domain-list"

const samlSchema = z.object({
  domains: domainListSchema,
  metadata: z
    .string()
    .trim()
    .min(1, "Paste the identity provider metadata")
    .max(100_000, "Metadata is too large"),
})

type SamlValues = z.infer<typeof samlSchema>

type SamlFormProps = {
  canUpdate: boolean
  organizationId: string
  providerId: string
  onCreated: () => void
}

export function SamlForm({
  canUpdate,
  organizationId,
  providerId,
  onCreated,
}: SamlFormProps) {
  const acsUrl = `${env.API_URL}/api/auth/sso/saml2/sp/acs/${providerId}`
  const entityId = `${env.API_URL}/api/auth/sso/saml2/sp/${providerId}`

  const form = useForm<SamlValues>({
    resolver: zodResolver(samlSchema),
    defaultValues: { domains: [{ value: "" }], metadata: "" },
  })

  const registerMutation = useMutation({
    mutationFn: async (values: SamlValues) => {
      const result = await authClient.sso.register({
        providerId,
        issuer: entityId,
        domain: values.domains.map((domain) => domain.value).join(","),
        organizationId,
        samlConfig: {
          entryPoint: "",
          cert: "",
          callbackUrl: acsUrl,
          identifierFormat:
            "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
          idpMetadata: {
            metadata: values.metadata,
          },
          spMetadata: {
            entityID: entityId,
          },
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
          <FieldLabel>ACS URL</FieldLabel>
          <div className="flex gap-2">
            <Input readOnly value={acsUrl} />
            <CopyButton value={acsUrl} />
          </div>
        </Field>
        <Field>
          <FieldLabel>Entity ID</FieldLabel>
          <div className="flex gap-2">
            <Input readOnly value={entityId} />
            <CopyButton value={entityId} />
          </div>
        </Field>
        <DomainList control={form.control} disabled={disabled} />
        <Controller
          name="metadata"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Identity provider metadata
              </FieldLabel>
              <Textarea
                {...field}
                id={field.name}
                rows={8}
                aria-invalid={fieldState.invalid}
                disabled={disabled}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" disabled={disabled}>
          {registerMutation.isPending ? <Spinner /> : "Connect provider"}
        </Button>
      </FieldGroup>
    </form>
  )
}
