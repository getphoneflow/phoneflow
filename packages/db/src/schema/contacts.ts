import { sql } from "drizzle-orm"
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { organization } from "@workspace/db/schema/auth"

export const contactsTable = pgTable(
  "contacts",
  {
    id: uuid().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    phoneNumber: text("phone_number"),
    externalId: text("external_id"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    callCount: integer("call_count").notNull().default(0),
    totalDurationMs: integer("total_duration_ms").notNull().default(0),
    firstCallAt: timestamp("first_call_at", {
      withTimezone: true,
      mode: "date",
    }),
    latestCallAt: timestamp("latest_call_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("contacts_organization_id_latest_call_at_idx").on(
      table.organizationId,
      table.latestCallAt
    ),
    index("contacts_organization_id_first_call_at_idx").on(
      table.organizationId,
      table.firstCallAt
    ),
    index("contacts_organization_id_call_count_idx").on(
      table.organizationId,
      table.callCount
    ),
    index("contacts_organization_id_total_duration_ms_idx").on(
      table.organizationId,
      table.totalDurationMs
    ),
    uniqueIndex("contacts_organization_id_phone_number_uidx")
      .on(table.organizationId, table.phoneNumber)
      .where(sql`${table.phoneNumber} is not null`),
    uniqueIndex("contacts_organization_id_external_id_uidx")
      .on(table.organizationId, table.externalId)
      .where(sql`${table.externalId} is not null`),
  ]
)
