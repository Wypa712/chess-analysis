import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { importLichessGames } from "@/lib/importers/lichess";
import { importChessComGames } from "@/lib/importers/chessdotcom";
import { ImportError } from "@/lib/importers/errors";

const CHUNK_SIZE = 50;

// POST /api/sync/initial — one chunk of initial import (cursor-based)
// Body: { accountId: string, cursor?: string | null, limit?: number }
// Returns: { imported, skipped, hasMore, nextCursor }
//
// cursor = ISO timestamp of the oldest game returned in the previous chunk.
// On Lichess this maps to `until` (ms). On Chess.com this maps to the oldest archive boundary.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невірний формат запиту" }, { status: 400 });
  }

  const { accountId, cursor, limit } = body as Record<string, unknown>;

  if (typeof accountId !== "string") {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const userId = session.user.id;
  const chunkSize =
    typeof limit === "number" && limit > 0 && limit <= 100
      ? limit
      : CHUNK_SIZE;

  // Verify ownership
  const [account] = await db
    .select({
      id: chessAccounts.id,
      platform: chessAccounts.platform,
      username: chessAccounts.username,
    })
    .from(chessAccounts)
    .where(
      and(eq(chessAccounts.id, accountId), eq(chessAccounts.userId, userId))
    )
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  let cursorMs: number | undefined;
  if (typeof cursor === "string" && cursor) {
    const parsed = new Date(cursor).getTime() - 1;
    if (!Number.isFinite(parsed) || parsed > Date.now()) {
      return NextResponse.json({ error: "Невірний cursor" }, { status: 400 });
    }
    cursorMs = parsed;
  }

  try {
    let result: { imported: number; skipped: number; oldestPlayedAt: number | null };

    if (account.platform === "lichess") {
      result = await importLichessGames(account.id, account.username, {
        limit: chunkSize,
        ...(cursorMs !== undefined ? { until: cursorMs } : {}),
      });
    } else {
      result = await importChessComGames(account.id, account.username, {
        limit: chunkSize,
        ...(cursorMs !== undefined ? { until: cursorMs } : {}),
      });
    }

    // Stop if no progress: all games skipped with the same cursor would loop forever
    const hasMore =
      result.imported + result.skipped >= chunkSize &&
      result.oldestPlayedAt !== null &&
      (cursorMs === undefined || result.oldestPlayedAt < cursorMs);

    const nextCursor =
      hasMore && result.oldestPlayedAt !== null
        ? new Date(result.oldestPlayedAt).toISOString()
        : null;

    // Update lastSyncedAt only on final chunk so a cancelled import doesn't skip games
    if (!hasMore) {
      await db
        .update(chessAccounts)
        .set({ lastSyncedAt: new Date() })
        .where(eq(chessAccounts.id, account.id));
    }

    return NextResponse.json({
      imported: result.imported,
      skipped: result.skipped,
      hasMore,
      nextCursor,
    });
  } catch (err) {
    const platformLabel =
      account.platform === "chess_com" ? "Chess.com" : "Lichess";

    if (err instanceof ImportError) {
      const messages: Record<string, string> = {
        user_not_found: `Гравця не знайдено на ${platformLabel}`,
        rate_limited: `${platformLabel} обмежує запити. Спробуйте пізніше`,
        api_error: `Помилка сервера ${platformLabel}`,
        network_error: `Не вдалося підключитися до ${platformLabel}`,
      };
      return NextResponse.json(
        { error: messages[err.code] ?? "Помилка імпорту" },
        { status: 502 }
      );
    }

    console.error("[sync/initial]", err);
    return NextResponse.json({ error: "Помилка імпорту" }, { status: 500 });
  }
}
