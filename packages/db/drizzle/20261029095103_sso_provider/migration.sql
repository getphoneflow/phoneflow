CREATE TABLE "sso_provider" (
	"id" text PRIMARY KEY,
	"issuer" text NOT NULL,
	"domain" text NOT NULL,
	"oidc_config" text,
	"saml_config" text,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"organization_id" text,
	"domain_verified" boolean DEFAULT false NOT NULL,
	"sso_enforced" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ssoProvider_providerId_uidx" ON "sso_provider" ("provider_id");--> statement-breakpoint
CREATE INDEX "ssoProvider_organizationId_idx" ON "sso_provider" ("organization_id");--> statement-breakpoint
CREATE INDEX "ssoProvider_userId_idx" ON "sso_provider" ("user_id");--> statement-breakpoint
ALTER TABLE "sso_provider" ADD CONSTRAINT "sso_provider_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sso_provider" ADD CONSTRAINT "sso_provider_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;