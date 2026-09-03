import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import {
  batchCallRecipientsTable,
  batchCallsTable,
} from "@workspace/db/schema/batch-calls"
import {
  batchCallIdParamsSchema,
  createBatchCallRequestSchema,
} from "@workspace/shared/api/batch-calls/schemas"
import type {
  BatchCallListResponse,
  CreateBatchCallResponse,
  TriggerBatchCallResponse,
} from "@workspace/shared/api/batch-calls/types"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import { requireAuthToken } from "@/lib/auth/token"
import { organizationHasCredits } from "@/lib/credits"
import { placeOutboundCall } from "@/lib/livekit"
import { batchCallsQueue } from "@/lib/queues"
import { validator } from "@/lib/validator"

export const batchCallRoutes = new Hono()

batchCallRoutes.get("/", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")

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
    return c.json({ error: "Failed to load batch calls" }, 500)
  }
})

batchCallRoutes.post(
  "/",
  requireOrganization,
  requirePermission({ calls: ["create"] }),
  validator("json", createBatchCallRequestSchema),
  async (c) => {
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
        return c.json({ error: "Phone number not found" }, 404)
      }

      if (
        !phoneNumber.sipAddress ||
        !phoneNumber.sipUsername ||
        !phoneNumber.sipPassword
      ) {
        return c.json({ error: "Phone number has no SIP connection" }, 400)
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
        return c.json({ error: "Agent not found" }, 404)
      }

      if (!(await organizationHasCredits(organizationId))) {
        return c.json({ error: "Insufficient credits" }, 402)
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
          return c.json({ error: "Agent version not found" }, 404)
        }
      }

      const scheduledAt = payload.scheduledAt
        ? new Date(payload.scheduledAt)
        : null

      if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
        return c.json({ error: "Scheduled time must be in the future" }, 400)
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
          status: scheduledAt ? "scheduled" : "triggered",
          scheduledAt,
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
        { batchCallId },
        scheduledAt ? { delay: scheduledAt.getTime() - Date.now() } : undefined
      )

      return c.json({ id: batchCallId } satisfies CreateBatchCallResponse)
    } catch {
      return c.json({ error: "Failed to create batch call" }, 500)
    }
  }
)

batchCallRoutes.post(
  "/:id/trigger",
  requireAuthToken,
  validator("param", batchCallIdParamsSchema),
  async (c) => {
    const { id } = c.req.valid("param")

    try {
      const batchCall = await db.query.batchCallsTable.findFirst({
        where: { id },
        columns: {
          id: true,
          organizationId: true,
          agentId: true,
          agentVersionId: true,
        },
        with: {
          phoneNumber: {
            columns: {
              number: true,
              sipAddress: true,
              sipUsername: true,
              sipPassword: true,
            },
          },
          recipients: {
            columns: {
              toNumber: true,
              variables: true,
            },
          },
        },
      })

      if (!batchCall) {
        return c.json({ error: "Batch call not found" }, 404)
      }

      if (!(await organizationHasCredits(batchCall.organizationId))) {
        return c.json({ error: "Insufficient credits" }, 402)
      }

      const phoneNumber = batchCall.phoneNumber
      if (!phoneNumber) {
        return c.json({ error: "Phone number not found" }, 404)
      }

      if (
        !phoneNumber.sipAddress ||
        !phoneNumber.sipUsername ||
        !phoneNumber.sipPassword
      ) {
        return c.json({ error: "Phone number has no SIP connection" }, 400)
      }

      for (const recipient of batchCall.recipients) {
        try {
          await placeOutboundCall({
            agentId: batchCall.agentId,
            agentVersionId: batchCall.agentVersionId,
            toNumber: recipient.toNumber,
            fromNumber: phoneNumber.number,
            sipAddress: phoneNumber.sipAddress,
            sipUsername: phoneNumber.sipUsername,
            sipPassword: phoneNumber.sipPassword,
            variables: recipient.variables ?? {},
            batchCallId: id,
          })
        } catch {
          // Continue if one recipient fails
        }
      }

      await db
        .update(batchCallsTable)
        .set({
          status: "triggered",
          updatedAt: new Date(),
        })
        .where(eq(batchCallsTable.id, id))

      return c.json({ ok: true } satisfies TriggerBatchCallResponse)
    } catch {
      return c.json({ error: "Failed to trigger batch call" }, 500)
    }
  }
)
