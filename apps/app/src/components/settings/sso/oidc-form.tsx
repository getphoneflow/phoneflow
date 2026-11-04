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
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"
import { DomainList, domainListSchema } from "./domain-list"

const oidcSchema = z.object({
  issuer: z.url("components.settings.sso.oidc_form.issuer.invalid"),
  clientId: z
    .string()
    .trim()
    .min(1, "components.settings.sso.oidc_form.client_id.required"),
  clientSecret: z
    .string()
    .trim()
    .min(1, "components.settings.sso.oidc_form.client_secret.required"),
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
  const { t } = useTranslation()
  const redirectUrl = `${env.API_URL}/api/auth/sso/callback/${providerId}`

  const form = useForm<OidcValues>({
    resolver: zodResolverI18n(oidcSchema),
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
      toast.success(t("components.settings.sso.oidc_form.toasts.connected"))
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
          <FieldLabel>
            {t("components.settings.sso.oidc_form.redirect_url")}
          </FieldLabel>
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
              <FieldLabel htmlFor={field.name}>
                {t("components.settings.sso.oidc_form.issuer.label")}
              </FieldLabel>
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
              <FieldLabel htmlFor={field.name}>
                {t("components.settings.sso.oidc_form.client_id.label")}
              </FieldLabel>
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
              <FieldLabel htmlFor={field.name}>
                {t("components.settings.sso.oidc_form.client_secret.label")}
              </FieldLabel>
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
          {registerMutation.isPending ? (
            <Spinner />
          ) : (
            t("components.settings.sso.oidc_form.submit")
          )}
        </Button>
      </FieldGroup>
    </form>
  )
}
