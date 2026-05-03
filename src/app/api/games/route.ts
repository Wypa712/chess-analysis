import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, games } from "@/db/schema";
import { eq, and, desc, gte, lte, inArray, type SQL } from "drizzle-orm";

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

function parseDateParam(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
  const from = searchParams.get("from"); // ISO date string
  const to = searchParams.get("to"); // ISO date string

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

  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to);
  if (from && !fromDate) {
    return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  }
  if (to && !toDate) {
    return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
  }
  if (fromDate && toDate && fromDate > toDate) {
    return NextResponse.json(
      { error: "from date must be before to date" },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const platformFilter = platform as Platform | null;
  const timeControlCategoryFilter =
    timeControlCategory as TimeControlCategory | null;
  const resultFilter = result as GameResult | null;

  // Get all chess account ids for this user (optionally filtered by platform)
  const accountQuery = db
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

  const userAccounts = await accountQuery;
  if (userAccounts.length === 0) {
    return NextResponse.json({
      games: [],
      total: 0,
      page,
      pageSize: PAGE_SIZE,
      summary: { total: 0, wins: 0, draws: 0, losses: 0 },
    });
  }

  const accountIds = userAccounts.map((a) => a.id);

  // Build where conditions
  const conditions: SQL[] = [inArray(games.chessAccountId, accountIds)];

  if (timeControlCategoryFilter) {
    conditions.push(
      eq(games.timeControlCategory, timeControlCategoryFilter)
    );
  }
  if (resultFilter) {
    conditions.push(eq(games.result, resultFilter));
  }
  if (fromDate) {
    conditions.push(gte(games.playedAt, fromDate));
  }
  if (toDate) {
    conditions.push(lte(games.playedAt, toDate));
  }

  const where = and(...conditions);
  const summaryWhere = inArray(games.chessAccountId, accountIds);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, countRows, wins, draws, losses] = await Promise.all([
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
      })
      .from(games)
      .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
      .where(where)
      .orderBy(desc(games.playedAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.$count(games, where),
    db.$count(games, and(summaryWhere, eq(games.result, "win"))),
    db.$count(games, and(summaryWhere, eq(games.result, "draw"))),
    db.$count(games, and(summaryWhere, eq(games.result, "loss"))),
  ]);

  return NextResponse.json({
    games: rows,
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
