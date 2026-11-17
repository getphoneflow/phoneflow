import { z } from "zod"

import { statement } from "@workspace/shared/auth/api-keys"

const day = 60 * 60 * 24

export const apiKeyExpirationSeconds = {
  30: 30 * day,
  90: 90 * day,
  365: 365 * day,
} as const

const expiresInSchema = z.union([
  z.literal(apiKeyExpirationSeconds[30]),
  z.literal(apiKeyExpirationSeconds[90]),
  z.literal(apiKeyExpirationSeconds[365]),
])

export const apiKeyNameSchema = z
  .string()
  .trim()
  .min(1, "schemas.api_keys.name.required")
  .max(64, "schemas.api_keys.name.max")

export const apiKeyPermissionsSchema = z
  .record(z.string(), z.array(z.string()))
  .superRefine((permissions, ctx) => {
    for (const [resource, actions] of Object.entries(permissions)) {
      const allowed = statement[resource]
      if (!allowed) {
        ctx.addIssue({
          code: "custom",
          message: "schemas.api_keys.permissions.unknown_resource",
          path: [resource],
        })
        continue
      }
      for (const action of actions) {
        if (!allowed.includes(action)) {
          ctx.addIssue({
            code: "custom",
            message: "schemas.api_keys.permissions.unknown_action",
            path: [resource],
          })
        }
      }
    }
  })

export const apiKeyIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const createApiKeyRequestSchema = z.object({
  name: apiKeyNameSchema,
  expiresIn: expiresInSchema.optional(),
  permissions: apiKeyPermissionsSchema,
})

export const updateApiKeyRequestSchema = z.object({
  name: apiKeyNameSchema,
  expiresIn: expiresInSchema.nullable().optional(),
  permissions: apiKeyPermissionsSchema,
})
