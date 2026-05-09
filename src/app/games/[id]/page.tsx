import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, games } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { GameView } from "./GameView";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user?.id) notFound();

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) notFound();

  const rows = await db
    .select({
      id: games.id,
      pgn: games.pgn,
      result: games.result,
      color: games.color,
      opponent: games.opponent,
      opponentRating: games.opponentRating,
      playerRating: games.playerRating,
      openingName: games.openingName,
      timeControl: games.timeControl,
      playedAt: games.playedAt,
      moveCount: games.moveCount,
    })
    .from(games)
    .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
    .where(and(eq(games.id, id), eq(chessAccounts.userId, session.user.id)))
    .limit(1);

  if (rows.length === 0) notFound();

  const row = rows[0];
  return (
    <GameView
      game={{
        ...row,
        playedAt: row.playedAt.toISOString(),
      }}
    />
  );
}
