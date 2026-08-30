import sendEmail from "@workspace/email/send"
import DownloadCallsEmail from "@workspace/email/templates/download-calls"
import type { CallDownloadResponse } from "@workspace/shared/api/calls/types"
import { api } from "@/lib/api"
import { env } from "@/lib/env"

export type SendDownloadCallsPayload = {
  to: string
  organizationId: string
  organizationName: string
}

export async function sendDownloadCalls(payload: SendDownloadCallsPayload) {
  const calls = await api.get<CallDownloadResponse>(
    `/calls/export/${payload.organizationId}`
  )

  await sendEmail(
    env.EMAIL_FROM,
    payload.to,
    `Download calls from ${payload.organizationName}`,
    DownloadCallsEmail(),
    [
      {
        filename: "calls.json",
        content: JSON.stringify(calls, null, 2),
        contentType: "application/json",
      },
    ]
  )
}
