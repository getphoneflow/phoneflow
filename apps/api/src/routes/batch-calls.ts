import { and, count, eq, inArray, sql } from "drizzle-orm"
import { type Context, Hono } from "hono"

import { db } from "@workspace/db/client"
import {
  batchCallRecipientsTable,
  batchCallsTable,
} from "@workspace/db/schema/batch-calls"
import { DEFAULT_MAX_CONCURRENT_CALLS } from "@workspace/shared/api/batch-calls/schedule"
import {
  batchCallIdParamsSchema,
  batchCallRecipientListQuerySchema,
  createBatchCallRequestSchema,
} from "@workspace/shared/api/batch-calls/schemas"
import type {
  BatchCallActionResponse,
  BatchCallDetailResponse,
  BatchCallListResponse,
  BatchCallRecipientCounts,
  BatchCallRecipientListResponse,
  BatchCallTickResponse,
  CreateBatchCallResponse,
  TriggerBatchCallResponse,
} from "@workspace/shared/api/batch-calls/types"
import type { ProcessBatchCallPayload } from "@workspace/shared/jobs/batch-calls/types"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import { requireAuthToken } from "@/lib/auth/token"
import { enqueueBatchCallTick, tickBatchCall } from "@/lib/batch-calls"
import { organizationHasCredits } from "@/lib/credits"
import { env } from "@/lib/env"
import { t } from "@/lib/i18n"
import { batchCallsQueue } from "@/lib/queues"
import { validator } from "@/lib/validator"

export const batchCallRoutes = new Hono()

async function respondToInvalidTransition(
  c: Context,
  id: string,
  organizationId: string
) {
  const locale = c.get("locale")
  const batchCall = await db.query.batchCallsTable.findFirst({
    where: {
      id,
      organizationId,
    },
    columns: {
      id: true,
    },
  })

  return batchCall
    ? c.json({ error: t(locale, "batch_calls.invalid_status") }, 409)
    : c.json({ error: t(locale, "batch_calls.not_found") }, 404)
}

batchCallRoutes.get("/", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const locale = c.get("locale")

  try {
    const batchCalls = await db.query.batchCallsTable.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      with: {
        phoneNumber: {
          columns: {
            number: true,
          },
        },
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
    })

    return c.json(batchCalls satisfies BatchCallListResponse)
  } catch {
    return c.json({ error: t(locale, "batch_calls.list_failed") }, 500)
  }
})

batchCallRoutes.post(
  "/",
  requireOrganization,
  requirePermission({ calls: ["create"] }),
  validator("json", createBatchCallRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const payload = c.req.valid("json")

    try {
      const phoneNumber = await db.query.phoneNumbersTable.findFirst({
        where: {
          id: payload.phoneNumberId,
          organizationId,
        },
        columns: {
          id: true,
          sipAddress: true,
          sipUsername: true,
          sipPassword: true,
        },
      })

      if (!phoneNumber) {
        return c.json(
          { error: t(locale, "batch_calls.phone_number_not_found") },
          404
        )
      }

      if (
        !phoneNumber.sipAddress ||
        !phoneNumber.sipUsername ||
        !phoneNumber.sipPassword
      ) {
        return c.json(
          { error: t(locale, "batch_calls.phone_number_without_sip") },
          400
        )
      }

      const agent = await db.query.agentsTable.findFirst({
        where: {
          id: payload.agentId,
          organizationId,
        },
        columns: {
          id: true,
        },
      })

      if (!agent) {
        return c.json({ error: t(locale, "batch_calls.agent_not_found") }, 404)
      }

      if (env.IS_CLOUD && !(await organizationHasCredits(organizationId))) {
        return c.json(
          { error: t(locale, "batch_calls.insufficient_credits") },
          402
        )
      }

      if (payload.agentVersionId) {
        const version = await db.query.agentVersionsTable.findFirst({
          where: {
            id: payload.agentVersionId,
            agentId: payload.agentId,
          },
          columns: {
            id: true,
          },
        })

        if (!version) {
          return c.json(
            {
              error: t(locale, "batch_calls.agent_version_not_found"),
            },
            404
          )
        }
      }

      const scheduledAt = payload.scheduledAt
        ? new Date(payload.scheduledAt)
        : null

      if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
        return c.json(
          { error: t(locale, "batch_calls.scheduled_at_in_past") },
          400
        )
      }

      const batchCallId = crypto.randomUUID()

      await db.transaction(async (tx) => {
        await tx.insert(batchCallsTable).values({
          id: batchCallId,
          organizationId,
          name: payload.name,
          phoneNumberId: payload.phoneNumberId,
          agentId: payload.agentId,
          agentVersionId: payload.agentVersionId ?? null,
          status: scheduledAt ? "scheduled" : "running",
          scheduledAt,
          maxConcurrentCalls:
            payload.maxConcurrentCalls ?? DEFAULT_MAX_CONCURRENT_CALLS,
          schedule: payload.schedule ?? null,
          totalCount: payload.recipients.length,
        })

        await tx.insert(batchCallRecipientsTable).values(
          payload.recipients.map((recipient) => ({
            id: crypto.randomUUID(),
            batchCallId,
            toNumber: recipient.toNumber,
            variables: recipient.variables ?? {},
          }))
        )
      })

      await batchCallsQueue.add(
        "process-batch-call",
        { batchCallId } satisfies ProcessBatchCallPayload,
        {
          delay: scheduledAt ? scheduledAt.getTime() - Date.now() : undefined,
          // Nothing else ever starts the batch if this job is lost to an API
          // blip, and the trigger route is safe to repeat.
          attempts: 5,
          backoff: { type: "exponential", delay: 5000 },
        }
      )

      return c.json({ id: batchCallId } satisfies CreateBatchCallResponse)
    } catch {
      return c.json({ error: t(locale, "batch_calls.create_failed") }, 500)
    }
  }
)

