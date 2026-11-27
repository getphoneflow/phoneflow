import { Hono } from "hono"

import {
  apiKeyIdParamsSchema,
  createApiKeyRequestSchema,
  updateApiKeyRequestSchema,
} from "@workspace/shared/api/api-keys/schemas"
import type {
  ApiKeyListResponse,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
  UpdateApiKeyResponse,
} from "@workspace/shared/api/api-keys/types"
import { auth } from "@/lib/auth/config"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import { requireSession } from "@/lib/auth/session"
import { t } from "@/lib/i18n"
import { logger } from "@/lib/logger"
import { validator } from "@/lib/validator"

export const apiKeyRoutes = new Hono()

apiKeyRoutes.get(
  "/",
  requireOrganization,
  requirePermission({ apiKey: ["read"] }),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")

    try {
      const apiKeys = await auth.api.listApiKeys({
        query: {
          organizationId,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
        headers: c.req.raw.headers,
      })

      return c.json(apiKeys satisfies ApiKeyListResponse)
    } catch (error) {
      logger.error({ err: error }, "Failed to load API keys")
      return c.json({ error: t(locale, "api_keys.list_failed") }, 500)
    }
  }
)

apiKeyRoutes.post(
  "/",
  requireOrganization,
  requirePermission({ apiKey: ["create"] }),
  requireSession,
  validator("json", createApiKeyRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const payload = c.req.valid("json")
    const organizationId = c.get("organizationId")
    const userId = c.get("userId")

    try {
      const apiKey = await auth.api.createApiKey({
        body: {
          name: payload.name,
          organizationId,
          userId,
          expiresIn: payload.expiresIn,
          permissions: payload.permissions,
        },
      })

      return c.json(apiKey satisfies CreateApiKeyResponse, 201)
    } catch (error) {
      logger.error({ err: error }, "Failed to create API key")
      return c.json({ error: t(locale, "api_keys.create_failed") }, 500)
    }
  }
)

apiKeyRoutes.patch(
  "/:id",
  requireOrganization,
  requirePermission({ apiKey: ["update"] }),
  requireSession,
  validator("param", apiKeyIdParamsSchema),
  validator("json", updateApiKeyRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const { id } = c.req.valid("param")
    const payload = c.req.valid("json")
    const userId = c.get("userId")

    try {
      const apiKey = await auth.api.updateApiKey({
        body: {
          keyId: id,
          userId,
          name: payload.name,
          expiresIn: payload.expiresIn,
          permissions: payload.permissions,
        },
      })

      return c.json(apiKey satisfies UpdateApiKeyResponse)
    } catch (error) {
      logger.error({ err: error }, "Failed to update API key")
      return c.json({ error: t(locale, "api_keys.update_failed") }, 500)
    }
  }
)

apiKeyRoutes.delete(
  "/:id",
  requireOrganization,
  requirePermission({ apiKey: ["delete"] }),
  validator("param", apiKeyIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const { id } = c.req.valid("param")

    try {
      const result = await auth.api.deleteApiKey({
        body: { keyId: id },
        headers: c.req.raw.headers,
      })

      return c.json(result satisfies DeleteApiKeyResponse)
    } catch (error) {
      logger.error({ err: error }, "Failed to revoke API key")
      return c.json({ error: t(locale, "api_keys.delete_failed") }, 500)
    }
  }
)
