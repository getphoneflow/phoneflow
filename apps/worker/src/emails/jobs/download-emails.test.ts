import { describe, expect, it, vi } from "vitest"

import { lastMail, transport } from "@workspace/email/tests/mocks/transport"
import { api } from "@/lib/api"
import { sendDownloadCalls } from "./send-download-calls"
import { sendDownloadContacts } from "./send-download-contacts"

vi.mock(
  "@workspace/email/transport",
  () => import("@workspace/email/tests/mocks/transport")
)
vi.mock("@/lib/api", () => import("@/tests/mocks/api"))

function payload(locale: string) {
  return {
    to: "owner@example.com",
    organizationId: "org_1",
    organizationName: "Acme",
    locale,
  }
}

describe("download emails", () => {
  describe("sendDownloadCalls", () => {
    it.each([
      ["en", "Download calls from Acme"],
      ["es", "Descarga de llamadas de Acme"],
    ])(
      "emails the organization's calls as JSON (%s)",
      async (locale, subject) => {
        const calls = [{ id: "call_1", status: "completed" }]
        vi.mocked(api.get).mockResolvedValueOnce(calls)

        await sendDownloadCalls(payload(locale))

        expect(api.get).toHaveBeenCalledWith("/calls/export/org_1")
        expect(lastMail()).toMatchObject({ to: "owner@example.com", subject })
        expect(lastMail().attachments).toEqual([
          {
            filename: "calls.json",
            content: JSON.stringify(calls, null, 2),
            contentType: "application/json",
          },
        ])
      }
    )

    it("does not send an email when the export fails", async () => {
      vi.mocked(api.get).mockRejectedValueOnce(
        new Error("Failed to export calls")
      )

      await expect(sendDownloadCalls(payload("en"))).rejects.toThrow(
        "Failed to export calls"
      )
      expect(transport.sendMail).not.toHaveBeenCalled()
    })
  })

  describe("sendDownloadContacts", () => {
    it.each([
      ["en", "Download contacts from Acme"],
      ["es", "Descarga de contactos de Acme"],
    ])(
      "emails the organization's contacts as JSON (%s)",
      async (locale, subject) => {
        const contacts = [{ id: "contact_1", phoneNumber: "+15550001111" }]
        vi.mocked(api.get).mockResolvedValueOnce(contacts)

        await sendDownloadContacts(payload(locale))

        expect(api.get).toHaveBeenCalledWith("/contacts/export/org_1")
        expect(lastMail()).toMatchObject({ to: "owner@example.com", subject })
        expect(lastMail().attachments?.[0]).toMatchObject({
          filename: "contacts.json",
          content: JSON.stringify(contacts, null, 2),
        })
      }
    )
  })
})
