ALTER TABLE "auth_accounts" DROP CONSTRAINT "auth_accounts_userId_users_id_fk";--> statement-breakpoint
DROP INDEX "auth_accounts_user_id_idx";--> statement-breakpoint
ALTER TABLE "auth_accounts" DROP CONSTRAINT "auth_accounts_provider_account_unique";--> statement-breakpoint
ALTER TABLE "auth_accounts" DROP CONSTRAINT IF EXISTS "auth_accounts_pkey";--> statement-breakpoint
ALTER TABLE "auth_accounts" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "auth_accounts" RENAME COLUMN "providerAccountId" TO "provider_account_id";--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_provider_account_unique" UNIQUE("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "auth_verification_tokens" DROP CONSTRAINT IF EXISTS "auth_verification_tokens_pkey";--> statement-breakpoint
DELETE FROM "auth_verification_tokens" t1 WHERE EXISTS (SELECT 1 FROM "auth_verification_tokens" t2 WHERE t1.identifier = t2.identifier AND t1.token = t2.token AND t1.ctid > t2.ctid);--> statement-breakpoint
ALTER TABLE "auth_verification_tokens" ADD CONSTRAINT "auth_verification_tokens_identifier_token_pk" PRIMARY KEY ("identifier","token");--> statement-breakpoint
ALTER TABLE "group_analyses" ADD CONSTRAINT "group_analyses_game_ids_count" CHECK (cardinality("game_ids") BETWEEN 5 AND 30) NOT VALID;--> statement-breakpoint
DELETE FROM "group_analyses" WHERE cardinality("game_ids") < 5 OR cardinality("game_ids") > 30;--> statement-breakpoint
ALTER TABLE "group_analyses" VALIDATE CONSTRAINT "group_analyses_game_ids_count";--> statement-breakpoint
ALTER TABLE "auth_verification_tokens" ALTER COLUMN "token" TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."auth_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."auth_verification_tokens" ENABLE ROW LEVEL SECURITY;
