CREATE TABLE "apikey" (
	"id" text PRIMARY KEY,
	"config_id" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"reference_id" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 60000,
	"rate_limit_max" integer DEFAULT 600,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE INDEX "apikey_configId_idx" ON "apikey" ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "apikey" ("reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "apikey_key_uidx" ON "apikey" ("key");--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_reference_id_organization_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "organization"("id") ON DELETE CASCADE;
--> statement-breakpoint
DO $$
DECLARE
  rec record;
  perm jsonb;
  resource text;
  actions jsonb;
BEGIN
  FOR rec IN
    SELECT id, permission
    FROM organization_role
    WHERE role = 'admin'
  LOOP
    perm := rec.permission::jsonb;
    IF NOT perm ? 'apiKey' THEN
      perm := jsonb_set(
        perm,
        '{apiKey}',
        '["create","read","update","delete"]'::jsonb,
        true
      );
    END IF;
    FOREACH resource IN ARRAY ARRAY['agent', 'phoneNumber', 'calls', 'knowledgeBase', 'callExtraction']
    LOOP
      IF perm ? resource AND jsonb_typeof(perm -> resource) = 'array' AND NOT (perm -> resource) ? 'read' THEN
        actions := (perm -> resource) || '["read"]'::jsonb;
        perm := jsonb_set(perm, ARRAY[resource], actions, true);
      END IF;
    END LOOP;
    UPDATE organization_role
    SET permission = perm::text
    WHERE id = rec.id;
  END LOOP;
END $$;