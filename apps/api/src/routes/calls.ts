import {
  type AnyRelationsFilter,
  count,
  eq,
  relationsFilterToSQL,
} from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import { callsTable } from "@workspace/db/schema/calls"
import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  callListQuerySchema,
  completeCallRequestSchema,
  startInboundCallRequestSchema,
  startOutboundCallRequestSchema,
  startWebCallRequestSchema,
  triggerOutboundCallRequestSchema,
  unansweredCallRequestSchema,
} from "@workspace/shared/api/calls/schemas"
import type {
  CallDetailResponse,
  CallDownloadResponse,
  CallListResponse,
  CompleteCallResponse,
  EndCallResponse,
  JoinCallResponse,
  RequestCallDownloadResponse,
  StartCallResponse,
  TriggerOutboundCallResponse,
  UnansweredCallResponse,
} from "@workspace/shared/api/calls/types"
import { auth } from "@/lib/auth/config"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import { requireAuthToken } from "@/lib/auth/token"
import { computeCallCosts } from "@/lib/call-cost"
import {
  deductOrganizationCredits,
  organizationHasCredits,
} from "@/lib/credits"
import {
  createAccessToken,
  getRecording,
  placeOutboundCall,
  removeCallParticipants,
  startCallRecording,
  stopCallRecording,
} from "@/lib/livekit"
import { emailsQueue } from "@/lib/queues"
import { validator } from "@/lib/validator"

export const callRoutes = new Hono()

type ResolvedAgentConfig = {
  organizationId: string
  agentVersionId: string | null
  config: AgentConfig
}

async function resolveAgentConfig(
  agentId: string,
  agentVersionId: string | null
): Promise<ResolvedAgentConfig | null> {
  const agent = await db.query.agentsTable.findFirst({
    where: {
      id: agentId,
    },
    columns: {
      organizationId: true,
      config: true,
    },
  })

  if (!agent) {
    return null
  }

  if (agentVersionId) {
    const version = await db.query.agentVersionsTable.findFirst({
      where: {
        id: agentVersionId,
        agentId,
      },
      columns: {
        config: true,
      },
    })

    if (!version) {
      return null
    }

    return {
      organizationId: agent.organizationId,
      agentVersionId,
      config: version.config,
    }
  }

  return {
    organizationId: agent.organizationId,
    agentVersionId: null,
    config: agent.config,
  }
}

callRoutes.post(
  "/start/web",
  requireAuthToken,
  validator("json", startWebCallRequestSchema),
  async (c) => {
    try {
      const payload = c.req.valid("json")

      const resolved = await resolveAgentConfig(
        payload.agentId,
        payload.agentVersionId
      )

      if (!resolved) {
        return c.json({ error: "Agent not found" }, 404)
      }

      if (!(await organizationHasCredits(resolved.organizationId))) {
        return c.json({ error: "Insufficient credits" }, 402)
      }

      const [call] = await db
        .insert(callsTable)
        .values({
          id: crypto.randomUUID(),
          organizationId: resolved.organizationId,
          agentId: payload.agentId,
          agentVersionId: resolved.agentVersionId,
          channel: "web_call",
          direction: "inbound",
          status: "in_progress",
          sttModel: resolved.config.stt.model,
          llmModel: resolved.config.llm.model,
          ttsModel: resolved.config.tts.model,
          livekitRoomName: payload.livekitRoomName,
          startedAt: new Date(payload.startedAt),
        })
        .returning({ id: callsTable.id })

      await startCallRecording(payload.livekitRoomName, call.id)

      return c.json(
        {
          callId: call.id,
          config: resolved.config,
        } satisfies StartCallResponse,
        201
      )
    } catch {
      return c.json({ error: "Failed to start call" }, 500)
    }
  }
)