batchCallRoutes.get(
  "/:id",
  requireOrganization,
  validator("param", batchCallIdParamsSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const { id } = c.req.valid("param")

    try {
      const batchCall = await db.query.batchCallsTable.findFirst({
        where: {
          id,
          organizationId,
        },
        with: {
          phoneNumber: {
            columns: {
              number: true,
            },
          },
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
      })

      if (!batchCall) {
        return c.json({ error: t(locale, "batch_calls.not_found") }, 404)
      }

      const rows = await db
        .select({
          status: batchCallRecipientsTable.status,
          total: count(),
        })
        .from(batchCallRecipientsTable)
        .where(eq(batchCallRecipientsTable.batchCallId, id))
        .groupBy(batchCallRecipientsTable.status)

      const counts: BatchCallRecipientCounts = {
        pending: 0,
        dialing: 0,
        in_progress: 0,
        completed: 0,
        no_answer: 0,
        failed: 0,
        cancelled: 0,
      }

      for (const row of rows) {
        counts[row.status] = row.total
      }

      return c.json({
        ...batchCall,
        counts,
      } satisfies BatchCallDetailResponse)
    } catch {
      return c.json({ error: t(locale, "batch_calls.load_failed") }, 500)
    }
  }
)

batchCallRoutes.get(
  "/:id/recipients",
  requireOrganization,
  validator("param", batchCallIdParamsSchema),
  validator("query", batchCallRecipientListQuerySchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const { id } = c.req.valid("param")
    const { page, pageSize, status } = c.req.valid("query")

    try {
      const batchCall = await db.query.batchCallsTable.findFirst({
        where: {
          id,
          organizationId,
        },
        columns: {
          id: true,
        },
      })

      if (!batchCall) {
        return c.json({ error: t(locale, "batch_calls.not_found") }, 404)
      }

      const where = and(
        eq(batchCallRecipientsTable.batchCallId, id),
        status ? eq(batchCallRecipientsTable.status, status) : undefined
      )

      const [items, [{ total }]] = await Promise.all([
        db
          .select({
            id: batchCallRecipientsTable.id,
            toNumber: batchCallRecipientsTable.toNumber,
            status: batchCallRecipientsTable.status,
            callId: batchCallRecipientsTable.callId,
            error: batchCallRecipientsTable.error,
            dialedAt: batchCallRecipientsTable.dialedAt,
            updatedAt: batchCallRecipientsTable.updatedAt,
          })
          .from(batchCallRecipientsTable)
          .where(where)
          .orderBy(
            sql`${batchCallRecipientsTable.dialedAt} desc nulls last`,
            batchCallRecipientsTable.id
          )
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ total: count() })
          .from(batchCallRecipientsTable)
          .where(where),
      ])

      return c.json({
        items,
        total,
        page,
        pageSize,
      } satisfies BatchCallRecipientListResponse)
    } catch {
      return c.json(
        { error: t(locale, "batch_calls.list_recipients_failed") },
        500
      )
    }
  }
)

