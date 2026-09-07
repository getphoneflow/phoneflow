ALTER TABLE "organization" ADD COLUMN "auto_reload_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "auto_reload_amount" numeric(12,6) DEFAULT '20' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "auto_reload_threshold" numeric(12,6) DEFAULT '10' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "auto_reload_in_flight" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_stripe_payment_intent_uidx" UNIQUE("stripe_payment_intent_id");