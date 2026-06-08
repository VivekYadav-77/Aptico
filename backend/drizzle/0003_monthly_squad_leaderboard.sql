CREATE TABLE "squad_score_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL,
	"user_id" uuid,
	"period" varchar(7) NOT NULL,
	"event_date" date NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"source_type" varchar(40) NOT NULL,
	"source_id" text NOT NULL,
	"raw_points" integer DEFAULT 0 NOT NULL,
	"eligible_points" integer DEFAULT 0 NOT NULL,
	"spam_status" varchar(30) DEFAULT 'clear' NOT NULL,
	"reason" varchar(80) DEFAULT 'eligible' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squad_monthly_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL,
	"period" varchar(7) NOT NULL,
	"eligible_points" integer DEFAULT 0 NOT NULL,
	"raw_points" integer DEFAULT 0 NOT NULL,
	"spam_penalty" integer DEFAULT 0 NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"suspicious_event_count" integer DEFAULT 0 NOT NULL,
	"active_member_count" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"review_status" varchar(30) DEFAULT 'active' NOT NULL,
	"published_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squad_monthly_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL,
	"period" varchar(7) NOT NULL,
	"rank" integer NOT NULL,
	"sticker_id" varchar(80) NOT NULL,
	"title" varchar(120) NOT NULL,
	"xp_bonus" integer DEFAULT 0 NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "squad_score_events" ADD CONSTRAINT "squad_score_events_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "squad_score_events" ADD CONSTRAINT "squad_score_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "squad_monthly_scores" ADD CONSTRAINT "squad_monthly_scores_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "squad_monthly_rewards" ADD CONSTRAINT "squad_monthly_rewards_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "squad_monthly_rewards" ADD CONSTRAINT "squad_monthly_rewards_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "squad_score_events_squad_period_idx" ON "squad_score_events" USING btree ("squad_id","period");
--> statement-breakpoint
CREATE INDEX "squad_score_events_user_date_type_idx" ON "squad_score_events" USING btree ("user_id","event_date","event_type");
--> statement-breakpoint
CREATE INDEX "squad_score_events_event_type_period_idx" ON "squad_score_events" USING btree ("event_type","period");
--> statement-breakpoint
CREATE UNIQUE INDEX "squad_score_events_source_idx" ON "squad_score_events" USING btree ("source_type","source_id");
--> statement-breakpoint
CREATE INDEX "squad_monthly_scores_period_rank_idx" ON "squad_monthly_scores" USING btree ("period","rank");
--> statement-breakpoint
CREATE UNIQUE INDEX "squad_monthly_scores_squad_period_idx" ON "squad_monthly_scores" USING btree ("squad_id","period");
--> statement-breakpoint
CREATE UNIQUE INDEX "squad_monthly_rewards_period_rank_idx" ON "squad_monthly_rewards" USING btree ("period","rank");
--> statement-breakpoint
CREATE UNIQUE INDEX "squad_monthly_rewards_squad_period_idx" ON "squad_monthly_rewards" USING btree ("squad_id","period");
