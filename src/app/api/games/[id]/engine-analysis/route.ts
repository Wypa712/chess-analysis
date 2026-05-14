import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, engineAnalyses, games } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  STOCKFISH_DEPTH,
  STOCKFISH_ENGINE_NAME,
  STOCKFISH_ENGINE_VERSION,
  STOCKFISH_PROFILE_KEY,
  type EngineAnalysisJsonV1,
  isEngineAnalysisJsonV1,
} from "@/lib/chess/engine-analysis";
import { parsePgn } from "@/lib/chess/pgn";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_PAYLOAD_BYTES = 500 * 1024;

async function getOwnedGame(gameId: string, userId: string) {
  const rows = await db
    .select({ id: games.id, pgn: games.pgn })
    .from(games)
    .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
    .where(and(eq(games.id, gameId), eq(chessAccounts.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

function analysisMatchesGame(analysis: EngineAnalysisJsonV1, pgn: string) {
  const parsed = parsePgn(pgn);
  if (!parsed) return false;

  if (analysis.moves.length !== parsed.positions.length) return false;
  if (analysis.evalGraph.length !== parsed.positions.length + 1) return false;

  for (let i = 0; i < analysis.evalGraph.length; i++) {
    if (analysis.evalGraph[i]?.ply !== i) return false;
  }

  return parsed.positions.every((position, i) => {
    const move = analysis.moves[i];
    if (!move) return false;
    const color = position.color === "w" ? "white" : "black";

    return (
      move.ply === i + 1 &&
      move.moveNumber === position.moveNumber &&
      move.color === color &&
      move.san === position.san &&
      move.uci === position.uci &&
      move.fenBefore === position.fenBefore &&
      move.fenAfter === position.fen
    );
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ownedGame = await getOwnedGame(id, session.user.id);
  if (!ownedGame) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(engineAnalyses)
    .where(
      and(
        eq(engineAnalyses.gameId, id),
        eq(engineAnalyses.profileKey, STOCKFISH_PROFILE_KEY)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ analysis: null });
  }

  return NextResponse.json({ analysis: rows[0].analysisJson });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ownedGame = await getOwnedGame(id, session.user.id);
  if (!ownedGame) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const payloadBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(payloadBytes) && payloadBytes > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const analysis =
    typeof body === "object" && body !== null && "analysis" in body
      ? (body as { analysis?: unknown }).analysis
      : undefined;

  if (!analysis) {
    return NextResponse.json({ error: "Missing analysis" }, { status: 400 });
  }
  if (!isEngineAnalysisJsonV1(analysis)) {
    return NextResponse.json(
      { error: "Invalid engine analysis shape" },
      { status: 400 }
    );
  }
  if (!analysisMatchesGame(analysis, ownedGame.pgn)) {
    return NextResponse.json(
      { error: "Engine analysis does not match this game" },
      { status: 400 }
    );
  }

  await db
    .insert(engineAnalyses)
    .values({
      gameId: id,
      engineName: STOCKFISH_ENGINE_NAME,
      engineVersion: STOCKFISH_ENGINE_VERSION,
      profileKey: STOCKFISH_PROFILE_KEY,
      depth: STOCKFISH_DEPTH,
      analysisJson: analysis,
    })
    .onConflictDoUpdate({
      target: [engineAnalyses.gameId, engineAnalyses.profileKey],
      set: {
        analysisJson: analysis,
        engineVersion: STOCKFISH_ENGINE_VERSION,
        depth: STOCKFISH_DEPTH,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
