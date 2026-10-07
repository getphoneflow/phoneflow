import sendEmail from "@workspace/email/send"
import DownloadContactsEmail from "@workspace/email/templates/download-contacts"
import type { ContactDownloadResponse } from "@workspace/shared/api/contacts/types"
import type { SendDownloadContactsPayload } from "@workspace/shared/jobs/emails/types"
import { api } from "@/lib/api"
import { env } from "@/lib/env"

export async function sendDownloadContacts(
  payload: SendDownloadContactsPayload
) {
  const contacts = await api.get<ContactDownloadResponse>(
    `/contacts/export/${payload.organizationId}`
  )

  await sendEmail(
    env.EMAIL_FROM,
    payload.to,
    `Download contacts from ${payload.organizationName}`,
    DownloadContactsEmail(),
    [
      {
        filename: "contacts.json",
        content: JSON.stringify(contacts, null, 2),
        contentType: "application/json",
      },
    ]
  )
}
