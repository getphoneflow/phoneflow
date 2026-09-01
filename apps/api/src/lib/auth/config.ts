import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { emailOTP, lastLoginMethod, organization } from "better-auth/plugins"

import { db } from "@workspace/db/client"
import * as schema from "@workspace/db/schema/auth"
import { ac, admin, member, owner } from "@workspace/shared/auth/roles"
import { env } from "@/lib/env"
import { emailsQueue } from "@/lib/queues"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      timezone: {
        type: "string",
        required: true,
        input: true,
      },
    },
    deleteUser: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword(data) {
      await emailsQueue.add("send-reset-password", {
        to: data.user.email,
        name: data.user.name,
        url: data.url,
      })
    },
  },
  emailVerification: {
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      rateLimit: {
        window: 300,
        max: 3,
      },
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification") {
          await emailsQueue.add("send-verification-otp", {
            to: email,
            otp,
          })
        }
      },
    }),
    lastLoginMethod({
      storeInDatabase: true,
    }),
    organization({
      ac,
      roles: {
        owner,
        admin,
        member,
      },
      async sendInvitationEmail(data) {
        const inviteLink = `${env.FRONTEND_URL}/join-organization?invitationId=${data.id}&email=${encodeURIComponent(data.email)}`

        await emailsQueue.add("send-organization-invitation", {
          to: data.email,
          url: inviteLink,
          organizationName: data.organization.name,
        })
      },
    }),
  ],
  rateLimit: {
    window: 60,
    max: 100,
  },
  telemetry: {
    enabled: false,
  },
  baseURL: env.API_URL,
  trustedOrigins: [env.FRONTEND_URL],
  secret: env.BETTER_AUTH_SECRET,
})
