ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(30) NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS "admin_restrictions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "feature" varchar(50) NOT NULL,
  "is_restricted" boolean DEFAULT true NOT NULL,
  "reason" text,
  "expires_at" timestamp with time zone,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_restrictions_user_feature_idx" ON "admin_restrictions" ("user_id", "feature");
CREATE INDEX IF NOT EXISTS "admin_restrictions_user_active_idx" ON "admin_restrictions" ("user_id", "is_restricted");
CREATE INDEX IF NOT EXISTS "admin_restrictions_feature_idx" ON "admin_restrictions" ("feature");

CREATE TABLE IF NOT EXISTS "admin_moderation_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "action" varchar(80) NOT NULL,
  "target_type" varchar(80) NOT NULL,
  "target_id" text NOT NULL,
  "reason" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_moderation_actions_target_idx" ON "admin_moderation_actions" ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "admin_moderation_actions_admin_created_at_idx" ON "admin_moderation_actions" ("admin_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "admin_moderation_actions_action_created_at_idx" ON "admin_moderation_actions" ("action", "created_at");
