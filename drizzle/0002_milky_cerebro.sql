CREATE INDEX "group_analyses_user_hash_idx" ON "group_analyses" USING btree ("user_id","input_hash");
