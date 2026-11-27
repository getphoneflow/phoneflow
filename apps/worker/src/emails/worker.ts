import { createWorker } from "@/lib/workers"
import { sendDownloadCalls } from "./jobs/send-download-calls"
import { sendDownloadContacts } from "./jobs/send-download-contacts"
import { sendOrganizationInvitation } from "./jobs/send-organization-invitation"
import { sendResetPassword } from "./jobs/send-reset-password"
import { sendVerificationOtp } from "./jobs/send-verification-otp"

export const emailsWorker = createWorker("emails", async (job) => {
  switch (job.name) {
    case "send-reset-password":
      return sendResetPassword(job.data)
    case "send-verification-otp":
      return sendVerificationOtp(job.data)
    case "send-organization-invitation":
      return sendOrganizationInvitation(job.data)
    case "send-download-calls":
      return sendDownloadCalls(job.data)
    case "send-download-contacts":
      return sendDownloadContacts(job.data)
    default:
      throw new Error(`Unknown job: ${job.name}`)
  }
})
