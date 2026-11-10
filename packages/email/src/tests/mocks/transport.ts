import { vi } from "vitest"

type SentMail = {
  from: string
  to: string
  subject: string
  html: string
  text: string
  attachments?: { filename: string; content: string; contentType: string }[]
}

export const transport = {
  sendMail: vi.fn(async (_mail: SentMail) => ({})),
}

export function lastMail(): SentMail {
  const call = transport.sendMail.mock.lastCall
  if (!call) throw new Error("No email was sent")
  return call[0]
}
