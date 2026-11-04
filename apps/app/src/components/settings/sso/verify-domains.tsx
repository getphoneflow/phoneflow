import { useMutation } from "@tanstack/react-query"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { CopyButton } from "@/components/copy-button"
import { authClient } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"

type VerifyDomainsProps = {
  canUpdate: boolean
  providerId: string
  domainVerificationToken: string
  onVerified: () => void
}

export function VerifyDomains({
  canUpdate,
  providerId,
  domainVerificationToken,
  onVerified,
}: VerifyDomainsProps) {
  const { t } = useTranslation()
  const name = `_phoneflow-${providerId}`
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.sso.verifyDomain({ providerId })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(t("components.settings.sso.verify_domains.toasts.verified"))
      onVerified()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <FieldGroup>
      <FieldDescription>
        {t("components.settings.sso.verify_domains.description")}
      </FieldDescription>
      <Field>
        <FieldLabel>
          {t("components.settings.sso.verify_domains.name")}
        </FieldLabel>
        <div className="flex gap-2">
          <Input readOnly value={name} />
          <CopyButton value={name} />
        </div>
      </Field>
      <Field>
        <FieldLabel>
          {t("components.settings.sso.verify_domains.content")}
        </FieldLabel>
        <div className="flex gap-2">
          <Input readOnly value={domainVerificationToken} />
          <CopyButton value={domainVerificationToken} />
        </div>
      </Field>
      <Button
        type="button"
        onClick={() => verifyMutation.mutate()}
        disabled={!canUpdate || verifyMutation.isPending}
      >
        {verifyMutation.isPending ? (
          <Spinner />
        ) : (
          t("components.settings.sso.verify_domains.submit")
        )}
      </Button>
    </FieldGroup>
  )
}
