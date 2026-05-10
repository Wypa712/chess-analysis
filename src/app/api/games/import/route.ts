import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { importLichessGames } from "@/lib/importers/lichess";
import { importChessComGames } from "@/lib/importers/chessdotcom";
import { ImportError } from "@/lib/importers/errors";
import { captureSanitizedException } from "@/lib/observability/sentry";

const VALID_LIMITS = [25, 50, 100] as const;
const VALID_DAYS = [7, 30, 90] as const;
const VALID_IMPORT_MODES = ["count", "days"] as const;

type ImportMode = (typeof VALID_IMPORT_MODES)[number];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    platform,
    username,
    importMode = "count",
    limit = 25,
    days = 7,
  } = body as Record<string, unknown>;

  if (platform !== "lichess" && platform !== "chess_com") {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }
  if (typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }
  if (username.trim().length > 50) {
    return NextResponse.json({ error: "Username too long" }, { status: 400 });
  }
  if (!VALID_IMPORT_MODES.includes(importMode as ImportMode)) {
    return NextResponse.json(
      { error: "importMode must be count or days" },
      { status: 400 }
    );
  }
  if (
    importMode === "count" &&
    !VALID_LIMITS.includes(limit as (typeof VALID_LIMITS)[number])
  ) {
    return NextResponse.json(
      { error: "limit must be 25, 50 or 100" },
      { status: 400 }
    );
  }
  if (
    importMode === "days" &&
    !VALID_DAYS.includes(days as (typeof VALID_DAYS)[number])
  ) {
    return NextResponse.json(
      { error: "days must be 7, 30 or 90" },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  const recentImport = await db
    .select({ id: chessAccounts.id })
    .from(chessAccounts)
    .where(
      and(
        eq(chessAccounts.userId, userId),
        sql`${chessAccounts.lastSyncedAt} > NOW() - INTERVAL '15 seconds'`
      )
    )
    .limit(1);

  if (recentImport.length > 0) {
    return NextResponse.json(
      { error: "Зачекайте 15 секунд між імпортами" },
      { status: 429 }
    );
  }

  const trimmedUsername = (username as string).trim();
  const normalizedUsername = trimmedUsername.toLowerCase();
  const importOptions =
    importMode === "count"
      ? { limit: limit as number }
      : { since: Date.now() - (days as number) * 24 * 60 * 60 * 1000 };

  let chessAccount: { id: string } | null = null;
  let shouldCleanupAccountOnFailure = false;

  try {
    const existingAccounts = await db
      .select({ id: chessAccounts.id })
      .from(chessAccounts)
      .where(
        and(
          eq(chessAccounts.userId, userId),
          eq(chessAccounts.platform, platform),
          eq(chessAccounts.normalizedUsername, normalizedUsername)
        )
      )
      .limit(1);

    shouldCleanupAccountOnFailure = existingAccounts.length === 0;

    [chessAccount] = await db
      .insert(chessAccounts)
      .values({
        userId,
        platform,
        username: trimmedUsername,
        normalizedUsername,
      })
      .onConflictDoUpdate({
        target: [
          chessAccounts.userId,
          chessAccounts.platform,
          chessAccounts.normalizedUsername,
        ],
        set: { username: trimmedUsername },
      })
      .returning({ id: chessAccounts.id });

    if (!chessAccount) {
      throw new Error("Failed to create chess account");
    }

    let result: { imported: number; skipped: number };

    if (platform === "lichess") {
      result = await importLichessGames(
        chessAccount.id,
        trimmedUsername,
        importOptions
      );
    } else {
      result = await importChessComGames(
        chessAccount.id,
        trimmedUsername,
        importOptions
      );
    }

    await db
      .update(chessAccounts)
      .set({ lastSyncedAt: new Date() })
      .where(eq(chessAccounts.id, chessAccount.id));

    return NextResponse.json(result);
  } catch (err) {
    if (shouldCleanupAccountOnFailure && chessAccount) {
      try {
        await db
          .delete(chessAccounts)
          .where(
            and(
              eq(chessAccounts.id, chessAccount.id),
              eq(chessAccounts.userId, userId),
              isNull(chessAccounts.lastSyncedAt)
            )
          );
      } catch (cleanupErr) {
        console.error("Failed to clean up failed import account", cleanupErr);
      }
    }

    console.error("[import] failed:", err);

    const platformName = platform === "chess_com" ? "Chess.com" : "Lichess";

    if (err instanceof ImportError) {
      if (err.code === "api_error" || err.code === "network_error") {
        captureSanitizedException(err, `ImportError:${err.code}`, {
          route: "/api/games/import",
          platform,
          code: err.code,
        });
      }
      const messages = {
        user_not_found: `Гравця "${trimmedUsername}" не знайдено на ${platformName}`,
        rate_limited: `${platformName} обмежує запити. Спробуйте через кілька хвилин`,
        api_error: `Помилка сервера ${platformName}. Спробуйте пізніше`,
        network_error: `Не вдалося підключитися до ${platformName}. Перевірте з'єднання`,
      };
      const httpStatus = {
        user_not_found: 404,
        rate_limited: 429,
        api_error: 502,
        network_error: 503,
      };
      return NextResponse.json(
        { error: messages[err.code], code: err.code },
        { status: httpStatus[err.code] }
      );
    }

    if (
      err instanceof TypeError ||
      (err instanceof DOMException &&
        (err.name === "TimeoutError" || err.name === "AbortError"))
    ) {
      captureSanitizedException(err, "NetworkError", {
        route: "/api/games/import",
        platform,
        code: "network_error",
      });
      return NextResponse.json(
        {
          error: `Не вдалося підключитися до ${platformName}. Перевірте з'єднання`,
          code: "network_error",
        },
        { status: 503 }
      );
    }

    captureSanitizedException(err, "ImportUnhandledError", {
      route: "/api/games/import",
      platform,
    });
    return NextResponse.json(
      { error: "Помилка імпорту. Спробуйте пізніше", code: "api_error" },
      { status: 500 }
    );
  }
}
