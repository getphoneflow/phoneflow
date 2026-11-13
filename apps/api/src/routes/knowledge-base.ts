import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import { knowledgeBaseDocumentsTable } from "@workspace/db/schema/knowledge-base"
import {
  indexKnowledgeBaseDocumentRequestSchema,
  knowledgeBaseDocumentIdParamsSchema,
} from "@workspace/shared/api/knowledge-base/schemas"
import type {
  DeleteKnowledgeBaseDocumentResponse,
  KnowledgeBaseDocumentFileResponse,
  KnowledgeBaseDocumentListResponse,
  KnowledgeBaseDocumentResponse,
} from "@workspace/shared/api/knowledge-base/types"
import type {
  DeleteKnowledgeBaseDocumentPayload,
  IndexKnowledgeBaseDocumentPayload,
} from "@workspace/shared/jobs/knowledge-base/types"
import {
  knowledgeBaseDocumentExtension,
  MAX_KNOWLEDGE_BASE_DOCUMENT_BYTES,
} from "@workspace/shared/knowledge/constants"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import { requireAuthToken } from "@/lib/auth/token"
import { t } from "@/lib/i18n"
import { knowledgeBaseQueue } from "@/lib/queues"
import {
  deletePrivateObject,
  getPrivateObject,
  privateS3Configured,
  putPrivateObject,
} from "@/lib/s3"
import { validator } from "@/lib/validator"

export const knowledgeBaseRoutes = new Hono()

function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop()?.trim() || "document"
  return base.replace(/[^\w.\- ()]/g, "_").slice(0, 200)
}

function attachmentName(name: string) {
  const safe = safeFileName(name).replaceAll('"', "")
  return `attachment; filename="${safe}"`
}

knowledgeBaseRoutes.get("/", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const locale = c.get("locale")

  try {
    const documents = await db.query.knowledgeBaseDocumentsTable.findMany({
      where: { organizationId },
      columns: {
        id: true,
        name: true,
        status: true,
        byteSize: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return c.json(documents satisfies KnowledgeBaseDocumentListResponse)
  } catch {
    return c.json({ error: t(locale, "knowledge_base.list_failed") }, 500)
  }
})

knowledgeBaseRoutes.post(
  "/",
  requireOrganization,
  requirePermission({ knowledgeBase: ["create"] }),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")

    try {
      if (!privateS3Configured()) {
        return c.json(
          { error: t(locale, "knowledge_base.storage_not_configured") },
          503
        )
      }

      const body = await c.req.parseBody()
      const file = body.file
      if (!(file instanceof File)) {
        return c.json({ error: t(locale, "knowledge_base.file_required") }, 400)
      }

      const name = file.name.trim().slice(0, 255)
      if (!name) {
        return c.json({ error: t(locale, "knowledge_base.name_invalid") }, 400)
      }

      const extension = knowledgeBaseDocumentExtension(file.name)
      if (!extension) {
        return c.json(
          { error: t(locale, "knowledge_base.file_type_invalid") },
          400
        )
      }

      if (file.size > MAX_KNOWLEDGE_BASE_DOCUMENT_BYTES) {
        return c.json(
          { error: t(locale, "knowledge_base.file_too_large") },
          400
        )
      }

      const id = crypto.randomUUID()
      const storageKey = `knowledge-base/${organizationId}/${id}`
      const contentType = file.type || "application/octet-stream"
      await putPrivateObject(
        storageKey,
        new Uint8Array(await file.arrayBuffer()),
        contentType
      )

      const [document] = await db
        .insert(knowledgeBaseDocumentsTable)
        .values({
          id,
          organizationId,
          name,
          status: "processing",
          storageKey,
          contentType,
          byteSize: file.size,
        })
        .returning({
          id: knowledgeBaseDocumentsTable.id,
          name: knowledgeBaseDocumentsTable.name,
          status: knowledgeBaseDocumentsTable.status,
          byteSize: knowledgeBaseDocumentsTable.byteSize,
          createdAt: knowledgeBaseDocumentsTable.createdAt,
          updatedAt: knowledgeBaseDocumentsTable.updatedAt,
        })

      await knowledgeBaseQueue.add("index", {
        documentId: id,
      } satisfies IndexKnowledgeBaseDocumentPayload)

      return c.json(document satisfies KnowledgeBaseDocumentResponse, 201)
    } catch {
      return c.json({ error: t(locale, "knowledge_base.create_failed") }, 500)
    }
  }
)

knowledgeBaseRoutes.get(
  "/:id/download",
  requireOrganization,
  validator("param", knowledgeBaseDocumentIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id } = c.req.valid("param")

    try {
      const document = await db.query.knowledgeBaseDocumentsTable.findFirst({
        where: { id, organizationId },
      })

      if (!document) {
        return c.json({ error: t(locale, "knowledge_base.not_found") }, 404)
      }

      if (!privateS3Configured()) {
        return c.json(
          { error: t(locale, "knowledge_base.storage_not_configured") },
          503
        )
      }

      const object = await getPrivateObject(document.storageKey)
      const bytes = await object.Body?.transformToByteArray()
      if (!bytes) {
        return c.json(
          { error: t(locale, "knowledge_base.download_failed") },
          500
        )
      }

      return c.body(Buffer.from(bytes), 200, {
        "Content-Type": document.contentType,
        "Content-Disposition": attachmentName(document.name),
      })
    } catch {
      return c.json({ error: t(locale, "knowledge_base.download_failed") }, 500)
    }
  }
)

