import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import { knowledgeDocumentsTable } from "@workspace/db/schema/knowledge-documents"
import {
  createKnowledgeTextRequestSchema,
  indexKnowledgeDocumentRequestSchema,
  knowledgeDocumentIdParamsSchema,
} from "@workspace/shared/api/knowledge-documents/schemas"
import type {
  DeleteKnowledgeDocumentResponse,
  KnowledgeDocumentListResponse,
  KnowledgeDocumentResponse,
  KnowledgeDocumentSourceResponse,
} from "@workspace/shared/api/knowledge-documents/types"
import type {
  DeleteKnowledgeDocumentPayload,
  IndexKnowledgeDocumentPayload,
} from "@workspace/shared/jobs/knowledge-documents/types"
import {
  knowledgeFileExtension,
  MAX_KNOWLEDGE_FILE_BYTES,
} from "@workspace/shared/knowledge/constants"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import { requireAuthToken } from "@/lib/auth/token"
import { t } from "@/lib/i18n"
import { knowledgeDocumentsQueue } from "@/lib/queues"
import {
  deletePrivateObject,
  getPrivateObject,
  privateS3Configured,
  putPrivateObject,
} from "@/lib/s3"
import { validationMessage } from "@/lib/validator"

const PLAIN_TEXT_EXTENSIONS = new Set(["txt", "md"])

export const knowledgeDocumentRoutes = new Hono()

function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop()?.trim() || "document"
  return base.replace(/[^\w.\- ()]/g, "_").slice(0, 200)
}

function documentResponse(document: {
  id: string
  name: string
  source: string
  status: string
  error: string | null
  fileName: string | null
  byteSize: number
  createdAt: Date
  updatedAt: Date
}): KnowledgeDocumentResponse {
  return {
    id: document.id,
    name: document.name,
    source: document.source as KnowledgeDocumentResponse["source"],
    status: document.status as KnowledgeDocumentResponse["status"],
    error: document.error,
    fileName: document.fileName,
    byteSize: document.byteSize,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  }
}

function attachmentName(name: string) {
  const safe = safeFileName(name).replaceAll('"', "")
  return `attachment; filename="${safe}"`
}

knowledgeDocumentRoutes.get("/", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const locale = c.get("locale")

  try {
    const documents = await db.query.knowledgeDocumentsTable.findMany({
      where: { organizationId },
      columns: {
        s3Key: false,
        contentType: false,
        extractedMarkdown: false,
      },
      orderBy: { createdAt: "desc" },
    })

    return c.json(
      documents.map(documentResponse) satisfies KnowledgeDocumentListResponse
    )
  } catch {
    return c.json({ error: t(locale, "knowledge_documents.list_failed") }, 500)
  }
})

