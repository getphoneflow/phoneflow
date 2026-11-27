import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import {
  callExtractionAgentsTable,
  callExtractionsTable,
} from "@workspace/db/schema/call-extractions"
import {
  callExtractionIdParamsSchema,
  callExtractionRequestSchema,
} from "@workspace/shared/api/call-extractions/schemas"
import type {
  CallExtractionListResponse,
  CallExtractionResponse,
  DeleteCallExtractionResponse,
} from "@workspace/shared/api/call-extractions/types"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import { t } from "@/lib/i18n"
import { logger } from "@/lib/logger"
import { validator } from "@/lib/validator"

export const callExtractionRoutes = new Hono()

callExtractionRoutes.get("/", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const locale = c.get("locale")

  try {
    const extractions = await db.query.callExtractionsTable.findMany({
      where: { organizationId },
      columns: {
        id: true,
        name: true,
        description: true,
        model: true,
        schema: true,
        createdAt: true,
        updatedAt: true,
      },
      with: { agents: { columns: { agentId: true } } },
      orderBy: { createdAt: "desc" },
    })

    return c.json(extractions satisfies CallExtractionListResponse)
  } catch (error) {
    logger.error({ err: error }, "Failed to load call extractions")
    return c.json({ error: t(locale, "call_extractions.list_failed") }, 500)
  }
})

callExtractionRoutes.post(
  "/",
  requireOrganization,
  requirePermission({ callExtraction: ["create"] }),
  validator("json", callExtractionRequestSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const payload = c.req.valid("json")

    try {
      const created = await db.transaction(async (tx) => {
        const [extraction] = await tx
          .insert(callExtractionsTable)
          .values({
            id: crypto.randomUUID(),
            organizationId,
            name: payload.name,
            description: payload.description,
            model: payload.model,
            schema: payload.schema,
          })
          .returning({
            id: callExtractionsTable.id,
            name: callExtractionsTable.name,
            description: callExtractionsTable.description,
            model: callExtractionsTable.model,
            schema: callExtractionsTable.schema,
            createdAt: callExtractionsTable.createdAt,
            updatedAt: callExtractionsTable.updatedAt,
          })

        if (!extraction) return null

        if (payload.agentIds.length > 0) {
          await tx.insert(callExtractionAgentsTable).values(
            payload.agentIds.map((agentId) => ({
              callExtractionId: extraction.id,
              agentId,
            }))
          )
        }

        return extraction
      })

      if (!created) {
        return c.json(
          { error: t(locale, "call_extractions.create_failed") },
          500
        )
      }

      return c.json(created satisfies CallExtractionResponse, 201)
    } catch (error) {
      logger.error({ err: error }, "Failed to create call extraction")
      return c.json({ error: t(locale, "call_extractions.create_failed") }, 500)
    }
  }
)

callExtractionRoutes.patch(
  "/:id",
  requireOrganization,
  requirePermission({ callExtraction: ["update"] }),
  validator("param", callExtractionIdParamsSchema),
  validator("json", callExtractionRequestSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const { id } = c.req.valid("param")
    const payload = c.req.valid("json")

    try {
      const updated = await db.transaction(async (tx) => {
        const [extraction] = await tx
          .update(callExtractionsTable)
          .set({
            name: payload.name,
            description: payload.description,
            model: payload.model,
            schema: payload.schema,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(callExtractionsTable.id, id),
              eq(callExtractionsTable.organizationId, organizationId)
            )
          )
          .returning({
            id: callExtractionsTable.id,
            name: callExtractionsTable.name,
            description: callExtractionsTable.description,
            model: callExtractionsTable.model,
            schema: callExtractionsTable.schema,
            createdAt: callExtractionsTable.createdAt,
            updatedAt: callExtractionsTable.updatedAt,
          })

        if (!extraction) return null

        await tx
          .delete(callExtractionAgentsTable)
          .where(eq(callExtractionAgentsTable.callExtractionId, extraction.id))

        if (payload.agentIds.length > 0) {
          await tx.insert(callExtractionAgentsTable).values(
            payload.agentIds.map((agentId) => ({
              callExtractionId: extraction.id,
              agentId,
            }))
          )
        }

        return extraction
      })

      if (!updated) {
        return c.json({ error: t(locale, "call_extractions.not_found") }, 404)
      }

      return c.json(updated satisfies CallExtractionResponse)
    } catch (error) {
      logger.error({ err: error }, "Failed to update call extraction")
      return c.json({ error: t(locale, "call_extractions.update_failed") }, 500)
    }
  }
)

callExtractionRoutes.delete(
  "/:id",
  requireOrganization,
  requirePermission({ callExtraction: ["delete"] }),
  validator("param", callExtractionIdParamsSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const { id } = c.req.valid("param")

    try {
      const [extraction] = await db
        .delete(callExtractionsTable)
        .where(
          and(
            eq(callExtractionsTable.id, id),
            eq(callExtractionsTable.organizationId, organizationId)
          )
        )
        .returning({ id: callExtractionsTable.id })

      if (!extraction) {
        return c.json({ error: t(locale, "call_extractions.not_found") }, 404)
      }

      return c.json({
        id: extraction.id,
      } satisfies DeleteCallExtractionResponse)
    } catch (error) {
      logger.error({ err: error }, "Failed to delete call extraction")
      return c.json({ error: t(locale, "call_extractions.delete_failed") }, 500)
    }
  }
)
