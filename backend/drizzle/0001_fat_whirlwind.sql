CREATE TABLE "post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "win_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"win_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN "likes_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "win_likes" ADD CONSTRAINT "win_likes_win_id_community_wins_id_fk" FOREIGN KEY ("win_id") REFERENCES "public"."community_wins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "win_likes" ADD CONSTRAINT "win_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_likes_post_id_user_id_idx" ON "post_likes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "win_likes_win_id_user_id_idx" ON "win_likes" USING btree ("win_id","user_id");