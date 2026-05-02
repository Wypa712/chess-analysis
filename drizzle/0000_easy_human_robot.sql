CREATE TYPE "public"."analysis_language" AS ENUM('uk');--> statement-breakpoint
CREATE TYPE "public"."chess_platform" AS ENUM('chess_com', 'lichess');--> statement-breakpoint
CREATE TYPE "public"."game_result" AS ENUM('win', 'loss', 'draw');--> statement-breakpoint
CREATE TYPE "public"."move_classification" AS ENUM('brilliant', 'best', 'good', 'inaccuracy', 'mistake', 'blunder');--> statement-breakpoint
CREATE TYPE "public"."player_color" AS ENUM('white', 'black');--> statement-breakpoint
CREATE TYPE "public"."time_control_category" AS ENUM('bullet', 'blitz', 'rapid', 'classical', 'correspondence', 'unknown');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "auth_accounts_provider_account_unique" UNIQUE("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "auth_verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "chess_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "chess_platform" NOT NULL,
	"username" text NOT NULL,
	"normalized_username" text NOT NULL,
	"profile_url" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chess_accounts_user_platform_username_unique" UNIQUE("user_id","platform","normalized_username")
);
--> statement-breakpoint
CREATE TABLE "engine_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"engine_name" text NOT NULL,
	"engine_version" text,
	"profile_key" text NOT NULL,
	"depth" integer,
	"time_ms_per_position" integer,
	"analysis_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engine_analyses_game_profile_unique" UNIQUE("game_id","profile_key")
);
--> statement-breakpoint
CREATE TABLE "game_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"llm_model" text NOT NULL,
	"language" "analysis_language" NOT NULL,
	"schema_version" integer NOT NULL,
	"input_hash" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"analysis_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chess_account_id" uuid NOT NULL,
	"platform_game_id" text NOT NULL,
	"source_url" text,
	"pgn" text NOT NULL,
	"result" "game_result" NOT NULL,
	"color" "player_color" NOT NULL,
	"opponent" text NOT NULL,
	"opponent_rating" integer,
	"player_rating" integer,
	"opening_name" text,
	"time_control" text,
	"time_control_category" time_control_category NOT NULL,
	"rated" boolean,
	"played_at" timestamp with time zone NOT NULL,
	"move_count" integer NOT NULL,
	"raw_metadata" jsonb,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_account_platform_id_unique" UNIQUE("chess_account_id","platform_game_id"),
	CONSTRAINT "games_move_count_non_negative" CHECK ("games"."move_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "group_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_ids" uuid[] NOT NULL,
	"llm_model" text NOT NULL,
	"language" "analysis_language" NOT NULL,
	"schema_version" integer NOT NULL,
	"input_hash" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"analysis_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"games_count" integer NOT NULL,
	"period_days" integer NOT NULL,
	"max_games" integer NOT NULL,
	"llm_model" text NOT NULL,
	"language" "analysis_language" NOT NULL,
	"schema_version" integer NOT NULL,
	"analysis_json" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_summaries_games_count_min" CHECK ("player_summaries"."games_count" >= 5),
	CONSTRAINT "player_summaries_period_days_valid" CHECK ("player_summaries"."period_days" IN (7, 30, 90)),
	CONSTRAINT "player_summaries_max_games_valid" CHECK ("player_summaries"."max_games" IN (25, 50, 100))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"email_verified" timestamp with time zone,
	"name" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chess_accounts" ADD CONSTRAINT "chess_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engine_analyses" ADD CONSTRAINT "engine_analyses_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_analyses" ADD CONSTRAINT "game_analyses_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_chess_account_id_chess_accounts_id_fk" FOREIGN KEY ("chess_account_id") REFERENCES "public"."chess_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_analyses" ADD CONSTRAINT "group_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_summaries" ADD CONSTRAINT "player_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "chess_accounts_user_platform_idx" ON "chess_accounts" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "engine_analyses_game_id_idx" ON "engine_analyses" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_analyses_game_created_idx" ON "game_analyses" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE INDEX "game_analyses_game_language_idx" ON "game_analyses" USING btree ("game_id","language");--> statement-breakpoint
CREATE INDEX "games_account_played_at_idx" ON "games" USING btree ("chess_account_id","played_at");--> statement-breakpoint
CREATE INDEX "games_account_result_idx" ON "games" USING btree ("chess_account_id","result");--> statement-breakpoint
CREATE INDEX "games_account_time_control_idx" ON "games" USING btree ("chess_account_id","time_control_category");--> statement-breakpoint
CREATE INDEX "group_analyses_user_created_idx" ON "group_analyses" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "player_summaries_user_generated_idx" ON "player_summaries" USING btree ("user_id","generated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");