batchCallRoutes.post(
  "/:id/pause",
  requireOrganization,
  requirePermission({ calls: ["create"] }),
  validator("param", batchCallIdParamsSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const { id } = c.req.valid("param")

    try {
      const [paused] = await db
        .update(batchCallsTable)
        .set({ status: "paused", pauseReason: "manual", updatedAt: new Date() })
        .where(
          and(
            eq(batchCallsTable.id, id),
            eq(batchCallsTable.organizationId, organizationId),
            eq(batchCallsTable.status, "running")
          )
        )
        .returning({ id: batchCallsTable.id })

      if (!paused) {
        return respondToInvalidTransition(c, id, organizationId)
      }

      return c.json({ ok: true } satisfies BatchCallActionResponse)
    } catch {
      return c.json({ error: t(locale, "batch_calls.pause_failed") }, 500)
    }
  }
)

batchCallRoutes.post(
  "/:id/resume",
  requireOrganization,
  requirePermission({ calls: ["create"] }),
  validator("param", batchCallIdParamsSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const { id } = c.req.valid("param")

    try {
      if (env.IS_CLOUD && !(await organizationHasCredits(organizationId))) {
        return c.json(
          { error: t(locale, "batch_calls.insufficient_credits") },
          402
        )
      }

      const [resumed] = await db
        .update(batchCallsTable)
        .set({ status: "running", pauseReason: null, updatedAt: new Date() })
        .where(
          and(
            eq(batchCallsTable.id, id),
            eq(batchCallsTable.organizationId, organizationId),
            eq(batchCallsTable.status, "paused")
          )
        )
        .returning({ id: batchCallsTable.id })

      if (!resumed) {
        return respondToInvalidTransition(c, id, organizationId)
      }

      await enqueueBatchCallTick(id)

      return c.json({ ok: true } satisfies BatchCallActionResponse)
    } catch {
      return c.json({ error: t(locale, "batch_calls.resume_failed") }, 500)
    }
  }
)

batchCallRoutes.post(
  "/:id/cancel",
  requireOrganization,
  requirePermission({ calls: ["create"] }),
  validator("param", batchCallIdParamsSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")
    const { id } = c.req.valid("param")

    try {
      const cancelled = await db.transaction(async (tx) => {
        const [batchCall] = await tx
          .update(batchCallsTable)
          .set({
            status: "cancelled",
            pauseReason: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(batchCallsTable.id, id),
              eq(batchCallsTable.organizationId, organizationId),
              inArray(batchCallsTable.status, [
                "scheduled",
                "running",
                "paused",
              ])
            )
          )
          .returning({ id: batchCallsTable.id })

        if (!batchCall) {
          return false
        }

        await tx
          .update(batchCallRecipientsTable)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(batchCallRecipientsTable.batchCallId, id),
              eq(batchCallRecipientsTable.status, "pending")
            )
          )

        return true
      })

      if (!cancelled) {
        return respondToInvalidTransition(c, id, organizationId)
      }

      // A batch cancelled from paused has no tick running, and its live calls
      // still need the stuck-recipient timeout.
      await enqueueBatchCallTick(id)

      return c.json({ ok: true } satisfies BatchCallActionResponse)
    } catch {
      return c.json({ error: t(locale, "batch_calls.cancel_failed") }, 500)
    }
  }
)

// Kept under its original name: delayed jobs enqueued before pacing existed still
// call it. It only starts a batch, and never touches `triggered` ones, which were
// dialed by the old loop.
batchCallRoutes.post(
  "/:id/trigger",
  requireAuthToken,
  validator("param", batchCallIdParamsSchema),
  async (c) => {
    const { id } = c.req.valid("param")

    try {
      await db
        .update(batchCallsTable)
        .set({ status: "running", updatedAt: new Date() })
        .where(
          and(
            eq(batchCallsTable.id, id),
            eq(batchCallsTable.status, "scheduled")
          )
        )

      const batchCall = await db.query.batchCallsTable.findFirst({
        where: { id },
        columns: {
          status: true,
        },
      })

      if (!batchCall) {
        return c.json({ error: "Batch call not found" }, 404)
      }

      if (batchCall.status === "running") {
        await enqueueBatchCallTick(id)
      }

      return c.json({ ok: true } satisfies TriggerBatchCallResponse)
    } catch {
      return c.json({ error: "Failed to trigger batch call" }, 500)
    }
  }
)

batchCallRoutes.post(
  "/:id/tick",
  requireAuthToken,
  validator("param", batchCallIdParamsSchema),
  async (c) => {
    const { id } = c.req.valid("param")

    try {
      const result = await tickBatchCall(id)

      if (!result) {
        return c.json({ error: "Batch call not found" }, 404)
      }

      return c.json(result satisfies BatchCallTickResponse)
    } catch (error) {
      console.error("Batch call tick failed", error)
      return c.json({ error: "Failed to tick batch call" }, 500)
    }
  }
)
