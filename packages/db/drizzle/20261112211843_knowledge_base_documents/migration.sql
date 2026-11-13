CREATE TABLE "knowledge_base_documents" (
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" text NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "knowledge_base_documents_organization_id_created_at_idx" ON "knowledge_base_documents" ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "knowledge_base_documents" ADD CONSTRAINT "knowledge_base_documents_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;