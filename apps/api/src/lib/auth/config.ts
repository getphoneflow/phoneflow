import { i18n, locales } from "@better-auth/i18n"
import { sso } from "@better-auth/sso"
import { stripe } from "@better-auth/stripe"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import {
  captcha,
  emailOTP,
  lastLoginMethod,
  organization,
  testUtils,
  twoFactor,
} from "better-auth/plugins"

import { db } from "@workspace/db/client"
import * as schema from "@workspace/db/schema/auth"
import { ac, owner } from "@workspace/shared/auth/roles"
import type {
  SendOrganizationInvitationPayload,
  SendResetPasswordPayload,
  SendVerificationOtpPayload,
} from "@workspace/shared/jobs/emails/types"
import { seedOrganizationRoles } from "@/lib/auth/organization-roles"
import { trustedOrigins } from "@/lib/auth/sso"
import { handleStripeEvent } from "@/lib/credits"
import { env } from "@/lib/env"
import { resolveLocale } from "@/lib/i18n"
import { emailsQueue } from "@/lib/queues"
import { stripe as stripeClient } from "@/lib/stripe"

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
        defaultValue: "America/New_York",
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
    async sendResetPassword(data, request) {
      await emailsQueue.add("send-reset-password", {
        to: data.user.email,
        name: data.user.name,
        url: data.url,
        locale: resolveLocale(request?.headers.get("Accept-Language")),
      } satisfies SendResetPasswordPayload)
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
    i18n({
      translations: {
        en: locales.en,
        es: locales.es,
      },
      detection: ["header"],
      defaultLocale: "en",
    }),
    twoFactor({
      issuer: "Phoneflow",
    }),
    emailOTP({
      overrideDefaultEmailVerification: true,
      rateLimit: {
        window: 300,
        max: 3,
      },
      async sendVerificationOTP({ email, otp, type }, ctx) {
        if (type === "email-verification") {
          await emailsQueue.add("send-verification-otp", {
            to: email,
            otp,
            locale: resolveLocale(ctx?.request?.headers.get("Accept-Language")),
          } satisfies SendVerificationOtpPayload)
        }
      },
    }),
    lastLoginMethod({
      storeInDatabase: true,
    }),
    organization({
      ac,
      creatorRole: "owner",
      roles: {
        owner,
      },
      schema: {
        organizationRole: {
          additionalFields: {
            displayName: {
              type: "string",
              required: true,
            },
          },
        },
      },
      dynamicAccessControl: {
        enabled: true,
      },
      async sendInvitationEmail(data, request) {
        const inviteLink = `${env.FRONTEND_URL}/join-organization?invitationId=${data.id}&email=${encodeURIComponent(data.email)}`

        await emailsQueue.add("send-organization-invitation", {
          to: data.email,
          url: inviteLink,
          organizationName: data.organization.name,
          locale: resolveLocale(request?.headers.get("Accept-Language")),
        } satisfies SendOrganizationInvitationPayload)
      },
      organizationHooks: {
        async beforeCreateOrganization({ organization: org, user }) {
          if (!env.IS_CLOUD) {
            return
          }

          const stripeCustomer = await stripeClient.customers.create({
            name: org.name,
            email: user.email,
          })

          return {
            data: {
              stripeCustomerId: stripeCustomer.id,
            },
          }
        },
        async afterCreateOrganization({ organization: org }) {
          await seedOrganizationRoles(org.id)
        },
      },
    }),
    ...(env.IS_CLOUD
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: env.TURNSTILE_SECRET_KEY,
          }),
          stripe({
            stripeClient,
            stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
            organization: {
              enabled: true,
            },
            onEvent: handleStripeEvent,
          }),
        ]
      : []),
    ...(env.NODE_ENV === "test" ? [testUtils({ captureOTP: true })] : []),
    sso({
      domainVerification: {
        enabled: true,
        tokenPrefix: "phoneflow",
      },
      organizationProvisioning: {
        disabled: false,
        defaultRole: "member",
      },
      saml: {
        requireTimestamps: true,
        idpInitiatedCallbackUrl: env.FRONTEND_URL,
        algorithms: {
          onDeprecated: "reject",
        },
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
  trustedOrigins,
  secret: env.BETTER_AUTH_SECRET,
})
