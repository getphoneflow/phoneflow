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
  const name = `_phoneflow-${providerId}`
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.sso.verifyDomain({ providerId })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success("Domain verified")
      onVerified()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <FieldGroup>
      <FieldDescription>Add this TXT record on every domain</FieldDescription>
      <Field>
        <FieldLabel>Name</FieldLabel>
        <div className="flex gap-2">
          <Input readOnly value={name} />
          <CopyButton value={name} />
        </div>
      </Field>
      <Field>
        <FieldLabel>Content</FieldLabel>
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
        {verifyMutation.isPending ? <Spinner /> : "Verify"}
      </Button>
    </FieldGroup>
  )
}