callRoutes.post(
  "/start/inbound",
  requireAuthToken,
  validator("json", startInboundCallRequestSchema),
  async (c) => {
    try {
      const payload = c.req.valid("json")

      const phoneNumber = await db.query.phoneNumbersTable.findFirst({
        where: {
          number: payload.toNumber,
        },
        columns: {
          organizationId: true,
          agentId: true,
          agentVersionId: true,
        },
      })

      if (!phoneNumber?.agentId) {
        return c.json({ error: "Phone number not found" }, 404)
      }

      const resolved = await resolveAgentConfig(
        phoneNumber.agentId,
        phoneNumber.agentVersionId
      )

      if (!resolved) {
        return c.json({ error: "Phone number not found" }, 404)
      }

      if (!(await organizationHasCredits(phoneNumber.organizationId))) {
        return c.json({ error: "Insufficient credits" }, 402)
      }

      const [call] = await db
        .insert(callsTable)
        .values({
          id: crypto.randomUUID(),
          organizationId: phoneNumber.organizationId,
          agentId: phoneNumber.agentId,
          agentVersionId: resolved.agentVersionId,
          channel: "phone_call",
          direction: "inbound",
          status: "in_progress",
          fromNumber: payload.fromNumber,
          toNumber: payload.toNumber,
          sttModel: resolved.config.stt.model,
          llmModel: resolved.config.llm.model,
          ttsModel: resolved.config.tts.model,
          livekitRoomName: payload.livekitRoomName,
          startedAt: new Date(payload.startedAt),
        })
        .returning({ id: callsTable.id })

      await startCallRecording(payload.livekitRoomName, call.id)

      return c.json(
        {
          callId: call.id,
          config: resolved.config,
        } satisfies StartCallResponse,
        201
      )
    } catch {
      return c.json({ error: "Failed to start call" }, 500)
    }
  }
)

callRoutes.post(
  "/start/outbound",
  requireAuthToken,
  validator("json", startOutboundCallRequestSchema),
  async (c) => {
    try {
      const payload = c.req.valid("json")

      const resolved = await resolveAgentConfig(
        payload.agentId,
        payload.agentVersionId
      )

      if (!resolved) {
        return c.json({ error: "Agent not found" }, 404)
      }

      if (!(await organizationHasCredits(resolved.organizationId))) {
        return c.json({ error: "Insufficient credits" }, 402)
      }

      const [call] = await db
        .insert(callsTable)
        .values({
          id: crypto.randomUUID(),
          organizationId: resolved.organizationId,
          agentId: payload.agentId,
          agentVersionId: resolved.agentVersionId,
          channel: "phone_call",
          direction: "outbound",
          status: "in_progress",
          fromNumber: payload.fromNumber,
          toNumber: payload.toNumber,
          sttModel: resolved.config.stt.model,
          llmModel: resolved.config.llm.model,
          ttsModel: resolved.config.tts.model,
          livekitRoomName: payload.livekitRoomName,
          startedAt: new Date(payload.startedAt),
          batchCallId: payload.batchCallId,
        })
        .returning({ id: callsTable.id })

      await startCallRecording(payload.livekitRoomName, call.id)

      return c.json(
        {
          callId: call.id,
          config: resolved.config,
        } satisfies StartCallResponse,
        201
      )
    } catch {
      return c.json({ error: "Failed to start call" }, 500)
    }
  }
)

callRoutes.post(
  "/unanswered",
  requireAuthToken,
  validator("json", unansweredCallRequestSchema),
  async (c) => {
    try {
      const payload = c.req.valid("json")

      const resolved = await resolveAgentConfig(
        payload.agentId,
        payload.agentVersionId
      )

      if (!resolved) {
        return c.json({ error: "Agent not found" }, 404)
      }

      const [call] = await db
        .insert(callsTable)
        .values({
          id: crypto.randomUUID(),
          organizationId: resolved.organizationId,
          agentId: payload.agentId,
          agentVersionId: resolved.agentVersionId,
          channel: "phone_call",
          direction: "outbound",
          status: "no_answer",
          fromNumber: payload.fromNumber,
          toNumber: payload.toNumber,
          sttModel: resolved.config.stt.model,
          llmModel: resolved.config.llm.model,
          ttsModel: resolved.config.tts.model,
          livekitRoomName: payload.livekitRoomName,
          startedAt: new Date(payload.startedAt),
          endedAt: new Date(payload.endedAt),
          durationMs: 0,
          sttCost: "0",
          llmCost: "0",
          ttsCost: "0",
          telephonyCost: "0",
          platformCost: "0",
          totalCost: "0",
          batchCallId: payload.batchCallId,
        })
        .returning({ id: callsTable.id })

      return c.json({ callId: call.id } satisfies UnansweredCallResponse, 201)
    } catch {
      return c.json({ error: "Failed to record unanswered call" }, 500)
    }
  }
)

