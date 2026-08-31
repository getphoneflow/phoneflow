ALTER TABLE "batch_calls" DROP CONSTRAINT "batch_calls_phone_number_id_phone_numbers_id_fkey";--> statement-breakpoint
ALTER TABLE "batch_calls" DROP CONSTRAINT "batch_calls_agent_id_agents_id_fkey";--> statement-breakpoint
ALTER TABLE "calls" DROP CONSTRAINT "calls_agent_id_agents_id_fkey";