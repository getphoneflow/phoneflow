CREATE TABLE "credit_purchases" (
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"amount" numeric(12,6) NOT NULL,
	"stripe_checkout_session_id" text CONSTRAINT "credit_purchases_stripe_checkout_session_uidx" UNIQUE,
	"stripe_payment_intent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "credit_balance" numeric(12,6) DEFAULT '10' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
CREATE INDEX "credit_purchases_organization_id_created_at_idx" ON "credit_purchases" ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;