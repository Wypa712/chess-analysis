import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts } from "@/db/schema";
import { eq, and, lte, isNull, or } from "drizzle-orm";
import { importLichessGames } from "@/lib/importers/lichess";
import { importChessComGames } from "@/lib/importers/chessdotcom";
import { ImportError } from "@/lib/importers/errors";
import { captureSanitizedException } from "@/lib/observability/sentry";

const RATE_LIMIT_SECONDS = 60;

// POST /api/sync — delta sync: fetch games newer than lastSyncedAt for all user's accounts
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch accounts with their current lastSyncedAt (needed for `since` param later)
  const accounts = await db
    .select({
      id: chessAccounts.id,
      platform: chessAccounts.platform,
      username: chessAccounts.username,
      lastSyncedAt: chessAccounts.lastSyncedAt,
    })
    .from(chessAccounts)
    .where(eq(chessAccounts.userId, userId));

  if (accounts.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, accounts: [] });
  }

  // Atomic rate-limit check: update lastSyncedAt=now only for accounts old enough.
  // If 0 rows affected, all accounts were synced too recently → 429.
  const cutoff = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000);
  const claimed = await db
    .update(chessAccounts)
    .set({ lastSyncedAt: new Date() })
    .where(
      and(
        eq(chessAccounts.userId, userId),
        or(isNull(chessAccounts.lastSyncedAt), lte(chessAccounts.lastSyncedAt, cutoff))
      )
    )
    .returning({ id: chessAccounts.id });

  if (claimed.length === 0) {
    const mostRecentSync = accounts.reduce<Date | null>((latest, a) => {
      if (!a.lastSyncedAt) return latest;
      if (!latest || a.lastSyncedAt > latest) return a.lastSyncedAt;
      return latest;
    }, null);
    const remainingSecs = mostRecentSync
      ? Math.max(1, Math.ceil((mostRecentSync.getTime() + RATE_LIMIT_SECONDS * 1000 - Date.now()) / 1000))
      : RATE_LIMIT_SECONDS;
    return NextResponse.json(
      { error: `Зачекайте ${remainingSecs} с між синхронізаціями` },
      { status: 429 }
    );
  }

  const claimedIds = new Set(claimed.map((r) => r.id));
  const accountsToSync = accounts.filter((a) => claimedIds.has(a.id));
  // Preserve old lastSyncedAt per account for `since` param and failure rollback
  const prevSyncedAt = new Map(accounts.map((a) => [a.id, a.lastSyncedAt]));

  type AccountOutcome = {
    platform: string;
    username: string;
    imported: number;
    skipped: number;
    error?: string;
  };

  type SyncResult = { accountId: string; outcome: AccountOutcome; failed: boolean };

  const syncResults: SyncResult[] = await Promise.all(
    accountsToSync.map(async (account): Promise<SyncResult> => {
      const since =
        prevSyncedAt.get(account.id)?.getTime() ??
        Date.now() - 7 * 24 * 60 * 60 * 1000;

      try {
        const result =
          account.platform === "lichess"
            ? await importLichessGames(account.id, account.username, { since })
            : await importChessComGames(account.id, account.username, { since });

        return {
          accountId: account.id,
          outcome: {
            platform: account.platform,
            username: account.username,
            imported: result.imported,
            skipped: result.skipped,
          },
          failed: false,
        };
      } catch (err) {
        let errorMsg = "Помилка синхронізації";
        if (err instanceof ImportError) {
          console.error(`[sync] ${account.platform}/${account.username}:`, err.code);
          const platformLabel = account.platform === "chess_com" ? "Chess.com" : "Lichess";
          const codeMessages: Record<string, string> = {
            user_not_found: `Гравця не знайдено на ${platformLabel}`,
            rate_limited: `${platformLabel} обмежує запити. Спробуйте пізніше`,
            api_error: `Помилка сервера ${platformLabel}`,
            network_error: `Не вдалося підключитися до ${platformLabel}`,
          };
          errorMsg = codeMessages[err.code] ?? "Помилка синхронізації";
        } else {
          captureSanitizedException(err, "SyncError", {
            route: "/api/sync",
            platform: account.platform,
          });
          console.error(
            `[sync] ${account.platform}/${account.username}:`,
            err instanceof Error ? err.message : String(err)
          );
        }
        return {
          accountId: account.id,
          outcome: {
            platform: account.platform,
            username: account.username,
            imported: 0,
            skipped: 0,
            error: errorMsg,
          },
          failed: true,
        };
      }
    })
  );

  const outcomes = syncResults.map((r) => r.outcome);
  const failedIds = new Set(syncResults.filter((r) => r.failed).map((r) => r.accountId));

  // Revert lastSyncedAt for failed accounts — run concurrently to reduce timeout risk
  if (failedIds.size > 0) {
    const rollbackResults = await Promise.allSettled(
      Array.from(failedIds).map((id) =>
        db
          .update(chessAccounts)
          .set({ lastSyncedAt: prevSyncedAt.get(id) ?? null })
          .where(eq(chessAccounts.id, id))
      )
    );
    for (const r of rollbackResults) {
      if (r.status === "rejected") {
        console.error("[sync] rollback failed:", r.reason);
      }
    }
  }

  const totalImported = outcomes.reduce((s, o) => s + o.imported, 0);
  const totalSkipped = outcomes.reduce((s, o) => s + o.skipped, 0);

  return NextResponse.json({
    imported: totalImported,
    skipped: totalSkipped,
    accounts: outcomes,
  });
}
