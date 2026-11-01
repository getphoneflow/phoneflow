export type SsoProviderResponse = {
  provider: {
    providerId: string
    type: "oidc" | "saml"
    issuer: string
    domain: string
    domainVerified: boolean
  } | null
}
