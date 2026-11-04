import { z } from "zod"

export const phoneNumberIdParamsSchema = z.object({
  id: z.uuid(),
})

export const createPhoneNumberRequestSchema = z
  .object({
    number: z.e164(),
    sipAddress: z.string().trim().min(1).nullable().optional(),
    sipUsername: z.string().trim().min(1).nullable().optional(),
    sipPassword: z.string().trim().min(1).nullable().optional(),
    agentId: z.uuid().nullable().optional(),
    agentVersionId: z.uuid().nullable().optional(),
  })
  .refine((data) => !data.agentVersionId || data.agentId, {
    message:
      "schemas.phone_numbers.phone_number_request.agent_id.required_with_version",
    path: ["agentId"],
  })
  .refine((data) => !data.sipUsername || !!data.sipPassword, {
    message:
      "schemas.phone_numbers.phone_number_request.sip_password.required_with_username",
    path: ["sipPassword"],
  })

export const updatePhoneNumberRequestSchema = z
  .object({
    number: z.e164().optional(),
    sipAddress: z.string().trim().min(1).nullable().optional(),
    sipUsername: z.string().trim().min(1).nullable().optional(),
    sipPassword: z.string().trim().min(1).nullable().optional(),
    agentId: z.uuid().nullable().optional(),
    agentVersionId: z.uuid().nullable().optional(),
  })
  .refine((data) => !data.agentVersionId || !!data.agentId, {
    message:
      "schemas.phone_numbers.phone_number_request.agent_id.required_with_version",
    path: ["agentId"],
  })
  .refine((data) => !data.sipUsername || !!data.sipPassword, {
    message:
      "schemas.phone_numbers.phone_number_request.sip_password.required_with_username",
    path: ["sipPassword"],
  })
