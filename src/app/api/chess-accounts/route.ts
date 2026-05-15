import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ImportError } from "@/lib/importers/errors";

const LICHESS_USERNAME_RE = /^[a-zA-Z0-9_-]{2,50}$/;
const CHESS_COM_USERNAME_RE = /^[a-zA-Z0-9_]{3,50}$/;

// GET /api/chess-accounts — list user's linked chess accounts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await db
    .select({
      id: chessAccounts.id,
      platform: chessAccounts.platform,
      username: chessAccounts.username,
      lastSyncedAt: chessAccounts.lastSyncedAt,
    })
    .from(chessAccounts)
    .where(eq(chessAccounts.userId, session.user.id))
    .orderBy(chessAccounts.createdAt);

  return NextResponse.json(
    accounts.map((a) => ({
      ...a,
      lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
    }))
  );
}

// POST /api/chess-accounts — add a new linked chess account
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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Невірний формат запиту" }, { status: 400 });
  }

  const { platform, username } = body as Record<string, unknown>;

  if (platform !== "lichess" && platform !== "chess_com") {
    return NextResponse.json({ error: "Невірна платформа" }, { status: 400 });
  }
  if (typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Нікнейм обов'язковий" }, { status: 400 });
  }
  const trimmedUsername = username.trim();
  if (trimmedUsername.length > 50) {
    return NextResponse.json({ error: "Нікнейм надто довгий" }, { status: 400 });
  }
  if (platform === "lichess" && !LICHESS_USERNAME_RE.test(trimmedUsername)) {
    return NextResponse.json(
      { error: "Некоректний нікнейм для Lichess (дозволені: літери, цифри, _ та -)" },
      { status: 400 }
    );
  }
  if (platform === "chess_com" && !CHESS_COM_USERNAME_RE.test(trimmedUsername)) {
    return NextResponse.json(
      { error: "Некоректний нікнейм для Chess.com (дозволені: літери, цифри та _)" },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const normalizedUsername = trimmedUsername.toLowerCase();
  const platformLabel = platform === "chess_com" ? "Chess.com" : "Lichess";

  // Validate username exists on the platform before saving
  try {
    await validateUsernameExists(platform, trimmedUsername);
  } catch (err) {
    if (err instanceof ImportError && err.code === "user_not_found") {
      return NextResponse.json(
        {
          error: `Гравця "${trimmedUsername}" не знайдено на ${platformLabel}`,
        },
        { status: 404 }
      );
    }
    if (err instanceof ImportError && err.code === "rate_limited") {
      return NextResponse.json(
        { error: `${platformLabel} обмежує запити. Спробуйте через кілька хвилин` },
        { status: 429 }
      );
    }
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: `${platformLabel} не відповідає. Спробуйте пізніше` },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: `Не вдалося перевірити акаунт на ${platformLabel}` },
      { status: 502 }
    );
  }

  const [account] = await db
    .insert(chessAccounts)
    .values({ userId, platform, username: trimmedUsername, normalizedUsername })
    .onConflictDoUpdate({
      target: [
        chessAccounts.userId,
        chessAccounts.platform,
        chessAccounts.normalizedUsername,
      ],
      set: { username: trimmedUsername },
    })
    .returning({
      id: chessAccounts.id,
      platform: chessAccounts.platform,
      username: chessAccounts.username,
      lastSyncedAt: chessAccounts.lastSyncedAt,
    });

  return NextResponse.json({
    ...account,
    lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
  });
}

async function validateUsernameExists(
  platform: "lichess" | "chess_com",
  username: string
): Promise<void> {
  if (platform === "lichess") {
    const res = await fetch(
      `https://lichess.org/api/user/${encodeURIComponent(username)}`,
      { redirect: "error", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      if (res.status === 404) throw new ImportError("user_not_found", "Not found");
      if (res.status === 429) throw new ImportError("rate_limited", "Rate limited");
      throw new ImportError("api_error", `Lichess error: ${res.status}`);
    }
    await res.body?.cancel();
  } else {
    const res = await fetch(
      `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}`,
      { redirect: "error", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      if (res.status === 404) throw new ImportError("user_not_found", "Not found");
      if (res.status === 429) throw new ImportError("rate_limited", "Rate limited");
      throw new ImportError("api_error", `Chess.com error: ${res.status}`);
    }
    await res.body?.cancel();
  }
}
