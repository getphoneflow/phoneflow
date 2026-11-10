import { eq } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { db } from "@workspace/db/client"
import { organizationRole } from "@workspace/db/schema/auth"
import { auth } from "@/lib/auth/config"
import { emailsQueue } from "@/lib/queues"
import { stripe } from "@/lib/stripe"
import { createApi } from "@/tests/api"
import {
  authTest,
  createOrganization,
  createUser,
} from "@/tests/factories/auth"

const api = createApi()

const password = "correct-horse-battery-staple"
function email() {
  return `user-${crypto.randomUUID()}@example.com`
}

describe("authentication", () => {
  it("emails a verification code on sign-up and blocks sign-in until verified", async () => {
    const address = email()

    await auth.api.signUpEmail({
      body: {
        email: address,
        password,
        name: "Ada",
        timezone: "Europe/Madrid",
      },
    })

    const otp = (await authTest()).getOTP?.(address) as string
    expect(otp).toMatch(/^\d{6}$/)
    expect(emailsQueue.add).toHaveBeenCalledWith("send-verification-otp", {
      to: address,
      otp,
      locale: "en",
    })

    // Signing in unverified fails and (sendOnSignIn) emails a fresh code
    await expect(
      auth.api.signInEmail({ body: { email: address, password } })
    ).rejects.toThrow()
    const latestOtp = (await authTest()).getOTP?.(address) as string

    const wrongOtp = latestOtp === "000000" ? "111111" : "000000"
    await expect(
      auth.api.verifyEmailOTP({ body: { email: address, otp: wrongOtp } })
    ).rejects.toThrow()

    await auth.api.verifyEmailOTP({ body: { email: address, otp: latestOtp } })
    const session = await auth.api.signInEmail({
      body: { email: address, password },
    })
    expect(session.user.email).toBe(address)
  })

  it("sends the code in the language of the request", async () => {
    const address = email()
    await auth.api.signUpEmail({
      body: { email: address, password, name: "Ada", timezone: "UTC" },
    })
    vi.mocked(emailsQueue.add).mockClear()

    const res = await api.post("/api/auth/email-otp/send-verification-otp", {
      headers: { "Accept-Language": "es" },
      body: { email: address, type: "email-verification" },
    })

    expect(res.status).toBe(200)
    expect(emailsQueue.add).toHaveBeenCalledWith(
      "send-verification-otp",
      expect.objectContaining({ to: address, locale: "es" })
    )
  })

  it("stores the user's timezone", async () => {
    const address = email()
    await auth.api.signUpEmail({
      body: { email: address, password, name: "Ada", timezone: "Asia/Tokyo" },
    })
    const user = await db.query.user.findFirst({ where: { email: address } })
    expect(user?.timezone).toBe("Asia/Tokyo")
  })

  it("requires a captcha for sign-up over HTTP", async () => {
    const res = await api.post("/api/auth/sign-up/email", {
      body: { email: email(), password, name: "Bot", timezone: "UTC" },
    })
    expect(res.status).toBe(400)
    expect(emailsQueue.add).not.toHaveBeenCalled()
  })

  it("queues a password reset email with a reset link", async () => {
    const address = email()
    await auth.api.signUpEmail({
      body: { email: address, password, name: "Ada", timezone: "UTC" },
    })

    await auth.api.requestPasswordReset({
      body: {
        email: address,
        redirectTo: "https://app.example.com/set-new-password",
      },
    })

    expect(emailsQueue.add).toHaveBeenCalledWith("send-reset-password", {
      to: address,
      name: "Ada",
      url: expect.stringContaining("/reset-password/"),
      locale: "en",
    })
  })
})

describe("organizations", () => {
  it("bootstraps a new organization with a Stripe customer, roles and its creator as owner", async () => {
    const user = await createUser()
    vi.mocked(stripe.customers.create).mockResolvedValueOnce({
      id: "cus_new_org",
    } as never)

    const org = await auth.api.createOrganization({
      headers: user.headers,
      body: { name: "Acme", slug: `acme-${crypto.randomUUID()}` },
    })

    expect(org?.id).toEqual(expect.any(String))
    const id = org?.id as string

    const stored = await db.query.organization.findFirst({ where: { id } })
    expect(stored?.stripeCustomerId).toBe("cus_new_org")
    expect(stripe.customers.create).toHaveBeenCalledWith({
      name: "Acme",
      email: user.email,
    })

    const roles = await db
      .select()
      .from(organizationRole)
      .where(eq(organizationRole.organizationId, id))
    expect(roles.map((r) => r.role).sort()).toEqual(["admin", "member"])

    const members = await db.query.member.findMany({
      where: { organizationId: id },
    })
    expect(members).toEqual([
      expect.objectContaining({ userId: user.id, role: "owner" }),
    ])
  })

  it("lets admins invite members and emails them a join link", async () => {
    const org = await createOrganization()
    const admin = await org.as("admin")
    const invitee = email()

    const invitation = await auth.api.createInvitation({
      headers: admin.headers,
      body: { email: invitee, role: "member", organizationId: org.id },
    })

    expect(emailsQueue.add).toHaveBeenCalledWith(
      "send-organization-invitation",
      {
        to: invitee,
        organizationName: org.name,
        url: `https://app.example.com/join-organization?invitationId=${invitation.id}&email=${encodeURIComponent(invitee)}`,
        locale: "en",
      }
    )
  })

  it("does not let members invite people", async () => {
    const org = await createOrganization()
    const member = await org.as("member")

    await expect(
      auth.api.createInvitation({
        headers: member.headers,
        body: { email: email(), role: "member", organizationId: org.id },
      })
    ).rejects.toThrow()
    expect(emailsQueue.add).not.toHaveBeenCalled()
  })

  it("does not let admins promote anyone to owner", async () => {
    const org = await createOrganization()
    const admin = await org.as("admin")
    const member = await org.as("member")
    const membership = await db.query.member.findFirst({
      where: { organizationId: org.id, userId: member.id },
    })

    await expect(
      auth.api.updateMemberRole({
        headers: admin.headers,
        body: {
          memberId: membership?.id as string,
          role: "owner",
          organizationId: org.id,
        },
      })
    ).rejects.toThrow()
  })
})
