ALTER TABLE "auth_accounts" DROP CONSTRAINT "auth_accounts_userId_users_id_fk";--> statement-breakpoint
DROP INDEX "auth_accounts_user_id_idx";--> statement-breakpoint
ALTER TABLE "auth_accounts" DROP CONSTRAINT "auth_accounts_provider_account_unique";--> statement-breakpoint
ALTER TABLE "auth_accounts" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "auth_accounts" RENAME COLUMN "providerAccountId" TO "provider_account_id";--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_provider_account_unique" UNIQUE("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "auth_verification_tokens" ADD CONSTRAINT "auth_verification_tokens_identifier_token_pk" PRIMARY KEY ("identifier","token");--> statement-breakpoint
ALTER TABLE "group_analyses" ADD CONSTRAINT "group_analyses_game_ids_count" CHECK (cardinality("game_ids") BETWEEN 5 AND 30);