knowledgeDocumentRoutes.post(
  "/",
  requireOrganization,
  requirePermission({ knowledgeBase: ["create"] }),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const contentType = c.req.header("content-type") ?? ""

    try {
      if (contentType.includes("application/json")) {
        const parsed = createKnowledgeTextRequestSchema.safeParse(
          await c.req.json()
        )
        if (!parsed.success) {
          return c.json({ error: validationMessage(parsed.error, locale) }, 400)
        }

        const id = crypto.randomUUID()
        const [document] = await db
          .insert(knowledgeDocumentsTable)
          .values({
            id,
            organizationId,
            name: parsed.data.name,
            source: "text",
            status: "pending",
            byteSize: Buffer.byteLength(parsed.data.text),
            extractedMarkdown: parsed.data.text,
          })
          .returning()

        await knowledgeDocumentsQueue.add("index-document", {
          documentId: id,
        } satisfies IndexKnowledgeDocumentPayload)

        return c.json(documentResponse(document), 201)
      }

      if (!privateS3Configured()) {
        return c.json(
          { error: t(locale, "knowledge_documents.storage_not_configured") },
          503
        )
      }

      const body = await c.req.parseBody()
      const name = typeof body.name === "string" ? body.name.trim() : ""
      const file = body.file

      if (!name || name.length > 255) {
        return c.json(
          { error: t(locale, "knowledge_documents.name_invalid") },
          400
        )
      }

      if (!(file instanceof File)) {
        return c.json(
          { error: t(locale, "knowledge_documents.file_required") },
          400
        )
      }

      const extension = knowledgeFileExtension(file.name)
      if (!extension) {
        return c.json(
          { error: t(locale, "knowledge_documents.file_type_invalid") },
          400
        )
      }

      if (file.size > MAX_KNOWLEDGE_FILE_BYTES) {
        return c.json(
          { error: t(locale, "knowledge_documents.file_too_large") },
          400
        )
      }

      const id = crypto.randomUUID()
      const fileName = safeFileName(file.name)
      const s3Key = `knowledge/${organizationId}/${id}/${fileName}`
      const bytes = new Uint8Array(await file.arrayBuffer())
      let extractedMarkdown: string | undefined

      if (PLAIN_TEXT_EXTENSIONS.has(extension)) {
        extractedMarkdown = new TextDecoder().decode(bytes)
      }

      await putPrivateObject(
        s3Key,
        bytes,
        file.type || "application/octet-stream"
      )

      const [document] = await db
        .insert(knowledgeDocumentsTable)
        .values({
          id,
          organizationId,
          name,
          source: "file",
          status: "pending",
          s3Key,
          fileName,
          contentType: file.type || "application/octet-stream",
          byteSize: file.size,
          extractedMarkdown,
        })
        .returning()

      await knowledgeDocumentsQueue.add("index-document", {
        documentId: id,
      } satisfies IndexKnowledgeDocumentPayload)

      return c.json(documentResponse(document), 201)
    } catch {
      return c.json(
        { error: t(locale, "knowledge_documents.create_failed") },
        500
      )
    }
  }
)

knowledgeDocumentRoutes.get("/:id/download", requireOrganization, async (c) => {
  const locale = c.get("locale")
  const organizationId = c.get("organizationId")
  const parsed = knowledgeDocumentIdParamsSchema.safeParse({
    id: c.req.param("id"),
  })
  if (!parsed.success) {
    return c.json({ error: validationMessage(parsed.error, locale) }, 400)
  }

  try {
    const document = await db.query.knowledgeDocumentsTable.findFirst({
      where: { id: parsed.data.id, organizationId },
    })

    if (!document) {
      return c.json({ error: t(locale, "knowledge_documents.not_found") }, 404)
    }

    if (document.source === "text") {
      return c.body(document.extractedMarkdown ?? "", 200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": attachmentName(`${document.name}.txt`),
      })
    }

    if (!document.s3Key || !privateS3Configured()) {
      return c.json(
        { error: t(locale, "knowledge_documents.storage_not_configured") },
        503
      )
    }

    const object = await getPrivateObject(document.s3Key)
    const bytes = await object.Body?.transformToByteArray()
    if (!bytes) {
      return c.json(
        { error: t(locale, "knowledge_documents.download_failed") },
        500
      )
    }

    return c.body(Buffer.from(bytes), 200, {
      "Content-Type": document.contentType ?? "application/octet-stream",
      "Content-Disposition": attachmentName(document.fileName ?? document.name),
    })
  } catch {
    return c.json(
      { error: t(locale, "knowledge_documents.download_failed") },
      500
    )
  }
})

