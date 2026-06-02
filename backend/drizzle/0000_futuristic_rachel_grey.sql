CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"resume_text" text NOT NULL,
	"jd_text" text NOT NULL,
	"company_name" text,
	"confidence_score" integer NOT NULL,
	"gap_analysis_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"date" date NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"last_429_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "application_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"squad_id" uuid,
	"company_name" text NOT NULL,
	"role_title" text NOT NULL,
	"job_url" text,
	"is_shadowbanned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_type" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_wins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_title" varchar(100) NOT NULL,
	"company_name" varchar(100),
	"search_duration_weeks" integer,
	"message" text,
	"likes_count" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requester_note" text,
	"requester_role" varchar(100),
	"requester_learning" varchar(100),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "connections_status_check" CHECK ("connections"."status" in ('pending', 'accepted', 'declined')),
	CONSTRAINT "connections_no_self_connection_check" CHECK ("connections"."requester_id" <> "connections"."recipient_id")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "follows_no_self_follow_check" CHECK ("follows"."follower_id" <> "follows"."following_id")
);
--> statement-breakpoint
CREATE TABLE "generated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"content_type" text NOT NULL,
	"content_text" text NOT NULL,
	"job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(40) NOT NULL,
	"actor_id" uuid,
	"entity_id" uuid,
	"entity_type" varchar(30),
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in ('new_follower', 'new_connection_request', 'connection_accepted', 'post_like', 'post_comment', 'job_match_alert', 'squad_ping', 'squad_goal_reached', 'squad_synergy_burst'))
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_type" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"analysis_id" uuid,
	"job_data" jsonb,
	"career_update_type" varchar(30),
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "posts_post_type_check" CHECK ("posts"."post_type" in ('career_update', 'job_tip', 'job_share', 'analysis_share', 'question')),
	CONSTRAINT "posts_career_update_type_check" CHECK ("posts"."career_update_type" is null or "posts"."career_update_type" in ('got_hired', 'got_promoted', 'started_learning', 'completed_course', 'new_project'))
);
--> statement-breakpoint
CREATE TABLE "profile_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"settings_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_job_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"company" varchar(200) NOT NULL,
	"location" varchar(200),
	"job_type" varchar(50),
	"stipend" varchar(100),
	"salary" varchar(100),
	"apply_url" text NOT NULL,
	"source" varchar(100) NOT NULL,
	"ghost_score" integer,
	"posted_at" timestamp with time zone,
	"cached_at" timestamp with time zone DEFAULT now(),
	"search_count" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token_jti" text NOT NULL,
	"refresh_token_jti" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "rejection_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"role_title" text NOT NULL,
	"job_url" text,
	"stage_rejected" text NOT NULL,
	"is_shadowbanned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rejection_logs_stage_rejected_check" CHECK ("rejection_logs"."stage_rejected" in ('resume', 'first_round', 'hiring_manager', 'final'))
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_source" text NOT NULL,
	"job_title" text NOT NULL,
	"company" text NOT NULL,
	"url" text NOT NULL,
	"stipend" text,
	"match_percent" integer,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squad_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL,
	"user_id" uuid,
	"activity_type" varchar(30) NOT NULL,
	"event_date" date NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "squad_activities_activity_type_check" CHECK ("squad_activities"."activity_type" in ('member_joined', 'apps_logged', 'squad_ping', 'rejection_logged'))
);
--> statement-breakpoint
CREATE TABLE "squad_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"anonymous_alias" text NOT NULL,
	"apps_sent_this_week" integer DEFAULT 0 NOT NULL,
	"interviews_this_week" integer DEFAULT 0 NOT NULL,
	"archetype_role" varchar(20) DEFAULT null,
	"sparks_sent_this_week" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squad_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL,
	"sender_member_id" uuid,
	"message_type" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"milestone_phase" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "squad_messages_message_type_check" CHECK ("squad_messages"."message_type" in ('text', 'quick_signal', 'sticker_drop', 'signal_drop', 'accolade', 'system'))
);
--> statement-breakpoint
CREATE TABLE "squads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_name" text NOT NULL,
	"weekly_goal" integer DEFAULT 40 NOT NULL,
	"week_of" date NOT NULL,
	"goal_rewarded_at" timestamp with time zone,
	"synergy_score" integer DEFAULT 0 NOT NULL,
	"synergy_burst_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_educations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"institution" text NOT NULL,
	"degree" text NOT NULL,
	"field_of_study" text NOT NULL,
	"graduation_year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"username" varchar(50) NOT NULL,
	"headline" varchar(120),
	"location" varchar(100),
	"skills" text[],
	"is_public" boolean DEFAULT true,
	"follower_count" integer DEFAULT 0,
	"following_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"auth_provider" text NOT NULL,
	"password_hash" text,
	"google_subject" text,
	"role" text DEFAULT 'user' NOT NULL,
	"resilience_xp" integer DEFAULT 0 NOT NULL,
	"last_xp_decay_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_logs" ADD CONSTRAINT "application_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_logs" ADD CONSTRAINT "application_logs_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_wins" ADD CONSTRAINT "community_wins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_settings" ADD CONSTRAINT "profile_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejection_logs" ADD CONSTRAINT "rejection_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_activities" ADD CONSTRAINT "squad_activities_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_activities" ADD CONSTRAINT "squad_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_messages" ADD CONSTRAINT "squad_messages_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_messages" ADD CONSTRAINT "squad_messages_sender_member_id_squad_members_id_fk" FOREIGN KEY ("sender_member_id") REFERENCES "public"."squad_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_educations" ADD CONSTRAINT "user_educations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_experiences" ADD CONSTRAINT "user_experiences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_user_id_idx" ON "analyses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_usage_source_name_date_idx" ON "api_usage" USING btree ("source_name","date");--> statement-breakpoint