callRoutes.post(
  "/complete",
  requireAuthToken,
  validator("json", completeCallRequestSchema),
  async (c) => {
    try {
      const payload = c.req.valid("json")

      const call = await db.query.callsTable.findFirst({
        where: {
          id: payload.callId,
        },
      })

      if (!call) {
        return c.json({ error: "Call not found" }, 404)
      }

      if (call.endedAt) {
        return c.json({ error: "Call already ended" }, 409)
      }

      const endedAt = new Date(payload.endedAt)

      if (endedAt.getTime() < call.startedAt.getTime()) {
        return c.json({ error: "endedAt must be after startedAt" }, 400)
      }

      const durationMs = endedAt.getTime() - call.startedAt.getTime()
      const costs = computeCallCosts({
        durationMs,
        channel: call.channel,
        sttModel: call.sttModel,
        llmModel: call.llmModel,
        ttsModel: call.ttsModel,
      })

      await stopCallRecording(call.livekitRoomName)

      const [updated] = await db
        .update(callsTable)
        .set({
          status: payload.status,
          endedAt,
          durationMs,
          sttCost: costs.stt.toFixed(6),
          llmCost: costs.llm.toFixed(6),
          ttsCost: costs.tts.toFixed(6),
          telephonyCost: costs.telephony.toFixed(6),
          platformCost: costs.platform.toFixed(6),
          totalCost: costs.total.toFixed(6),
          transcript: payload.transcript,
          variables: payload.variables ?? null,
          updatedAt: new Date(),
        })
        .where(eq(callsTable.id, payload.callId))
        .returning()

      await deductOrganizationCredits(call.organizationId, costs.total)

      return c.json({
        id: updated.id,
        durationMs,
      } satisfies CompleteCallResponse)
    } catch {
      return c.json({ error: "Failed to complete call" }, 500)
    }
  }
)

callRoutes.post("/download", requireOrganization, async (c) => {
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

    await emailsQueue.add("send-download-calls", {
      to: session.user.email,
      organizationId,
      organizationName: organization.name,
    })

    return c.json({ ok: true } satisfies RequestCallDownloadResponse)
  } catch {
    return c.json({ error: "Failed to request calls download" }, 500)
  }
})

callRoutes.get("/export/:organizationId", requireAuthToken, async (c) => {
  const organizationId = c.req.param("organizationId")

  try {
    const calls = await db.query.callsTable.findMany({
      where: {
        organizationId,
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
    })

    return c.json(calls satisfies CallDownloadResponse)
  } catch {
    return c.json({ error: "Failed to export calls" }, 500)
  }
})

callRoutes.get("/:callId/recording", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const callId = c.req.param("callId")

  try {
    const call = await db.query.callsTable.findFirst({
      where: {
        id: callId,
        organizationId,
      },
      columns: {
        id: true,
      },
    })

    if (!call) {
      return c.json({ error: "Call not found" }, 404)
    }

    const recording = await getRecording(call.id)

    c.header("Content-Type", "audio/mp4")
    c.header("Cache-Control", "private, max-age=604800, immutable")
    if (recording.ContentLength != null) {
      c.header("Content-Length", String(recording.ContentLength))
    }
    return c.body(recording.Body.transformToWebStream())
  } catch {
    return c.json({ error: "Failed to fetch recording" }, 500)
  }
})

callRoutes.post("/:callId/join", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const callId = c.req.param("callId")

  try {
    const call = await db.query.callsTable.findFirst({
      where: {
        id: callId,
        organizationId,
      },
      columns: {
        status: true,
        livekitRoomName: true,
      },
    })

    if (!call) {
      return c.json({ error: "Call not found" }, 404)
    }

    if (call.status !== "in_progress") {
      return c.json({ error: "Call is not in progress" }, 400)
    }

    const token = await createAccessToken({
      identity: `monitor-${crypto.randomUUID()}`,
      name: "Monitor",
      grant: {
        room: call.livekitRoomName,
        roomJoin: true,
        canSubscribe: true,
        canPublish: false,
        canPublishData: false,
      },
    })

    return c.json(token satisfies JoinCallResponse, 201)
  } catch {
    return c.json({ error: "Failed to join call" }, 500)
  }
})

callRoutes.post("/:callId/end", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const callId = c.req.param("callId")

  try {
    const call = await db.query.callsTable.findFirst({
      where: {
        id: callId,
        organizationId,
      },
      columns: {
        status: true,
        livekitRoomName: true,
      },
    })

    if (!call) {
      return c.json({ error: "Call not found" }, 404)
    }

    if (call.status !== "in_progress") {
      return c.json({ error: "Call is not in progress" }, 400)
    }

    await removeCallParticipants(call.livekitRoomName)

    return c.json({ ok: true } satisfies EndCallResponse)
  } catch {
    return c.json({ error: "Failed to end call" }, 500)
  }
})

