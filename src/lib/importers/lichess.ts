import { db } from "@/db";
import { games } from "@/db/schema";

type LichessPlayer = {
  user?: { name: string; id: string };
  rating?: number;
  ratingDiff?: number;
  aiLevel?: number;
};

type LichessClock = {
  initial: number;
  increment: number;
  totalTime?: number;
};

type LichessGame = {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: { white: LichessPlayer; black: LichessPlayer };
  winner?: "white" | "black";
  opening?: { eco: string; name: string; ply: number };
  moves?: string;
  clock?: LichessClock;
};

type ImportOptions = {
  limit?: number;
  since?: number;
};

type GameInsert = typeof games.$inferInsert;

const INSERT_BATCH_SIZE = 50;

function mapSpeed(
  speed: string
): "bullet" | "blitz" | "rapid" | "classical" | "correspondence" | "unknown" {
  switch (speed) {
    case "ultraBullet":
    case "bullet":
      return "bullet";
    case "blitz":
      return "blitz";
    case "rapid":
      return "rapid";
    case "classical":
      return "classical";
    case "correspondence":
      return "correspondence";
    default:
      return "unknown";
  }
}

function buildTimeControl(game: LichessGame): string {
  if (game.clock) return `${game.clock.initial}+${game.clock.increment}`;
  if (game.speed === "correspondence") return "correspondence";
  return "-";
}

function sanitizePgnString(s: string): string {
  return s.replace(/"/g, "'").replace(/\\/g, "/");
}

function buildPgn(game: LichessGame): string {
  const white = sanitizePgnString(game.players.white.user?.name ?? "?");
  const black = sanitizePgnString(game.players.black.user?.name ?? "?");
  const whiteElo = game.players.white.rating ?? "?";
  const blackElo = game.players.black.rating ?? "?";
  const date = new Date(game.createdAt)
    .toISOString()
    .split("T")[0]
    .replace(/-/g, ".");
  const timeControl = buildTimeControl(game);

  let result = "*";
  if (game.winner === "white") result = "1-0";
  else if (game.winner === "black") result = "0-1";
  else if (
    ["draw", "stalemate", "outoftime"].includes(game.status) &&
    !game.winner
  )
    result = "1/2-1/2";

  const openingName = sanitizePgnString(game.opening?.name ?? "?");

  const headers = [
    `[Event "${game.rated ? "Rated game" : "Casual game"}"]`,
    `[Site "https://lichess.org/${game.id}"]`,
    `[Date "${date}"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${result}"]`,
    `[WhiteElo "${whiteElo}"]`,
    `[BlackElo "${blackElo}"]`,
    `[TimeControl "${timeControl}"]`,
    `[ECO "${game.opening?.eco ?? "?"}"]`,
    `[Opening "${openingName}"]`,
    `[Termination "${game.status}"]`,
  ].join("\n");

  const moveParts = (game.moves ?? "").trim().split(/\s+/).filter(Boolean);
  let pgnMoves = "";
  let moveNum = 1;
  for (let i = 0; i < moveParts.length; i++) {
    if (i % 2 === 0) pgnMoves += `${moveNum++}. ${moveParts[i]} `;
    else pgnMoves += `${moveParts[i]} `;
  }
  pgnMoves += result;

  return `${headers}\n\n${pgnMoves.trim()}`;
}

function normalizeLichessGame(
  game: LichessGame,
  chessAccountId: string,
  normalizedUsername: string
): GameInsert | null {
  // Skip aborted games
  if (game.status === "aborted") return null;

  const whiteId = game.players.white.user?.id ?? "";
  const blackId = game.players.black.user?.id ?? "";

  const isWhite = whiteId === normalizedUsername;
  const isBlack = blackId === normalizedUsername;
  if (!isWhite && !isBlack) return null;

  const color = isWhite ? ("white" as const) : ("black" as const);
  const playerData = isWhite ? game.players.white : game.players.black;
  const opponentData = isWhite ? game.players.black : game.players.white;

  let result: "win" | "loss" | "draw";
  if (!game.winner) result = "draw";
  else if (game.winner === color) result = "win";
  else result = "loss";

  const moveParts = (game.moves ?? "").trim().split(/\s+/).filter(Boolean);
  const moveCount = Math.ceil(moveParts.length / 2);

  return {
    chessAccountId,
    platformGameId: game.id,
    sourceUrl: `https://lichess.org/${game.id}`,
    pgn: buildPgn(game),
    result,
    color,
    opponent: opponentData.user?.name ?? "AI",
    opponentRating: opponentData.rating ?? null,
    playerRating: playerData.rating ?? null,
    openingName: game.opening?.name ?? null,
    timeControl: buildTimeControl(game),
    timeControlCategory: mapSpeed(game.speed),
    rated: game.rated,
    playedAt: new Date(game.createdAt),
    moveCount,
    rawMetadata: game as unknown as Record<string, unknown>,
  };
}

async function insertGameBatch(batch: GameInsert[]) {
  if (batch.length === 0) return { imported: 0, skipped: 0 };

  const inserted = await db
    .insert(games)
    .values(batch)
    .onConflictDoNothing()
    .returning({ id: games.id });

  return {
    imported: inserted.length,
    skipped: batch.length - inserted.length,
  };
}

export async function importLichessGames(
  chessAccountId: string,
  username: string,
  options: ImportOptions
): Promise<{ imported: number; skipped: number }> {
  const normalizedUsername = username.toLowerCase();

  const url = new URL(
    `https://lichess.org/api/games/user/${encodeURIComponent(username)}`
  );
  if (options.limit !== undefined) {
    url.searchParams.set("max", String(options.limit));
  }
  if (options.since !== undefined) {
    url.searchParams.set("since", String(options.since));
  }
  url.searchParams.set("opening", "true");
  url.searchParams.set("moves", "true");
  url.searchParams.set("clocks", "false");
  url.searchParams.set("evals", "false");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/x-ndjson" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Lichess API error: ${response.status} ${response.statusText}`);
  }

  let imported = 0;
  let skipped = 0;
  const batch: GameInsert[] = [];

  async function flushBatch() {
    const result = await insertGameBatch(batch.splice(0, batch.length));
    imported += result.imported;
    skipped += result.skipped;
  }

  async function processLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;

    let game: LichessGame;
    try {
      game = JSON.parse(trimmed);
    } catch {
      return;
    }

    const normalized = normalizeLichessGame(
      game,
      chessAccountId,
      normalizedUsername
    );
    if (!normalized) return;

    batch.push(normalized);
    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  }

  if (!response.body) {
    const text = await response.text();
    for (const line of text.split("\n")) {
      await processLine(line);
    }
    await flushBatch();
    return { imported, skipped };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      await processLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    await processLine(buffer);
  }

  await flushBatch();

  return { imported, skipped };
}
