CREATE TABLE "do_not_call_numbers" (
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"number" text NOT NULL,
	"source" text NOT NULL,
	"reason" text,
	"call_id" uuid,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "batch_calls" ADD COLUMN "do_not_call_skipped_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "do_not_call_numbers_organization_id_number_uidx" ON "do_not_call_numbers" ("organization_id","number");--> statement-breakpoint
CREATE INDEX "do_not_call_numbers_organization_id_created_at_idx" ON "do_not_call_numbers" ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "do_not_call_numbers" ADD CONSTRAINT "do_not_call_numbers_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "do_not_call_numbers" ADD CONSTRAINT "do_not_call_numbers_call_id_calls_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "do_not_call_numbers" ADD CONSTRAINT "do_not_call_numbers_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
-- Admin roles are seeded per organization when it is created, so existing ones need the new resource.
UPDATE "organization_role" SET "permission" = ("permission"::jsonb || '{"doNotCall":["create","delete"]}'::jsonb)::text WHERE "role" = 'admin';