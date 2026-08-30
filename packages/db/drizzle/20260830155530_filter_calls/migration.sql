CREATE INDEX "calls_organization_id_agent_id_started_at_idx" ON "calls" ("organization_id","agent_id","started_at");--> statement-breakpoint
CREATE INDEX "calls_organization_id_from_number_started_at_idx" ON "calls" ("organization_id","from_number","started_at");--> statement-breakpoint
CREATE INDEX "calls_organization_id_to_number_started_at_idx" ON "calls" ("organization_id","to_number","started_at");--> statement-breakpoint
CREATE INDEX "calls_organization_id_duration_ms_idx" ON "calls" ("organization_id","duration_ms");--> statement-breakpoint
CREATE INDEX "calls_organization_id_total_cost_idx" ON "calls" ("organization_id","total_cost");