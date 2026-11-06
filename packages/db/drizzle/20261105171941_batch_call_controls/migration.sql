DROP INDEX "batch_call_recipients_batch_call_id_idx";--> statement-breakpoint
ALTER TABLE "batch_call_recipients" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "batch_call_recipients" ADD COLUMN "call_id" uuid;--> statement-breakpoint
ALTER TABLE "batch_call_recipients" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "batch_call_recipients" ADD COLUMN "dialed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "batch_calls" ADD COLUMN "pause_reason" text;--> statement-breakpoint
ALTER TABLE "batch_calls" ADD COLUMN "max_concurrent_calls" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "batch_calls" ADD COLUMN "schedule" json;--> statement-breakpoint
CREATE INDEX "batch_call_recipients_batch_call_id_status_idx" ON "batch_call_recipients" ("batch_call_id","status");--> statement-breakpoint
ALTER TABLE "batch_call_recipients" ADD CONSTRAINT "batch_call_recipients_call_id_calls_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE SET NULL;--> statement-breakpoint
-- A scheduled batch past its time had its job fail or die mid-loop, so some of its recipients may have been dialed.
UPDATE "batch_calls" SET "status" = 'triggered' WHERE "status" = 'scheduled' AND ("scheduled_at" IS NULL OR "scheduled_at" <= now());--> statement-breakpoint
-- Every recipient of an already dispatched batch gets a terminal status so the dispatcher never dials them again. Failed placements left no call row and were not recorded anywhere, so a recipient without a call has an unknown outcome. Batches still scheduled for the future were never dialed: they keep 'pending' and start when their delayed job fires.
WITH "legacy" AS (
  SELECT "r"."id", "c"."id" AS "call_id", "c"."status" AS "call_status", "c"."started_at"
  FROM "batch_call_recipients" "r"
  JOIN "batch_calls" "b" ON "b"."id" = "r"."batch_call_id" AND "b"."status" = 'triggered'
  LEFT JOIN LATERAL (
    SELECT "calls"."id", "calls"."status", "calls"."started_at"
    FROM "calls"
    WHERE "calls"."batch_call_id" = "r"."batch_call_id" AND "calls"."to_number" = "r"."to_number"
    ORDER BY "calls"."started_at" DESC
    LIMIT 1
  ) "c" ON true
)
UPDATE "batch_call_recipients" SET
  "status" = CASE
    WHEN "legacy"."call_status" = 'completed' THEN 'completed'
    WHEN "legacy"."call_status" = 'no_answer' THEN 'no_answer'
    ELSE 'failed'
  END,
  "call_id" = "legacy"."call_id",
  "dialed_at" = "legacy"."started_at",
  "error" = CASE WHEN "legacy"."call_status" IN ('completed', 'no_answer') THEN NULL ELSE 'unknown_outcome' END
FROM "legacy"
WHERE "batch_call_recipients"."id" = "legacy"."id";