CREATE INDEX "application_logs_user_id_idx" ON "application_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "application_logs_user_id_created_at_idx" ON "application_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "application_logs_squad_id_idx" ON "application_logs" USING btree ("squad_id");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_id_token_type_idx" ON "auth_tokens" USING btree ("user_id","token_type");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_token_hash_idx" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_likes_comment_id_user_id_idx" ON "comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "community_wins_is_visible_created_at_idx" ON "community_wins" USING btree ("is_visible","created_at");--> statement-breakpoint
CREATE INDEX "community_wins_is_visible_scheduled_at_idx" ON "community_wins" USING btree ("is_visible","scheduled_at");--> statement-breakpoint
CREATE INDEX "community_wins_user_id_idx" ON "community_wins" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connections_requester_id_recipient_id_idx" ON "connections" USING btree ("requester_id","recipient_id");--> statement-breakpoint
CREATE INDEX "connections_recipient_id_status_idx" ON "connections" USING btree ("recipient_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_follower_id_following_id_idx" ON "follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "generated_content_analysis_id_idx" ON "generated_content" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "post_comments_post_id_created_at_idx" ON "post_comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_user_id_created_at_idx" ON "posts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_is_visible_created_at_idx" ON "posts" USING btree ("is_visible","created_at");--> statement-breakpoint
CREATE INDEX "posts_is_visible_scheduled_at_idx" ON "posts" USING btree ("is_visible","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_settings_user_id_idx" ON "profile_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "public_job_cache_job_id_idx" ON "public_job_cache" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "public_job_cache_search_count_cached_at_idx" ON "public_job_cache" USING btree ("search_count","cached_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_access_token_jti_idx" ON "refresh_tokens" USING btree ("access_token_jti");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_refresh_token_jti_idx" ON "refresh_tokens" USING btree ("refresh_token_jti");--> statement-breakpoint
CREATE INDEX "rejection_logs_user_id_idx" ON "rejection_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_jobs_user_id_idx" ON "saved_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "squad_activities_squad_id_created_at_idx" ON "squad_activities" USING btree ("squad_id","created_at");--> statement-breakpoint
CREATE INDEX "squad_activities_squad_id_user_id_event_date_idx" ON "squad_activities" USING btree ("squad_id","user_id","event_date");--> statement-breakpoint
CREATE INDEX "squad_members_squad_id_idx" ON "squad_members" USING btree ("squad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "squad_members_user_id_idx" ON "squad_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "squad_members_squad_id_user_id_idx" ON "squad_members" USING btree ("squad_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "squad_members_squad_id_alias_idx" ON "squad_members" USING btree ("squad_id","anonymous_alias");--> statement-breakpoint
CREATE INDEX "squad_messages_squad_id_created_at_idx" ON "squad_messages" USING btree ("squad_id","created_at");--> statement-breakpoint
CREATE INDEX "squad_messages_squad_id_phase_idx" ON "squad_messages" USING btree ("squad_id","milestone_phase");--> statement-breakpoint
CREATE INDEX "user_educations_user_id_idx" ON "user_educations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_experiences_user_id_idx" ON "user_experiences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_experiences_user_id_start_date_idx" ON "user_experiences" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_username_idx" ON "user_profiles" USING btree ("username");