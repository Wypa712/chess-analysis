-- 0002: Enable RLS + service-role bypass on product tables (Phase 10 security hardening)
-- Auth tables (users, auth_accounts, auth_verification_tokens) were handled in 0001.

ALTER TABLE "public"."chess_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "chess_accounts_service_role_bypass" ON "public"."chess_accounts" TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "games_service_role_bypass" ON "public"."games" TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."engine_analyses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "engine_analyses_service_role_bypass" ON "public"."engine_analyses" TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."game_analyses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "game_analyses_service_role_bypass" ON "public"."game_analyses" TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."group_analyses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "group_analyses_service_role_bypass" ON "public"."group_analyses" TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."player_summaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "player_summaries_service_role_bypass" ON "public"."player_summaries" TO service_role USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."llm_request_locks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "llm_request_locks_service_role_bypass" ON "public"."llm_request_locks" TO service_role USING (true) WITH CHECK (true);
