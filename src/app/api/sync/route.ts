import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, games } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { importLichessGames } from "@/lib/importers/lichess";
import { importChessComGames } from "@/lib/importers/chessdotcom";
import { ImportError } from "@/lib/importers/errors";
import { captureSanitizedException } from "@/lib/observability/sentry";

type LatestPlayedAt = Date | string | null;

const SYNC_CONCURRENCY = 2;

function toTimeMs(value: LatestPlayedAt | undefined): number | undefined {
  if (!value) return undefined;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Set<Promise<void>> = new Set();

  for (const task of tasks) {
    const p = task()
      .then((result) => {
        results.push(result);
      })
      .finally(() => executing.delete(p));
    executing.add(p);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// POST /api/sync — delta sync: fetch games newer than the latest imported game.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch accounts; `lastSyncedAt` is display/status metadata, not the import watermark.
  const accounts = await db
    .select({
      id: chessAccounts.id,
      platform: chessAccounts.platform,
      username: chessAccounts.username,
    })
    .from(chessAccounts)
    .where(eq(chessAccounts.userId, userId));

  if (accounts.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, accounts: [] });
  }

  const latestGameRows = await db
    .select({
      chessAccountId: games.chessAccountId,
      latestPlayedAt: sql<LatestPlayedAt>`MAX(${games.playedAt})`,
    })
    .from(games)
    .where(inArray(games.chessAccountId, accounts.map((a) => a.id)))
    .groupBy(games.chessAccountId);

  const latestPlayedAt = new Map(
    latestGameRows.map((row) => [row.chessAccountId, row.latestPlayedAt])
  );

  type AccountOutcome = {
    platform: string;
    username: string;
    imported: number;
    skipped: number;
    error?: string;
  };

  type SyncResult = { accountId: string; outcome: AccountOutcome; failed: boolean };

  async function syncOneAccount(
    account: (typeof accounts)[number]
  ): Promise<SyncResult> {
    const since =
      toTimeMs(latestPlayedAt.get(account.id)) ??
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
  }

  const syncResults: SyncResult[] = await runWithConcurrencyLimit(
    accounts.map((account) => () => syncOneAccount(account)),
    SYNC_CONCURRENCY
  );

  const outcomes = syncResults.map((r) => r.outcome);
  const successfulIds = syncResults
    .filter((r) => !r.failed)
    .map((r) => r.accountId);

  if (successfulIds.length > 0) {
    const updateResults = await Promise.allSettled(
      successfulIds.map((id) =>
        db
          .update(chessAccounts)
          .set({ lastSyncedAt: new Date() })
          .where(eq(chessAccounts.id, id))
      )
    );
    for (const r of updateResults) {
      if (r.status === "rejected") {
        console.error("[sync] lastSyncedAt update failed:", r.reason);
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
