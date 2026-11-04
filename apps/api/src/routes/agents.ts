import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "@workspace/db/client"
import { agentsTable, agentVersionsTable } from "@workspace/db/schema/agents"
import {
  agentIdParamsSchema,
  agentVersionParamsSchema,
  createAgentRequestSchema,
  publishAgentRequestSchema,
  updateAgentConfigRequestSchema,
  updateAgentNameRequestSchema,
} from "@workspace/shared/api/agents/schemas"
import type {
  AgentConfigResponse,
  AgentDetailResponse,
  AgentsListResponse,
  AgentVersionConfigResponse,
  AgentVersionResponse,
  AgentVersionsListResponse,
  CreateAgentResponse,
  DeleteAgentResponse,
  DuplicateAgentResponse,
  UpdateAgentNameResponse,
} from "@workspace/shared/api/agents/types"
import { requireOrganization } from "@/lib/auth/organization"
import { requirePermission } from "@/lib/auth/permissions"
import { t } from "@/lib/i18n"
import { validator } from "@/lib/validator"

export const agentRoutes = new Hono()

agentRoutes.get("/", requireOrganization, async (c) => {
  const organizationId = c.get("organizationId")
  const locale = c.get("locale")

  try {
    const agents = await db.query.agentsTable.findMany({
      where: {
        organizationId,
      },
      columns: {
        config: false,
      },
      with: {
        phoneNumbers: {
          columns: {
            number: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return c.json(agents satisfies AgentsListResponse)
  } catch {
    return c.json({ error: t(locale, "agents.list_failed") }, 500)
  }
})

agentRoutes.post(
  "/",
  requireOrganization,
  requirePermission({ agent: ["create"] }),
  validator("json", createAgentRequestSchema),
  async (c) => {
    const organizationId = c.get("organizationId")
    const locale = c.get("locale")

    try {
      const payload = c.req.valid("json")

      const [agent] = await db
        .insert(agentsTable)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          name: payload.name,
          config: payload.config,
        })
        .returning({
          id: agentsTable.id,
          name: agentsTable.name,
          createdAt: agentsTable.createdAt,
          updatedAt: agentsTable.updatedAt,
        })

      return c.json(agent satisfies CreateAgentResponse, 201)
    } catch {
      return c.json({ error: t(locale, "agents.create_failed") }, 500)
    }
  }
)

agentRoutes.post(
  "/:id/duplicate",
  requireOrganization,
  requirePermission({ agent: ["create"] }),
  validator("param", agentIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id: agentId } = c.req.valid("param")

    try {
      const sourceAgent = await db.query.agentsTable.findFirst({
        where: {
          id: agentId,
          organizationId,
        },
      })

      if (!sourceAgent) {
        return c.json({ error: t(locale, "agents.not_found") }, 404)
      }

      const [duplicatedAgent] = await db
        .insert(agentsTable)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          name: `${sourceAgent.name} (copy)`.slice(0, 255),
          config: sourceAgent.config,
        })
        .returning({
          id: agentsTable.id,
          name: agentsTable.name,
          createdAt: agentsTable.createdAt,
          updatedAt: agentsTable.updatedAt,
        })

      return c.json(duplicatedAgent satisfies DuplicateAgentResponse, 201)
    } catch {
      return c.json({ error: t(locale, "agents.duplicate_failed") }, 500)
    }
  }
)

agentRoutes.get(
  "/:id",
  requireOrganization,
  validator("param", agentIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id: agentId } = c.req.valid("param")

    try {
      const agent = await db.query.agentsTable.findFirst({
        where: {
          id: agentId,
          organizationId,
        },
        columns: {
          config: false,
        },
        with: {
          versions: {
            columns: {
              agentId: false,
              config: false,
            },
            orderBy: {
              number: "desc",
            },
          },
        },
      })

      if (!agent) {
        return c.json({ error: t(locale, "agents.not_found") }, 404)
      }

      return c.json(agent satisfies AgentDetailResponse)
    } catch {
      return c.json({ error: t(locale, "agents.load_failed") }, 500)
    }
  }
)

agentRoutes.get(
  "/:id/config",
  requireOrganization,
  validator("param", agentIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id: agentId } = c.req.valid("param")

    try {
      const agent = await db.query.agentsTable.findFirst({
        where: {
          id: agentId,
          organizationId,
        },
        columns: {
          config: true,
        },
      })

      if (!agent) {
        return c.json({ error: t(locale, "agents.not_found") }, 404)
      }

      return c.json(agent.config satisfies AgentConfigResponse)
    } catch {
      return c.json({ error: t(locale, "agents.load_config_failed") }, 500)
    }
  }
)

agentRoutes.patch(
  "/:id/name",
  requireOrganization,
  requirePermission({ agent: ["update"] }),
  validator("param", agentIdParamsSchema),
  validator("json", updateAgentNameRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id: agentId } = c.req.valid("param")

    try {
      const payload = c.req.valid("json")

      const [agent] = await db
        .update(agentsTable)
        .set({
          updatedAt: new Date(),
          name: payload.name,
        })
        .where(
          and(
            eq(agentsTable.id, agentId),
            eq(agentsTable.organizationId, organizationId)
          )
        )
        .returning({
          id: agentsTable.id,
          name: agentsTable.name,
          createdAt: agentsTable.createdAt,
          updatedAt: agentsTable.updatedAt,
        })

      if (!agent) {
        return c.json({ error: t(locale, "agents.not_found") }, 404)
      }

      return c.json(agent satisfies UpdateAgentNameResponse)
    } catch {
      return c.json({ error: t(locale, "agents.update_name_failed") }, 500)
    }
  }
)

