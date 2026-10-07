import {
  type AnyRelationsFilter,
  count,
  relationsFilterToSQL,
} from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import { contactsTable } from "@workspace/db/schema/contacts"
import { contactListQuerySchema } from "@workspace/shared/api/contacts/schemas"
import type {
  ContactDetailResponse,
  ContactDownloadResponse,
  ContactListResponse,
  RequestContactDownloadResponse,
} from "@workspace/shared/api/contacts/types"
import type { SendDownloadContactsPayload } from "@workspace/shared/jobs/emails/types"
import { auth } from "@/lib/auth/config"
import { requireOrganization } from "@/lib/auth/organization"
import { requireAuthToken } from "@/lib/auth/token"
import { emailsQueue } from "@/lib/queues"
import { validator } from "@/lib/validator"

export const contactRoutes = new Hono()

contactRoutes.post("/download", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")

  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user.email) {
      return c.json({ error: "User email not found" }, 400)
    }

    const organization = await db.query.organization.findFirst({
      where: {
        id: organizationId,
      },
      columns: {
        name: true,
      },
    })

    if (!organization) {
      return c.json({ error: "Organization not found" }, 404)
    }

    await emailsQueue.add("send-download-contacts", {
      to: session.user.email,
      organizationId,
      organizationName: organization.name,
    } satisfies SendDownloadContactsPayload)

    return c.json({ ok: true } satisfies RequestContactDownloadResponse)
  } catch {
    return c.json({ error: "Failed to request contacts download" }, 500)
  }
})

contactRoutes.get("/export/:organizationId", requireAuthToken, async (c) => {
  const organizationId = c.req.param("organizationId")

  try {
    const contacts = await db.query.contactsTable.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        latestCallAt: "desc",
      },
    })

    return c.json(contacts satisfies ContactDownloadResponse)
  } catch {
    return c.json({ error: "Failed to export contacts" }, 500)
  }
})

contactRoutes.get("/:contactId", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const contactId = c.req.param("contactId")

  try {
    const contact = await db.query.contactsTable.findFirst({
      where: {
        id: contactId,
        organizationId,
      },
    })

    if (!contact) {
      return c.json({ error: "Contact not found" }, 404)
    }

    const calls = await db.query.callsTable.findMany({
      where: {
        organizationId,
        contactId,
      },
      columns: {
        transcript: false,
      },
      with: {
        agent: {
          columns: {
            name: true,
          },
        },
        agentVersion: {
          columns: {
            number: true,
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      limit: 50,
    })

    return c.json({
      ...contact,
      calls,
    } satisfies ContactDetailResponse)
  } catch {
    return c.json({ error: "Failed to fetch contact" }, 500)
  }
})

contactRoutes.get(
  "/",
  requireOrganization,
  validator("query", contactListQuerySchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const query = c.req.valid("query")

    try {
      const where: NonNullable<
        Parameters<typeof db.query.contactsTable.findMany>[0]
      >["where"] = {
        organizationId,
      }

      if (query.firstCallFrom) {
        where.firstCallAt = {
          ...where.firstCallAt,
          gte: new Date(query.firstCallFrom),
        }
      }

      if (query.firstCallTo) {
        where.firstCallAt = {
          ...where.firstCallAt,
          lte: new Date(query.firstCallTo),
        }
      }

      if (query.latestCallFrom) {
        where.latestCallAt = {
          ...where.latestCallAt,
          gte: new Date(query.latestCallFrom),
        }
      }

      if (query.latestCallTo) {
        where.latestCallAt = {
          ...where.latestCallAt,
          lte: new Date(query.latestCallTo),
        }
      }

      if (query.callCount !== undefined) {
        if (
          query.callCountOp === "between" &&
          query.callCountMax !== undefined
        ) {
          where.callCount = {
            gte: Math.min(query.callCount, query.callCountMax),
            lte: Math.max(query.callCount, query.callCountMax),
          }
        } else if (query.callCountOp === "lte") {
          where.callCount = { lte: query.callCount }
        } else if (query.callCountOp === "eq") {
          where.callCount = { eq: query.callCount }
        } else {
          where.callCount = { gte: query.callCount }
        }
      }

      if (query.duration !== undefined) {
        const durationMs = Math.round(query.duration * 1000)

        if (query.durationOp === "between" && query.durationMax !== undefined) {
          const maxDurationMs = Math.round(query.durationMax * 1000)
          where.totalDurationMs = {
            gte: Math.min(durationMs, maxDurationMs),
            lte: Math.max(durationMs, maxDurationMs),
          }
        } else if (query.durationOp === "lte") {
          where.totalDurationMs = { lte: durationMs }
        } else if (query.durationOp === "eq") {
          where.totalDurationMs = { eq: durationMs }
        } else {
          where.totalDurationMs = { gte: durationMs }
        }
      }

      if (query.q) {
        const pattern = `%${query.q}%`
        where.OR = [
          { phoneNumber: { ilike: pattern } },
          { firstName: { ilike: pattern } },
          { lastName: { ilike: pattern } },
          { externalId: { ilike: pattern } },
        ]
      }

      const [{ total }] = await db
        .select({ total: count() })
        .from(contactsTable)
        .where(relationsFilterToSQL(contactsTable, where as AnyRelationsFilter))

      const items = await db.query.contactsTable.findMany({
        where,
        orderBy:
          query.sortBy === "callCount"
            ? { callCount: query.sortDir }
            : query.sortBy === "totalDurationMs"
              ? { totalDurationMs: query.sortDir }
              : query.sortBy === "firstCallAt"
                ? { firstCallAt: query.sortDir }
                : { latestCallAt: query.sortDir },
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      })

      return c.json({
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
      } satisfies ContactListResponse)
    } catch {
      return c.json({ error: "Failed to load contacts" }, 500)
    }
  }
)
