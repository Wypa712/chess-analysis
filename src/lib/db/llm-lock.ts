import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { llmRequestLocks } from "@/db/schema";

// ─── LLM Request Lock helpers ───────────────────────────────────────────────

const LOCK_TTL_MS = 2 * 60 * 1000;

// Note: JS finally always runs on return inside try — lock is released on all paths.
export async function acquireLlmLock(
  lockKey: string,
  userId: string,
  scope: string
): Promise<boolean> {
  await db
    .delete(llmRequestLocks)
    .where(sql`${llmRequestLocks.expiresAt} < NOW()`);

  const rows = await db
    .insert(llmRequestLocks)
    .values({
      lockKey,
      userId,
      scope,
      expiresAt: new Date(Date.now() + LOCK_TTL_MS),
    })
    .onConflictDoNothing()
    .returning({ lockKey: llmRequestLocks.lockKey });

  return rows.length > 0;
}

export async function releaseLlmLock(
  lockKey: string,
  userId: string
): Promise<void> {
  try {
    await db
      .delete(llmRequestLocks)
      .where(
        and(
          eq(llmRequestLocks.lockKey, lockKey),
          eq(llmRequestLocks.userId, userId)
        )
      );
  } catch (err) {
    console.error("[LLM] lock release failed:", err);
  }
}
