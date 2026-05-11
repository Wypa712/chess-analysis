CREATE TABLE "llm_request_locks" (
	"lock_key" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llm_request_locks" ADD CONSTRAINT "llm_request_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "llm_request_locks_user_scope_idx" ON "llm_request_locks" USING btree ("user_id","scope");--> statement-breakpoint
CREATE INDEX "llm_request_locks_expires_at_idx" ON "llm_request_locks" USING btree ("expires_at");
