// Marks migration 0000 as already applied in __drizzle_migrations tracking table.
// Use when schema was applied via db:push but migration tracking was not set up.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
await sql`
  CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
    id SERIAL PRIMARY KEY,
    hash TEXT NOT NULL,
    created_at BIGINT
  )
`;

const migrationTag = "0000_easy_human_robot";
const migrationWhen = 1777756955834;
const migrationSql = readFileSync(`./drizzle/${migrationTag}.sql`, "utf-8");
const hash = createHash("sha256").update(migrationSql).digest("hex");

const existing = await sql`SELECT id FROM drizzle."__drizzle_migrations" WHERE hash = ${hash}`;
if (existing.length > 0) {
  console.log("Migration 0000 already tracked — nothing to do.");
} else {
  await sql`INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES (${hash}, ${migrationWhen})`;
  console.log("Migration 0000 marked as applied.");
}
