import { db } from "@/db";
import { games } from "@/db/schema";
import { ImportError } from "./errors";

type ChessComPlayer = {
  rating: number;
  result: string;
  "@id": string;
  username: string;
  uuid: string;
};

type ChessComGame = {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  accuracies?: { white: number; black: number };
  tcn?: string;
  uuid: string;
  initial_setup: string;
  fen: string;
  time_class: string;
  rules: string;
  white: ChessComPlayer;
  black: ChessComPlayer;
};

type ChessComArchiveResponse = {
  games: ChessComGame[];
};

type ChessComArchivesResponse = {
  archives: string[];
};

type ImportOptions = {
  limit?: number;
  since?: number;
};

export function mapTimeClass(
  timeClass: string
): "bullet" | "blitz" | "rapid" | "classical" | "correspondence" | "unknown" {
  switch (timeClass) {
    case "bullet":
      return "bullet";
    case "blitz":
      return "blitz";
    case "rapid":
      return "rapid";
    case "classical":
      return "classical";
    case "daily":
      return "correspondence";
    default:
      return "unknown";
  }
}

export function extractPlatformGameId(url: string): string {
  // e.g. https://www.chess.com/game/live/12345678
  const match = url.match(/\/game\/(?:live|daily)\/(\d+)/);
  if (!match) throw new Error(`Cannot extract game ID from URL: ${url}`);
  return match[1];
}

export function extractOpeningFromPgn(pgn: string): string | null {
  const match = pgn.match(/\[ECOUrl\s+"[^"]*\/([^"/]+)"\]/);
  if (match) {
    return match[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/);
  return openingMatch ? openingMatch[1] : null;
}

export function extractResultFromPlayerResult(
  playerResult: string
): "win" | "loss" | "draw" {
  if (playerResult === "win") return "win";
  if (
    [
      "agreed",
      "repetition",
      "stalemate",
      "insufficient",
      "50move",
      "timevsinsufficient",
    ].includes(playerResult)
  )
    return "draw";
  return "loss";
}

export function countMovesFromPgn(pgn: string): number {
  const moveSection = pgn
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\d+\.\s*/g, "")
    .trim();
  const tokens = moveSection
    .split(/\s+/)
    .filter((t) => t && !["1-0", "0-1", "1/2-1/2", "*"].includes(t));
  return Math.ceil(tokens.length / 2);
}


function parseArchiveUrl(url: string): { year: number; month: number } | null {
  const match = url.match(/\/games\/(\d{4})\/(\d{2})$/);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

async function getArchiveMonths(
  normalizedUsername: string
): Promise<Array<{ year: number; month: number }>> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    normalizedUsername
  )}/games/archives`;

  const response = await fetch(url, {
    headers: { "User-Agent": "chess-analysis-app/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 429) {
    throw new ImportError("rate_limited", "Chess.com rate limited");
  }
  if (response.status >= 400 && response.status < 500) {
    throw new ImportError("user_not_found", "Chess.com user not found");
  }
  if (!response.ok) {
    throw new ImportError("api_error", `Chess.com API error: ${response.status}`);
  }

  const data: ChessComArchivesResponse = await response.json();
  return (data.archives ?? [])
    .map(parseArchiveUrl)
    .filter((archive): archive is { year: number; month: number } =>
      Boolean(archive)
    )
    .reverse();
}

export async function importChessComGames(
  chessAccountId: string,
  username: string,
  options: ImportOptions
): Promise<{ imported: number; skipped: number }> {
  const normalizedUsername = username.toLowerCase();

  const allMonths = await getArchiveMonths(normalizedUsername);

  const months =
    options.since !== undefined
      ? allMonths.filter(({ year, month }) => {
          const sinceDate = new Date(options.since!);
          return (
            year > sinceDate.getFullYear() ||
            (year === sinceDate.getFullYear() &&
              month >= sinceDate.getMonth() + 1)
          );
        })
      : allMonths;

  const collected: ChessComGame[] = [];

  for (const { year, month } of months) {
    if (options.limit !== undefined && collected.length >= options.limit) {
      break;
    }

    const mm = String(month).padStart(2, "0");
    const url = `https://api.chess.com/pub/player/${encodeURIComponent(normalizedUsername)}/games/${year}/${mm}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "chess-analysis-app/1.0" },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 404) continue;
    if (response.status === 429) {
      throw new ImportError("rate_limited", "Chess.com rate limited");
    }
    if (!response.ok) {
      throw new ImportError("api_error", `Chess.com API error: ${response.status}`);
    }

    const data: ChessComArchiveResponse = await response.json();
    const monthGames = data.games ?? [];

    // Filter by import mode and only standard games.
    const filtered = monthGames
      .filter(
        (g) =>
          g.rules === "chess" &&
          (options.since === undefined || g.end_time * 1000 >= options.since)
      )
      .sort((a, b) => b.end_time - a.end_time);

    collected.push(...filtered);
  }

  const MAX_GAMES_PER_IMPORT = 500;
  const cap = options.limit ?? MAX_GAMES_PER_IMPORT;
  const toProcess = collected.slice(0, cap);

  if (toProcess.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  const gamesToInsert = [];

  for (const game of toProcess) {
    const isWhite = game.white.username.toLowerCase() === normalizedUsername;
    const color = isWhite ? ("white" as const) : ("black" as const);
    const playerData = isWhite ? game.white : game.black;
    const opponentData = isWhite ? game.black : game.white;

    const result = extractResultFromPlayerResult(playerData.result);
    let platformGameId: string;
    try {
      platformGameId = extractPlatformGameId(game.url);
    } catch {
      continue;
    }
    const openingName = extractOpeningFromPgn(game.pgn);
    const moveCount = countMovesFromPgn(game.pgn);

    gamesToInsert.push({
      chessAccountId,
      platformGameId,
      sourceUrl: game.url,
      pgn: game.pgn,
      result,
      color,
      opponent: opponentData.username,
      opponentRating: opponentData.rating ?? null,
      playerRating: playerData.rating ?? null,
      openingName,
      timeControl: game.time_control,
      timeControlCategory: mapTimeClass(game.time_class),
      rated: game.rated,
      playedAt: new Date(game.end_time * 1000),
      moveCount,
      rawMetadata: game as unknown as Record<string, unknown>,
    });
  }

  const inserted = await db
    .insert(games)
    .values(gamesToInsert)
    .onConflictDoNothing()
    .returning({ id: games.id });

  const imported = inserted.length;
  const skipped = gamesToInsert.length - imported;

  return { imported, skipped };
}
