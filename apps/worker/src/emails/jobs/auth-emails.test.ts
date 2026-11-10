import { describe, expect, it, vi } from "vitest"

import { lastMail, transport } from "@workspace/email/tests/mocks/transport"
import { sendOrganizationInvitation } from "./send-organization-invitation"
import { sendResetPassword } from "./send-reset-password"
import { sendVerificationOtp } from "./send-verification-otp"

vi.mock(
  "@workspace/email/transport",
  () => import("@workspace/email/tests/mocks/transport")
)

describe("auth emails", () => {
  describe("sendVerificationOtp", () => {
    it.each([
      ["en", "Verify your email"],
      ["es", "Verifica tu correo electrónico"],
    ])("sends the OTP code (%s)", async (locale, subject) => {
      await sendVerificationOtp({
        to: "ada@example.com",
        otp: "482913",
        locale,
      })

      expect(transport.sendMail).toHaveBeenCalledTimes(1)
      expect(lastMail()).toMatchObject({
        from: "noreply@example.com",
        to: "ada@example.com",
        subject,
      })
      expect(lastMail().html).toContain("482913")
      expect(lastMail().text).toContain("482913")
    })
  })

  describe("sendResetPassword", () => {
    it.each([
      ["en", "Reset Password"],
      ["es", "Restablecer contraseña"],
    ])("sends the reset link (%s)", async (locale, subject) => {
      const url = "https://app.example.com/set-new-password?token=abc123"

      await sendResetPassword({
        to: "ada@example.com",
        name: "Ada",
        url,
        locale,
      })

      expect(lastMail()).toMatchObject({ to: "ada@example.com", subject })
      expect(lastMail().html).toContain(
        "https://app.example.com/set-new-password?token=abc123"
      )
    })
  })

  describe("sendOrganizationInvitation", () => {
    it.each([
      ["en", "Accept invitation to join Acme"],
      ["es", "Acepta la invitación para unirte a Acme"],
    ])("sends the invitation link (%s)", async (locale, subject) => {
      const url = "https://app.example.com/join-organization?invitationId=inv_1"

      await sendOrganizationInvitation({
        to: "bob@example.com",
        url,
        organizationName: "Acme",
        locale,
      })

      expect(lastMail()).toMatchObject({ to: "bob@example.com", subject })
      expect(lastMail().html).toContain(url)
      expect(lastMail().html).toContain("Acme")
    })
  })

  it("propagates SMTP failures so the job is retried", async () => {
    transport.sendMail.mockRejectedValueOnce(new Error("SMTP down"))

    await expect(
      sendVerificationOtp({ to: "ada@example.com", otp: "1", locale: "en" })
    ).rejects.toThrow("SMTP down")
  })
})
