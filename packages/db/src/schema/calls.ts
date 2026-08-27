import {
  index,
  integer,
  json,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { agentsTable, agentVersionsTable } from "@workspace/db/schema/agents"
import { organization } from "@workspace/db/schema/auth"
import type {
  CallTranscript,
  CallVariableValues,
} from "@workspace/shared/api/calls/types"

export const callsTable = pgTable(
  "calls",
  {
    id: uuid().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agentsTable.id, { onDelete: "cascade" }),
    agentVersionId: uuid("agent_version_id").references(
      () => agentVersionsTable.id,
      { onDelete: "set null" }
    ),
    channel: text("channel").notNull().$type<"web_call" | "phone_call">(),
    direction: text("direction").notNull().$type<"inbound" | "outbound">(),
    status: text("status").notNull().$type<"in_progress" | "completed">(),
    fromNumber: text("from_number"),
    toNumber: text("to_number"),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    durationMs: integer("duration_ms"),
    sttModel: text("stt_model").notNull(),
    llmModel: text("llm_model").notNull(),
    ttsModel: text("tts_model").notNull(),
    sttCost: numeric("stt_cost", { precision: 12, scale: 6 }),
    llmCost: numeric("llm_cost", { precision: 12, scale: 6 }),
    ttsCost: numeric("tts_cost", { precision: 12, scale: 6 }),
    telephonyCost: numeric("telephony_cost", { precision: 12, scale: 6 }),
    platformCost: numeric("platform_cost", { precision: 12, scale: 6 }),
    totalCost: numeric("total_cost", { precision: 12, scale: 6 }),
    livekitRoomName: text("livekit_room_name").notNull(),
    transcript: json().$type<CallTranscript | null>(),
    variables: json().$type<CallVariableValues | null>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("calls_organization_id_started_at_idx").on(
      table.organizationId,
      table.startedAt
    ),
  ]
)
