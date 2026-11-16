import {
  index,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { agentsTable } from "@workspace/db/schema/agents"
import { organization } from "@workspace/db/schema/auth"
import type { CallExtractionSchema } from "@workspace/shared/api/call-extractions/types"

export const callExtractionsTable = pgTable(
  "call_extractions",
  {
    id: uuid().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    schema: json().$type<CallExtractionSchema>().notNull(),
    description: text().notNull(),
    model: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("call_extractions_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  ]
)

export const callExtractionAgentsTable = pgTable(
  "call_extraction_agents",
  {
    callExtractionId: uuid("call_extraction_id")
      .notNull()
      .references(() => callExtractionsTable.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agentsTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.callExtractionId, table.agentId] }),
    index("call_extraction_agents_agent_id_idx").on(table.agentId),
  ]
)
