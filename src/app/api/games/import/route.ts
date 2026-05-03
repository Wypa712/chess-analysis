import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { importLichessGames } from "@/lib/importers/lichess";
import { importChessComGames } from "@/lib/importers/chessdotcom";

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
  const trimmedUsername = (username as string).trim();
  const normalizedUsername = trimmedUsername.toLowerCase();
  const importOptions =
    importMode === "count"
      ? { limit: limit as number }
      : { since: Date.now() - (days as number) * 24 * 60 * 60 * 1000 };

  const [chessAccount] = await db
    .insert(chessAccounts)
    .values({
      userId,
      platform,
      username: trimmedUsername,
      normalizedUsername,
    })
    .onConflictDoUpdate({
      target: [chessAccounts.userId, chessAccounts.platform, chessAccounts.normalizedUsername],
      set: { username: trimmedUsername },
    })
    .returning();

  try {
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
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
