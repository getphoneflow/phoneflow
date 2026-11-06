import {
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { agentVersionsTable } from "@workspace/db/schema/agents"
import { organization } from "@workspace/db/schema/auth"
import { callsTable } from "@workspace/db/schema/calls"
import type {
  BatchCallPauseReason,
  BatchCallRecipientStatus,
  BatchCallSchedule,
  BatchCallStatus,
} from "@workspace/shared/api/batch-calls/types"

export const batchCallsTable = pgTable(
  "batch_calls",
  {
    id: uuid().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    phoneNumberId: uuid("phone_number_id").notNull(),
    agentId: uuid("agent_id").notNull(),
    agentVersionId: uuid("agent_version_id").references(
      () => agentVersionsTable.id,
      { onDelete: "set null" }
    ),
    status: text("status").notNull().$type<BatchCallStatus>(),
    pauseReason: text("pause_reason").$type<BatchCallPauseReason>(),
    maxConcurrentCalls: integer("max_concurrent_calls").notNull().default(5),
    schedule: json().$type<BatchCallSchedule>(),
    scheduledAt: timestamp("scheduled_at", {
      withTimezone: true,
      mode: "date",
    }),
    totalCount: integer("total_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("batch_calls_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  ]
)

export const batchCallRecipientsTable = pgTable(
  "batch_call_recipients",
  {
    id: uuid().primaryKey(),
    batchCallId: uuid("batch_call_id")
      .notNull()
      .references(() => batchCallsTable.id, { onDelete: "cascade" }),
    toNumber: text("to_number").notNull(),
    variables: json().$type<Record<string, string>>().notNull().default({}),
    status: text("status")
      .notNull()
      .$type<BatchCallRecipientStatus>()
      .default("pending"),
    callId: uuid("call_id").references(() => callsTable.id, {
      onDelete: "set null",
    }),
    error: text("error"),
    dialedAt: timestamp("dialed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("batch_call_recipients_batch_call_id_status_idx").on(
      table.batchCallId,
      table.status
    ),
  ]
)
