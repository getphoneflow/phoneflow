export type SendResetPasswordPayload = {
  to: string
  name: string
  url: string
  locale: string
}

export type SendVerificationOtpPayload = {
  to: string
  otp: string
  locale: string
}

export type SendOrganizationInvitationPayload = {
  to: string
  url: string
  organizationName: string
  locale: string
}

export type SendDownloadCallsPayload = {
  to: string
  organizationId: string
  organizationName: string
  locale: string
}

export type SendDownloadContactsPayload = {
  to: string
  organizationId: string
  organizationName: string
  locale: string
}
