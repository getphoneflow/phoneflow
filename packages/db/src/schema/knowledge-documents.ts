import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { organization } from "@workspace/db/schema/auth"

export const knowledgeDocumentsTable = pgTable(
  "knowledge_documents",
  {
    id: uuid().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    source: text().notNull(),
    status: text().notNull(),
    error: text(),
    s3Key: text("s3_key"),
    fileName: text("file_name"),
    contentType: text("content_type"),
    byteSize: integer("byte_size").notNull(),
    extractedMarkdown: text("extracted_markdown"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("knowledge_documents_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  ]
)
