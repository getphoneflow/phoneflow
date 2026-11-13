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
import type { KnowledgeBaseDocumentStatus } from "@workspace/shared/api/knowledge-base/types"

export const knowledgeBaseDocumentsTable = pgTable(
  "knowledge_base_documents",
  {
    id: uuid().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    status: text().$type<KnowledgeBaseDocumentStatus>().notNull(),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("knowledge_base_documents_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  ]
)
