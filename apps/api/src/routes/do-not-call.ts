import {
  type AnyRelationsFilter,
  and,
  count,
  eq,
  relationsFilterToSQL,
} from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import { doNotCallNumbersTable } from "@workspace/db/schema/do-not-call"
import {
  addCallToDoNotCallRequestSchema,
  addDoNotCallRequestSchema,
  bulkAddDoNotCallRequestSchema,
  checkDoNotCallRequestSchema,
  doNotCallIdParamsSchema,
  doNotCallListQuerySchema,
  normalizePhoneNumber,
} from "@workspace/shared/api/do-not-call/schemas"
import type {
  AddCallToDoNotCallResponse,
  BulkAddDoNotCallResponse,
  CheckDoNotCallResponse,
  DoNotCallListResponse,
  DoNotCallNumber,
  RemoveDoNotCallResponse,
} from "@workspace/shared/api/do-not-call/types"
import { auth } from "@/lib/auth/config"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import { requireAuthToken } from "@/lib/auth/token"
import { findDoNotCallNumbers, remotePhoneNumber } from "@/lib/do-not-call"
import { t } from "@/lib/i18n"
import { validator } from "@/lib/validator"

const BULK_INSERT_CHUNK_SIZE = 1000

export const doNotCallRoutes = new Hono()

doNotCallRoutes.get(
  "/",
  requireOrganization,
  validator("query", doNotCallListQuerySchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const query = c.req.valid("query")

    try {
      const where: NonNullable<
        Parameters<typeof db.query.doNotCallNumbersTable.findMany>[0]
      >["where"] = {
        organizationId,
      }

      if (query.q) {
        where.OR = [
          { number: { ilike: `%${query.q.replace(/[\s().-]/g, "")}%` } },
          { reason: { ilike: `%${query.q}%` } },
        ]
      }

      const [{ total }] = await db
        .select({ total: count() })
        .from(doNotCallNumbersTable)
        .where(
          relationsFilterToSQL(
            doNotCallNumbersTable,
            where as AnyRelationsFilter
          )
        )

      const items = await db.query.doNotCallNumbersTable.findMany({
        where,
        with: {
          createdByUser: {
            columns: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      })

      return c.json({
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
      } satisfies DoNotCallListResponse)
    } catch {
      return c.json({ error: t(locale, "do_not_call.list_failed") }, 500)
    }
  }
)

doNotCallRoutes.post(
  "/",
  requireOrganization,
  requirePermission({ doNotCall: ["create"] }),
  validator("json", addDoNotCallRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const payload = c.req.valid("json")

    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers })

      const [created] = await db
        .insert(doNotCallNumbersTable)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          number: payload.number,
          source: "manual",
          reason: payload.reason || null,
          createdBy: session?.user.id ?? null,
        })
        .onConflictDoNothing()
        .returning()

      if (!created) {
        return c.json({ error: t(locale, "do_not_call.already_listed") }, 409)
      }

      return c.json(created satisfies DoNotCallNumber, 201)
    } catch {
      return c.json({ error: t(locale, "do_not_call.create_failed") }, 500)
    }
  }
)

doNotCallRoutes.post(
  "/bulk",
  requireOrganization,
  requirePermission({ doNotCall: ["create"] }),
  validator("json", bulkAddDoNotCallRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { rows } = c.req.valid("json")

    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers })

      const invalid: string[] = []
      const unique = new Map<string, string | null>()
      let duplicates = 0

      for (const row of rows) {
        const number = normalizePhoneNumber(row.number)

        if (!number) {
          invalid.push(row.number)
        } else if (unique.has(number)) {
          duplicates += 1
        } else {
          unique.set(number, row.reason || null)
        }
      }

      const values = Array.from(unique, ([number, reason]) => ({
        id: crypto.randomUUID(),
        organizationId,
        number,
        source: "import" as const,
        reason,
        createdBy: session?.user.id ?? null,
      }))

      let added = 0

      await db.transaction(async (tx) => {
        for (
          let start = 0;
          start < values.length;
          start += BULK_INSERT_CHUNK_SIZE
        ) {
          const inserted = await tx
            .insert(doNotCallNumbersTable)
            .values(values.slice(start, start + BULK_INSERT_CHUNK_SIZE))
            .onConflictDoNothing()
            .returning({ id: doNotCallNumbersTable.id })

          added += inserted.length
        }
      })

      return c.json({
        added,
        alreadyListed: values.length - added,
        duplicates,
        invalid,
      } satisfies BulkAddDoNotCallResponse)
    } catch {
      return c.json({ error: t(locale, "do_not_call.import_failed") }, 500)
    }
  }
)

doNotCallRoutes.post(
  "/check",
  requireOrganization,
  validator("json", checkDoNotCallRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { numbers } = c.req.valid("json")

    try {
      const listed = await findDoNotCallNumbers(organizationId, numbers)

      return c.json({
        numbers: Array.from(listed),
      } satisfies CheckDoNotCallResponse)
    } catch {
      return c.json({ error: t(locale, "do_not_call.check_failed") }, 500)
    }
  }
)

// Called by the voice agent. The organization and the number come from the call
// row, never from the request, so a prompt-injected agent cannot list anything
// other than the party it is talking to.
doNotCallRoutes.post(
  "/from-call",
  requireAuthToken,
  validator("json", addCallToDoNotCallRequestSchema),
  async (c) => {
    const { callId } = c.req.valid("json")

    try {
      const call = await db.query.callsTable.findFirst({
        where: { id: callId },
        columns: {
          organizationId: true,
          channel: true,
          direction: true,
          fromNumber: true,
          toNumber: true,
        },
      })

      if (!call) {
        return c.json({ error: "Call not found" }, 404)
      }

      const number = remotePhoneNumber(call)

      if (!number) {
        return c.json({ error: "Call has no remote phone number" }, 422)
      }

      await db
        .insert(doNotCallNumbersTable)
        .values({
          id: crypto.randomUUID(),
          organizationId: call.organizationId,
          number,
          source: "call",
          callId,
        })
        .onConflictDoNothing()

      return c.json({ ok: true } satisfies AddCallToDoNotCallResponse)
    } catch {
      return c.json({ error: "Failed to add number to do-not-call list" }, 500)
    }
  }
)

doNotCallRoutes.delete(
  "/:id",
  requireOrganization,
  requirePermission({ doNotCall: ["delete"] }),
  validator("param", doNotCallIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id } = c.req.valid("param")

    try {
      const [removed] = await db
        .delete(doNotCallNumbersTable)
        .where(
          and(
            eq(doNotCallNumbersTable.id, id),
            eq(doNotCallNumbersTable.organizationId, organizationId)
          )
        )
        .returning({ id: doNotCallNumbersTable.id })

      if (!removed) {
        return c.json({ error: t(locale, "do_not_call.not_found") }, 404)
      }

      return c.json({ ok: true } satisfies RemoveDoNotCallResponse)
    } catch {
      return c.json({ error: t(locale, "do_not_call.delete_failed") }, 500)
    }
  }
)
