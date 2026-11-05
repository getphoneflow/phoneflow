import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { organization, user } from "@workspace/db/schema/auth"
import { callsTable } from "@workspace/db/schema/calls"

export const doNotCallNumbersTable = pgTable(
  "do_not_call_numbers",
  {
    id: uuid().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    source: text("source").notNull().$type<"manual" | "import" | "call">(),
    reason: text("reason"),
    callId: uuid("call_id").references(() => callsTable.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("do_not_call_numbers_organization_id_number_uidx").on(
      table.organizationId,
      table.number
    ),
    index("do_not_call_numbers_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  ]
)