knowledgeBaseRoutes.delete(
  "/:id",
  requireOrganization,
  requirePermission({ knowledgeBase: ["delete"] }),
  validator("param", knowledgeBaseDocumentIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id } = c.req.valid("param")

    try {
      const document = await db.query.knowledgeBaseDocumentsTable.findFirst({
        where: { id, organizationId },
      })

      if (!document) {
        return c.json({ error: t(locale, "knowledge_base.not_found") }, 404)
      }

      if (privateS3Configured()) {
        await deletePrivateObject(document.storageKey)
      }

      await db
        .delete(knowledgeBaseDocumentsTable)
        .where(
          and(
            eq(knowledgeBaseDocumentsTable.id, document.id),
            eq(knowledgeBaseDocumentsTable.organizationId, organizationId)
          )
        )

      await knowledgeBaseQueue.add("delete", {
        documentId: document.id,
        organizationId,
      } satisfies DeleteKnowledgeBaseDocumentPayload)

      return c.json({
        id: document.id,
      } satisfies DeleteKnowledgeBaseDocumentResponse)
    } catch {
      return c.json({ error: t(locale, "knowledge_base.delete_failed") }, 500)
    }
  }
)

knowledgeBaseRoutes.get(
  "/:id/file",
  requireAuthToken,
  validator("param", knowledgeBaseDocumentIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const { id } = c.req.valid("param")

    try {
      const document = await db.query.knowledgeBaseDocumentsTable.findFirst({
        where: { id },
      })

      if (!document) {
        return c.json({ error: t(locale, "knowledge_base.not_found") }, 404)
      }

      if (!privateS3Configured()) {
        return c.json(
          { error: t(locale, "knowledge_base.storage_not_configured") },
          503
        )
      }

      const object = await getPrivateObject(document.storageKey)
      const bytes = await object.Body?.transformToByteArray()
      if (!bytes) {
        return c.json(
          { error: t(locale, "knowledge_base.download_failed") },
          500
        )
      }

      return c.json({
        id: document.id,
        organizationId: document.organizationId,
        name: document.name,
        contentType: document.contentType,
        fileBase64: Buffer.from(bytes).toString("base64"),
      } satisfies KnowledgeBaseDocumentFileResponse)
    } catch {
      return c.json({ error: t(locale, "knowledge_base.download_failed") }, 500)
    }
  }
)

knowledgeBaseRoutes.patch(
  "/:id/index",
  requireAuthToken,
  validator("param", knowledgeBaseDocumentIdParamsSchema),
  validator("json", indexKnowledgeBaseDocumentRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const { id } = c.req.valid("param")
    const { status } = c.req.valid("json")

    try {
      const [document] = await db
        .update(knowledgeBaseDocumentsTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(knowledgeBaseDocumentsTable.id, id))
        .returning({ id: knowledgeBaseDocumentsTable.id })

      if (!document) {
        return c.json({ error: t(locale, "knowledge_base.not_found") }, 404)
      }

      return c.json({ id: document.id })
    } catch {
      return c.json({ error: t(locale, "knowledge_base.update_failed") }, 500)
    }
  }
)
