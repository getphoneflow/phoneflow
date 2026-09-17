export type SendResetPasswordPayload = {
  to: string
  name: string
  url: string
}

export type SendVerificationOtpPayload = {
  to: string
  otp: string
}

export type SendOrganizationInvitationPayload = {
  to: string
  url: string
  organizationName: string
}

export type SendDownloadCallsPayload = {
  to: string
  organizationId: string
  organizationName: string
}
