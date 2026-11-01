import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { DownloadIcon } from "lucide-react"

import type { SsoProviderResponse } from "@workspace/shared/api/sso/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { CopyButton } from "@/components/copy-button"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth/client"
import { useCheckPermission } from "@/lib/auth/permissions"
import { env } from "@/lib/env"
import { DisconnectSsoProvider } from "./disconnect-sso-provider"
import { OidcForm } from "./oidc-form"
import { SamlForm } from "./saml-form"
import { UpdateProviderForm } from "./update-provider-form"
import { VerifyDomains } from "./verify-domains"

type SsoSettingsProps = {
  organizationId: string
  slug: string
}

export function SsoSettings({ organizationId, slug }: SsoSettingsProps) {
  const canUpdate = useCheckPermission({ organization: ["update"] })
  const queryClient = useQueryClient()
  const providerQuery = useSuspenseQuery({
    queryKey: ["sso-provider", organizationId, canUpdate],
    queryFn: async () => {
      const data = await api.get<SsoProviderResponse>("/sso")
      const provider = data.provider
      let domainVerificationToken: string | null = null
      if (canUpdate && provider && !provider.domainVerified) {
        const verification = await authClient.sso.requestDomainVerification({
          providerId: provider.providerId,
        })
        if (verification.error) {
          throw new Error(verification.error.message)
        }
        domainVerificationToken =
          verification.data?.domainVerificationToken ?? null
      }
      return { provider, domainVerificationToken }
    },
  })

  const providerId = `sso-${slug}`
  const provider = providerQuery.data.provider
  const redirectUrl = provider
    ? `${env.API_URL}/api/auth/sso/callback/${provider.providerId}`
    : ""
  const acsUrl = provider
    ? `${env.API_URL}/api/auth/sso/saml2/sp/acs/${provider.providerId}`
    : ""
  const spMetadataUrl = provider
    ? `${env.API_URL}/api/auth/sso/saml2/sp/metadata?providerId=${encodeURIComponent(provider.providerId)}`
    : ""

  function refresh() {
    queryClient.invalidateQueries({
      queryKey: ["sso-provider", organizationId],
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <FieldSet>
          <FieldLegend>Single sign-on</FieldLegend>
          <FieldDescription>
            {provider
              ? `Manage your ${provider.type === "oidc" ? "OIDC" : "SAML"} provider`
              : "Connect an identity provider to this organization"}
          </FieldDescription>
        </FieldSet>
        {provider ? (
          <Badge variant={provider.domainVerified ? "default" : "secondary"}>
            {provider.domainVerified ? "Verified" : "Pending verification"}
          </Badge>
        ) : null}
      </div>

      {!provider ? (
        <Tabs defaultValue="oidc">
          <TabsList>
            <TabsTrigger value="oidc">OIDC</TabsTrigger>
            <TabsTrigger value="saml">SAML</TabsTrigger>
          </TabsList>
          <TabsContent value="oidc" className="mt-4">
            <OidcForm
              canUpdate={canUpdate}
              organizationId={organizationId}
              providerId={providerId}
              onCreated={refresh}
            />
          </TabsContent>
          <TabsContent value="saml" className="mt-4">
            <SamlForm
              canUpdate={canUpdate}
              organizationId={organizationId}
              providerId={providerId}
              onCreated={refresh}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <FieldGroup>
            {provider.type === "oidc" ? (
              <Field>
                <FieldLabel>Redirect URL</FieldLabel>
                <div className="flex gap-2">
                  <Input readOnly value={redirectUrl} />
                  <CopyButton value={redirectUrl} />
                </div>
              </Field>
            ) : (
              <>
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
                    <Input readOnly value={provider.issuer} />
                    <CopyButton value={provider.issuer} />
                  </div>
                </Field>
                <Button
                  variant="outline"
                  render={
                    <a href={spMetadataUrl} target="_blank" rel="noreferrer" />
                  }
                >
                  <DownloadIcon />
                  Download SP metadata
                </Button>
              </>
            )}
          </FieldGroup>
          <UpdateProviderForm
            canUpdate={canUpdate}
            providerId={provider.providerId}
            domain={provider.domain}
            onUpdated={refresh}
          />
          {provider.domainVerified ||
          !providerQuery.data.domainVerificationToken ? null : (
            <VerifyDomains
              canUpdate={canUpdate}
              providerId={provider.providerId}
              domainVerificationToken={
                providerQuery.data.domainVerificationToken
              }
              onVerified={refresh}
            />
          )}
          <DisconnectSsoProvider
            canUpdate={canUpdate}
            providerId={provider.providerId}
            onDisconnected={refresh}
          />
        </>
      )}
    </div>
  )
}
