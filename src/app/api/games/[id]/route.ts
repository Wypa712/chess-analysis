import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, games } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db
    .select({
      id: games.id,
      platformGameId: games.platformGameId,
      sourceUrl: games.sourceUrl,
      pgn: games.pgn,
      result: games.result,
      color: games.color,
      opponent: games.opponent,
      opponentRating: games.opponentRating,
      playerRating: games.playerRating,
      openingName: games.openingName,
      timeControl: games.timeControl,
      timeControlCategory: games.timeControlCategory,
      rated: games.rated,
      playedAt: games.playedAt,
      moveCount: games.moveCount,
      platform: chessAccounts.platform,
    })
    .from(games)
    .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
    .where(and(eq(games.id, id), eq(chessAccounts.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ game: rows[0] });
}
