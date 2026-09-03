import { stripeClient } from "@better-auth/stripe/client"
import { createAuthClient } from "better-auth/client"
import {
  emailOTPClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  organizationClient,
} from "better-auth/client/plugins"

import { ac, admin, member, owner } from "@workspace/shared/auth/roles"
import { env } from "@/lib/env"

export const authClient = createAuthClient({
  baseURL: env.API_URL,
  plugins: [
    emailOTPClient(),
    lastLoginMethodClient(),
    organizationClient({
      ac,
      roles: {
        owner,
        admin,
        member,
      },
    }),
    stripeClient(),
    inferAdditionalFields({
      user: {
        timezone: {
          type: "string",
          required: true,
          input: true,
        },
      },
    }),
  ],
})

export const {
  accountInfo,
  changeEmail,
  changePassword,
  clearLastUsedLoginMethod,
  deleteUser,
  emailOtp,
  getAccessToken,
  getLastUsedLoginMethod,
  getSession,
  isLastUsedLoginMethod,
  linkSocial,
  listAccounts,
  listSessions,
  organization,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  revokeOtherSessions,
  revokeSession,
  revokeSessions,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  unlinkAccount,
  updateSession,
  updateUser,
  verifyEmail,
} = authClient
