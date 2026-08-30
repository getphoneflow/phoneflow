import type { Attachment } from "nodemailer/lib/mailer"
import type { ReactNode } from "react"
import { render, toPlainText } from "react-email"

import { transport } from "@workspace/email/transport"

export default async function sendEmail(
  from: string,
  to: string,
  subject: string,
  email: ReactNode,
  attachments?: Attachment[]
) {
  const html = await render(email)
  const text = toPlainText(html)

  const options = {
    from,
    to,
    subject,
    html,
    text,
    attachments,
  }

  await transport.sendMail(options)
}
