CREATE INDEX "post_likes_user_id_created_at_idx" ON "post_likes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "win_likes_user_id_created_at_idx" ON "win_likes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "post_comments_user_id_created_at_idx" ON "post_comments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "post_comments_user_id_parent_id_created_at_idx" ON "post_comments" USING btree ("user_id","parent_id","created_at");