agentRoutes.patch(
  "/:id/config",
  requireOrganization,
  requirePermission({ agent: ["update"] }),
  validator("param", agentIdParamsSchema),
  validator("json", updateAgentConfigRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id: agentId } = c.req.valid("param")

    try {
      const payload = c.req.valid("json")

      const [agent] = await db
        .update(agentsTable)
        .set({
          updatedAt: new Date(),
          config: payload.config,
        })
        .where(
          and(
            eq(agentsTable.id, agentId),
            eq(agentsTable.organizationId, organizationId)
          )
        )
        .returning({
          config: agentsTable.config,
        })

      if (!agent) {
        return c.json({ error: t(locale, "agents.not_found") }, 404)
      }

      return c.json(agent.config satisfies AgentConfigResponse)
    } catch {
      return c.json({ error: t(locale, "agents.update_config_failed") }, 500)
    }
  }
)

agentRoutes.delete(
  "/:id",
  requireOrganization,
  requirePermission({ agent: ["delete"] }),
  validator("param", agentIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id: agentId } = c.req.valid("param")

    try {
      const [deletedAgent] = await db
        .delete(agentsTable)
        .where(
          and(
            eq(agentsTable.id, agentId),
            eq(agentsTable.organizationId, organizationId)
          )
        )
        .returning({
          id: agentsTable.id,
        })

      if (!deletedAgent) {
        return c.json({ error: t(locale, "agents.not_found") }, 404)
      }

      return c.json(deletedAgent satisfies DeleteAgentResponse)
    } catch {
      return c.json({ error: t(locale, "agents.delete_failed") }, 500)
    }
  }
)

agentRoutes.get(
  "/:id/versions",
  requireOrganization,
  validator("param", agentIdParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id: agentId } = c.req.valid("param")

    try {
      const agent = await db.query.agentsTable.findFirst({
        where: {
          id: agentId,
          organizationId,
        },
        columns: {
          id: true,
        },
        with: {
          versions: {
            columns: {
              agentId: false,
              config: false,
            },
            orderBy: {
              number: "desc",
            },
          },
        },
      })

      if (!agent) {
        return c.json({ error: t(locale, "agents.not_found") }, 404)
      }

      return c.json(agent.versions satisfies AgentVersionsListResponse)
    } catch {
      return c.json({ error: t(locale, "agents.list_versions_failed") }, 404)
    }
  }
)

agentRoutes.get(
  "/:id/versions/:number/config",
  requireOrganization,
  validator("param", agentVersionParamsSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id: agentId, number: versionNumber } = c.req.valid("param")

    try {
      const version = await db.query.agentVersionsTable.findFirst({
        columns: {
          config: true,
        },
        where: {
          agentId,
          number: versionNumber,
          agent: {
            organizationId,
          },
        },
      })

      if (!version) {
        return c.json({ error: t(locale, "agents.version_not_found") }, 404)
      }

      return c.json(version.config satisfies AgentVersionConfigResponse)
    } catch {
      return c.json(
        { error: t(locale, "agents.load_version_config_failed") },
        500
      )
    }
  }
)

agentRoutes.post(
  "/:id/publish",
  requireOrganization,
  requirePermission({ agent: ["update"] }),
  validator("param", agentIdParamsSchema),
  validator("json", publishAgentRequestSchema),
  async (c) => {
    const locale = c.get("locale")
    const organizationId = c.get("organizationId")
    const { id: agentId } = c.req.valid("param")

    try {
      const payload = c.req.valid("json")

      const publishedVersion = await db.transaction(async (tx) => {
        const agent = await tx.query.agentsTable.findFirst({
          where: {
            id: agentId,
            organizationId,
          },
        })

        if (!agent) {
          return null
        }

        const latestVersion = await tx.query.agentVersionsTable.findFirst({
          where: {
            agentId,
          },
          columns: {
            number: true,
          },
          orderBy: {
            number: "desc",
          },
        })

        const nextNumber = (latestVersion?.number ?? 0) + 1

        const [version] = await tx
          .insert(agentVersionsTable)
          .values({
            id: crypto.randomUUID(),
            agentId,
            number: nextNumber,
            name: payload.name,
            description: payload.description,
            config: agent.config,
          })
          .returning({
            id: agentVersionsTable.id,
            number: agentVersionsTable.number,
            name: agentVersionsTable.name,
            description: agentVersionsTable.description,
            publishedAt: agentVersionsTable.publishedAt,
            createdAt: agentVersionsTable.createdAt,
          })

        return version
      })

      if (!publishedVersion) {
        return c.json({ error: t(locale, "agents.not_found") }, 404)
      }

      return c.json(publishedVersion satisfies AgentVersionResponse, 201)
    } catch {
      return c.json({ error: t(locale, "agents.publish_failed") }, 500)
    }
  }
)