callRoutes.get("/:callId", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const callId = c.req.param("callId")

  try {
    const call = await db.query.callsTable.findFirst({
      where: {
        id: callId,
        organizationId,
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
    })

    if (!call) {
      return c.json({ error: "Call not found" }, 404)
    }

    return c.json(call satisfies CallDetailResponse)
  } catch {
    return c.json({ error: "Failed to fetch call" }, 500)
  }
})

callRoutes.get(
  "/",
  requireOrganization,
  validator("query", callListQuerySchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const query = c.req.valid("query")

    try {
      const where: NonNullable<
        Parameters<typeof db.query.callsTable.findMany>[0]
      >["where"] = {
        organizationId,
      }

      if (query.channel) {
        where.channel = query.channel
      }

      if (query.direction) {
        where.direction = query.direction
      }

      if (query.status) {
        where.status = query.status
      }

      if (query.startedAtFrom) {
        where.startedAt = {
          ...where.startedAt,
          gte: new Date(query.startedAtFrom),
        }
      }

      if (query.startedAtTo) {
        where.startedAt = {
          ...where.startedAt,
          lte: new Date(query.startedAtTo),
        }
      }

      if (query.agentIds) {
        const agentIds = Array.isArray(query.agentIds)
          ? query.agentIds
          : query.agentIds.split(",")
        where.agentId = { in: agentIds }
      }

      if (query.fromNumbers) {
        const fromNumbers = Array.isArray(query.fromNumbers)
          ? query.fromNumbers
          : query.fromNumbers.split(",")
        where.fromNumber = { in: fromNumbers }
      }

      if (query.toNumbers) {
        const toNumbers = Array.isArray(query.toNumbers)
          ? query.toNumbers
          : query.toNumbers.split(",")
        where.toNumber = { in: toNumbers }
      }

      if (query.batchId) {
        where.batchCallId = query.batchId
      }

      if (query.cost !== undefined) {
        const cost = query.cost.toFixed(6)

        if (query.costOp === "between" && query.costMax !== undefined) {
          where.totalCost = {
            gte: Math.min(query.cost, query.costMax).toFixed(6),
            lte: Math.max(query.cost, query.costMax).toFixed(6),
          }
        } else if (query.costOp === "lte") {
          where.totalCost = { lte: cost }
        } else if (query.costOp === "eq") {
          where.totalCost = { eq: cost }
        } else {
          where.totalCost = { gte: cost }
        }
      }

      if (query.duration !== undefined) {
        const durationMs = Math.round(query.duration * 1000)

        if (query.durationOp === "between" && query.durationMax !== undefined) {
          const maxDurationMs = Math.round(query.durationMax * 1000)
          where.durationMs = {
            gte: Math.min(durationMs, maxDurationMs),
            lte: Math.max(durationMs, maxDurationMs),
          }
        } else if (query.durationOp === "lte") {
          where.durationMs = { lte: durationMs }
        } else if (query.durationOp === "eq") {
          where.durationMs = { eq: durationMs }
        } else {
          where.durationMs = { gte: durationMs }
        }
      }

      const [{ total }] = await db
        .select({ total: count() })
        .from(callsTable)
        .where(relationsFilterToSQL(callsTable, where as AnyRelationsFilter))

      const items = await db.query.callsTable.findMany({
        where,
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
        orderBy:
          query.sortBy === "duration"
            ? { durationMs: query.sortDir }
            : query.sortBy === "cost"
              ? { totalCost: query.sortDir }
              : { startedAt: query.sortDir },
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      })

      return c.json({
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
      } satisfies CallListResponse)
    } catch {
      return c.json({ error: "Failed to load calls" }, 500)
    }
  }
)

callRoutes.post(
  "/outbound",
  requireOrganization,
  requirePermission({ calls: ["create"] }),
  validator("json", triggerOutboundCallRequestSchema),
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
          number: true,
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

      await placeOutboundCall({
        agentId: payload.agentId,
        agentVersionId: payload.agentVersionId ?? null,
        toNumber: payload.toNumber,
        fromNumber: phoneNumber.number,
        sipAddress: phoneNumber.sipAddress,
        sipUsername: phoneNumber.sipUsername,
        sipPassword: phoneNumber.sipPassword,
        variables: payload.variables ?? {},
        batchCallId: null,
      })

      return c.json({ ok: true } satisfies TriggerOutboundCallResponse)
    } catch {
      return c.json({ error: "Failed to start outbound call" }, 500)
    }
  }
)
