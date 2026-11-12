CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"s3_key" text,
	"file_name" text,
	"content_type" text,
	"byte_size" integer NOT NULL,
	"extracted_markdown" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "knowledge_documents_organization_id_created_at_idx" ON "knowledge_documents" ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
UPDATE "organization_role"
SET "permission" = (
  jsonb_set("permission"::jsonb, '{knowledgeBase}', '["create","delete"]', true)
)::text
WHERE "role" = 'admin'
  AND NOT ("permission"::jsonb ? 'knowledgeBase');