knowledgeDocumentRoutes.delete(
  "/:id",
  requireOrganization,
  requirePermission({ knowledgeBase: ["delete"] }),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const parsed = knowledgeDocumentIdParamsSchema.safeParse({
      id: c.req.param("id"),
    })
    if (!parsed.success) {
      return c.json({ error: validationMessage(parsed.error, locale) }, 400)
    }

    try {
      const document = await db.query.knowledgeDocumentsTable.findFirst({
        where: { id: parsed.data.id, organizationId },
      })

      if (!document) {
        return c.json(
          { error: t(locale, "knowledge_documents.not_found") },
          404
        )
      }

      if (document.s3Key && privateS3Configured()) {
        await deletePrivateObject(document.s3Key)
      }

      await db
        .delete(knowledgeDocumentsTable)
        .where(
          and(
            eq(knowledgeDocumentsTable.id, document.id),
            eq(knowledgeDocumentsTable.organizationId, organizationId)
          )
        )

      await knowledgeDocumentsQueue.add("delete-document", {
        documentId: document.id,
        organizationId,
      } satisfies DeleteKnowledgeDocumentPayload)

      return c.json({
        id: document.id,
      } satisfies DeleteKnowledgeDocumentResponse)
    } catch {
      return c.json(
        { error: t(locale, "knowledge_documents.delete_failed") },
        500
      )
    }
  }
)

knowledgeDocumentRoutes.get("/:id/source", requireAuthToken, async (c) => {
  const locale = c.get("locale")
  const parsed = knowledgeDocumentIdParamsSchema.safeParse({
    id: c.req.param("id"),
  })
  if (!parsed.success) {
    return c.json({ error: validationMessage(parsed.error, locale) }, 400)
  }

  try {
    const document = await db.query.knowledgeDocumentsTable.findFirst({
      where: { id: parsed.data.id },
    })

    if (!document) {
      return c.json({ error: t(locale, "knowledge_documents.not_found") }, 404)
    }

    if (document.source === "text") {
      return c.json({
        id: document.id,
        organizationId: document.organizationId,
        name: document.name,
        source: "text",
        fileName: null,
        contentType: "text/plain",
        text: document.extractedMarkdown,
        fileBase64: null,
      } satisfies KnowledgeDocumentSourceResponse)
    }

    if (!document.s3Key || !privateS3Configured()) {
      return c.json(
        { error: t(locale, "knowledge_documents.storage_not_configured") },
        503
      )
    }

    const object = await getPrivateObject(document.s3Key)
    const bytes = await object.Body?.transformToByteArray()
    if (!bytes) {
      return c.json(
        { error: t(locale, "knowledge_documents.download_failed") },
        500
      )
    }

    return c.json({
      id: document.id,
      organizationId: document.organizationId,
      name: document.name,
      source: "file",
      fileName: document.fileName,
      contentType: document.contentType,
      text: null,
      fileBase64: Buffer.from(bytes).toString("base64"),
    } satisfies KnowledgeDocumentSourceResponse)
  } catch {
    return c.json(
      { error: t(locale, "knowledge_documents.download_failed") },
      500
    )
  }
})

knowledgeDocumentRoutes.patch("/:id/index", requireAuthToken, async (c) => {
  const locale = c.get("locale")
  const parsedId = knowledgeDocumentIdParamsSchema.safeParse({
    id: c.req.param("id"),
  })
  if (!parsedId.success) {
    return c.json({ error: validationMessage(parsedId.error, locale) }, 400)
  }

  const parsed = indexKnowledgeDocumentRequestSchema.safeParse(
    await c.req.json()
  )
  if (!parsed.success) {
    return c.json({ error: validationMessage(parsed.error, locale) }, 400)
  }

  try {
    const [document] = await db
      .update(knowledgeDocumentsTable)
      .set({
        status: parsed.data.status,
        error: parsed.data.error ?? null,
        ...(parsed.data.extractedMarkdown !== undefined
          ? { extractedMarkdown: parsed.data.extractedMarkdown }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeDocumentsTable.id, parsedId.data.id))
      .returning({ id: knowledgeDocumentsTable.id })

    if (!document) {
      return c.json({ error: t(locale, "knowledge_documents.not_found") }, 404)
    }

    return c.json({ id: document.id })
  } catch {
    return c.json(
      { error: t(locale, "knowledge_documents.update_failed") },
      500
    )
  }
})
