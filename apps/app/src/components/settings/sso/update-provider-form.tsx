import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@workspace/ui/components/button"
import { FieldGroup } from "@workspace/ui/components/field"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { authClient } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"
import { DomainList, domainListSchema } from "./domain-list"

const providerSchema = z.object({
  domains: domainListSchema,
})

type ProviderValues = z.infer<typeof providerSchema>

type UpdateProviderFormProps = {
  canUpdate: boolean
  providerId: string
  domain: string
  onUpdated: () => void
}

export function UpdateProviderForm({
  canUpdate,
  providerId,
  domain: savedDomain,
  onUpdated,
}: UpdateProviderFormProps) {
  const { t } = useTranslation()
  const form = useForm<ProviderValues>({
    resolver: zodResolverI18n(providerSchema),
    defaultValues: {
      domains: savedDomain.split(",").map((value) => ({ value })),
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: ProviderValues) => {
      const domain = values.domains.map((item) => item.value).join(",")
      if (domain === savedDomain) {
        return
      }
      const result = await authClient.sso.updateProvider({
        providerId,
        domain,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(
        t("components.settings.sso.update_provider_form.toasts.updated")
      )
      onUpdated()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const disabled = !canUpdate || saveMutation.isPending

  return (
    <form
      onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      noValidate
    >
      <FieldGroup>
        <DomainList control={form.control} disabled={disabled} />
        <Button type="submit" disabled={disabled}>
          {saveMutation.isPending ? <Spinner /> : t("common.actions.save")}
        </Button>
      </FieldGroup>
    </form>
  )
}
