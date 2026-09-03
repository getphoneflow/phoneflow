import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import { organization } from "@workspace/db/schema/auth"

export const creditPurchasesTable = pgTable(
  "credit_purchases",
  {
    id: uuid().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    amount: numeric({ precision: 12, scale: 6 }).notNull(),
    packId: text("pack_id").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("credit_purchases_stripe_checkout_session_uidx").on(
      table.stripeCheckoutSessionId
    ),
    index("credit_purchases_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  ]
)
