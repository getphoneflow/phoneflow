CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"phone_number" text,
	"external_id" text,
	"first_name" text,
	"last_name" text,
	"call_count" integer DEFAULT 0 NOT NULL,
	"total_duration_ms" integer DEFAULT 0 NOT NULL,
	"first_call_at" timestamp with time zone,
	"latest_call_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
CREATE INDEX "calls_organization_id_contact_id_started_at_idx" ON "calls" ("organization_id","contact_id","started_at");--> statement-breakpoint
CREATE INDEX "contacts_organization_id_latest_call_at_idx" ON "contacts" ("organization_id","latest_call_at");--> statement-breakpoint
CREATE INDEX "contacts_organization_id_first_call_at_idx" ON "contacts" ("organization_id","first_call_at");--> statement-breakpoint
CREATE INDEX "contacts_organization_id_call_count_idx" ON "contacts" ("organization_id","call_count");--> statement-breakpoint
CREATE INDEX "contacts_organization_id_total_duration_ms_idx" ON "contacts" ("organization_id","total_duration_ms");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_organization_id_phone_number_uidx" ON "contacts" ("organization_id","phone_number") WHERE "phone_number" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_organization_id_external_id_uidx" ON "contacts" ("organization_id","external_id") WHERE "external_id" is not null;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;