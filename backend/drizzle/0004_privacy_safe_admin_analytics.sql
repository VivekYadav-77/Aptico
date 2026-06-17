CREATE TABLE IF NOT EXISTS "visitor_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "visitor_id" varchar(80) NOT NULL,
  "session_key" varchar(80) NOT NULL,
  "user_id" uuid,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ip_hash" text,
  "user_agent_hash" text,
  "device_category" varchar(30),
  "browser_name" varchar(60),
  "country" varchar(80),
  "region" varchar(120),
  "city" varchar(120),
  "analytics_opt_out" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" varchar(60) NOT NULL,
  "user_id" uuid,
  "visitor_id" varchar(80),
  "session_key" varchar(80),
  "path" text,
  "referrer" text,
  "source" varchar(120),
  "device_category" varchar(30),
  "browser_name" varchar(60),
  "country" varchar(80),
  "region" varchar(120),
  "city" varchar(120),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "analytics_daily_aggregates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "date" date NOT NULL,
  "event_type" varchar(60) NOT NULL,
  "path" text DEFAULT '' NOT NULL,
  "country" varchar(80) DEFAULT 'Unknown' NOT NULL,
  "event_count" integer DEFAULT 0 NOT NULL,
  "unique_visitors" integer DEFAULT 0 NOT NULL,
  "unique_users" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_user_id" uuid,
  "action" varchar(80) NOT NULL,
  "target_type" varchar(80),
  "target_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_users_id_fk"
    FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "visitor_sessions_visitor_id_idx" ON "visitor_sessions" ("visitor_id");
CREATE UNIQUE INDEX IF NOT EXISTS "visitor_sessions_session_key_idx" ON "visitor_sessions" ("session_key");
CREATE INDEX IF NOT EXISTS "visitor_sessions_user_id_idx" ON "visitor_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "visitor_sessions_last_seen_at_idx" ON "visitor_sessions" ("last_seen_at");

CREATE INDEX IF NOT EXISTS "analytics_events_event_type_created_at_idx" ON "analytics_events" ("event_type", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_created_at_idx" ON "analytics_events" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_visitor_id_created_at_idx" ON "analytics_events" ("visitor_id", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_created_at_idx" ON "analytics_events" ("created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "analytics_daily_aggregates_unique_idx"
  ON "analytics_daily_aggregates" ("date", "event_type", "path", "country");

CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_user_id_created_at_idx" ON "admin_audit_logs" ("admin_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs" ("action", "created_at");
