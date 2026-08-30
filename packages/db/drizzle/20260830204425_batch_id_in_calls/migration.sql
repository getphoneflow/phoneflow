ALTER TABLE "calls" ADD COLUMN "batch_call_id" uuid;--> statement-breakpoint
CREATE INDEX "calls_batch_call_id_idx" ON "calls" ("batch_call_id");--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_batch_call_id_batch_calls_id_fkey" FOREIGN KEY ("batch_call_id") REFERENCES "batch_calls"("id") ON DELETE SET NULL;