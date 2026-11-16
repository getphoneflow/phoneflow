CREATE TABLE "call_extraction_agents" (
	"call_extraction_id" uuid,
	"agent_id" uuid,
	CONSTRAINT "call_extraction_agents_pkey" PRIMARY KEY("call_extraction_id","agent_id")
);
--> statement-breakpoint
CREATE TABLE "call_extractions" (
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"schema" json NOT NULL,
	"description" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "extraction" json;--> statement-breakpoint
CREATE INDEX "call_extraction_agents_agent_id_idx" ON "call_extraction_agents" ("agent_id");--> statement-breakpoint
CREATE INDEX "call_extractions_organization_id_created_at_idx" ON "call_extractions" ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "call_extraction_agents" ADD CONSTRAINT "call_extraction_agents_wWRkEOSIxpB2_fkey" FOREIGN KEY ("call_extraction_id") REFERENCES "call_extractions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "call_extraction_agents" ADD CONSTRAINT "call_extraction_agents_agent_id_agents_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "call_extractions" ADD CONSTRAINT "call_extractions_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;