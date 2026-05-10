import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, engineAnalyses, games } from "@/db/schema";
import { STOCKFISH_PROFILE_KEY } from "@/lib/chess/engine-analysis";
import { eq, and, desc, inArray, count, type SQL } from "drizzle-orm";

const PAGE_SIZE = 20;
const VALID_PLATFORMS = ["chess_com", "lichess"] as const;
const VALID_TIME_CONTROL_CATEGORIES = [
  "bullet",
  "blitz",
  "rapid",
  "classical",
  "correspondence",
  "unknown",
] as const;
const VALID_RESULTS = ["win", "loss", "draw"] as const;

type Platform = (typeof VALID_PLATFORMS)[number];
type TimeControlCategory = (typeof VALID_TIME_CONTROL_CATEGORIES)[number];
type GameResult = (typeof VALID_RESULTS)[number];

function includes<T extends readonly string[]>(
  values: T,
  value: string
): value is T[number] {
  return values.includes(value);
}

function parsePage(value: string | null) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = parsePage(searchParams.get("page"));
  const platform = searchParams.get("platform"); // "chess_com" | "lichess"
  const timeControlCategory = searchParams.get("timeControlCategory");
  const result = searchParams.get("result"); // "win" | "loss" | "draw"

  if (platform && !includes(VALID_PLATFORMS, platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }
  if (
    timeControlCategory &&
    !includes(VALID_TIME_CONTROL_CATEGORIES, timeControlCategory)
  ) {
    return NextResponse.json(
      { error: "Invalid timeControlCategory" },
      { status: 400 }
    );
  }
  if (result && !includes(VALID_RESULTS, result)) {
    return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  }

  const userId = session.user.id;
  const platformFilter = platform as Platform | null;
  const timeControlCategoryFilter =
    timeControlCategory as TimeControlCategory | null;
  const resultFilter = result as GameResult | null;

  const accountSubquery = db
    .select({ id: chessAccounts.id })
    .from(chessAccounts)
    .where(
      platformFilter
        ? and(
            eq(chessAccounts.userId, userId),
            eq(chessAccounts.platform, platformFilter)
          )
        : eq(chessAccounts.userId, userId)
    );

  // Build where conditions
  const baseConditions: SQL[] = [inArray(games.chessAccountId, accountSubquery)];

  if (timeControlCategoryFilter) {
    baseConditions.push(eq(games.timeControlCategory, timeControlCategoryFilter));
  }

  // summaryWhere excludes result filter so the breakdown always shows all three types
  const summaryWhere = and(...baseConditions);

  const conditions = resultFilter
    ? [...baseConditions, eq(games.result, resultFilter)]
    : baseConditions;
  const where = and(...conditions);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, countRows, summaryRows] = await Promise.all([
    db
      .select({
        id: games.id,
        platformGameId: games.platformGameId,
        sourceUrl: games.sourceUrl,
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
        chessAccountId: games.chessAccountId,
        platform: chessAccounts.platform,
        engineAnalysisId: engineAnalyses.id,
      })
      .from(games)
      .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
      .leftJoin(
        engineAnalyses,
        and(
          eq(engineAnalyses.gameId, games.id),
          eq(engineAnalyses.profileKey, STOCKFISH_PROFILE_KEY)
        )
      )
      .where(where)
      .orderBy(desc(games.playedAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.$count(games, where),
    db
      .select({ result: games.result, cnt: count() })
      .from(games)
      .where(summaryWhere)
      .groupBy(games.result),
  ]);

  const wins = summaryRows.find((r) => r.result === "win")?.cnt ?? 0;
  const draws = summaryRows.find((r) => r.result === "draw")?.cnt ?? 0;
  const losses = summaryRows.find((r) => r.result === "loss")?.cnt ?? 0;

  return NextResponse.json({
    games: rows.map(({ engineAnalysisId, ...game }) => ({
      ...game,
      engineAnalysisStatus: engineAnalysisId ? "done" : "not_started",
    })),
    total: countRows,
    page,
    pageSize: PAGE_SIZE,
    summary: {
      total: wins + draws + losses,
      wins,
      draws,
      losses,
    },
  });
}
