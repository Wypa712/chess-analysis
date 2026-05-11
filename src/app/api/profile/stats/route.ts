import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, games } from "@/db/schema";
import { eq, and, sql, asc, inArray } from "drizzle-orm";

const MIN_GAMES_FOR_STATS = 5;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  if (![0, 7, 30, 90].includes(days)) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }

  // Load user's chess accounts (single query for id + display fields)
  const accountRows = await db
    .select({
      id: chessAccounts.id,
      platform: chessAccounts.platform,
      username: chessAccounts.username,
    })
    .from(chessAccounts)
    .where(eq(chessAccounts.userId, userId))
    .orderBy(asc(chessAccounts.id));

  const accountsAll = accountRows.map(({ platform, username }) => ({ platform, username }));
  const seen = new Set<string>();
  const accounts = accountsAll.filter(({ platform }) => {
    if (seen.has(platform)) return false;
    seen.add(platform);
    return true;
  });
  const accountIdList = accountRows.map((a) => a.id);

  if (accountIdList.length === 0) {
    return NextResponse.json({
      totalGames: 0,
      accounts: [],
      wdl: null,
      byColor: null,
      byTimeControl: null,
      openings: null,
      eloHistory: { chess_com: {}, lichess: {} },
    });
  }

  // Build filter condition using inArray (safe parameterized SQL)
  const baseCondition = inArray(games.chessAccountId, accountIdList);
  const filterCondition =
    days === 0
      ? baseCondition
      : and(baseCondition, sql`${games.playedAt} > NOW() - INTERVAL '1 day' * ${days}`);

  // Count total games
  const totalResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(games)
    .where(filterCondition);
  const totalAvailable = totalResult[0]?.count ?? 0;

  if (totalAvailable < MIN_GAMES_FOR_STATS) {
    return NextResponse.json({
      totalGames: totalAvailable,
      accounts,
      wdl: null,
      byColor: null,
      byTimeControl: null,
      openings: null,
      eloHistory: { chess_com: {}, lichess: {} },
    });
  }

  if (totalAvailable === 0) {
    return NextResponse.json({
      totalGames: 0,
      accounts,
      wdl: null,
      byColor: null,
      byTimeControl: null,
      openings: null,
      eloHistory: { chess_com: {}, lichess: {} },
    });
  }

  const totalGames = totalAvailable;
  const gameFilter = filterCondition;

  // W/D/L
  const wdlRows = await db
    .select({
      result: games.result,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(games)
    .where(gameFilter)
    .groupBy(games.result);

  const wdl = {
    wins: wdlRows.find((r) => r.result === "win")?.count ?? 0,
    draws: wdlRows.find((r) => r.result === "draw")?.count ?? 0,
    losses: wdlRows.find((r) => r.result === "loss")?.count ?? 0,
  };

  // By color
  const colorRows = await db
    .select({
      color: games.color,
      total: sql<number>`COUNT(*)::int`,
      wins: sql<number>`SUM(CASE WHEN ${games.result} = 'win' THEN 1 ELSE 0 END)::int`,
    })
    .from(games)
    .where(gameFilter)
    .groupBy(games.color);

  const whiteRow = colorRows.find((r) => r.color === "white");
  const blackRow = colorRows.find((r) => r.color === "black");

  const byColor = {
    white: {
      games: whiteRow?.total ?? 0,
      wins: whiteRow?.wins ?? 0,
      rate: whiteRow ? Math.round(((whiteRow.wins ?? 0) / whiteRow.total) * 100) : 0,
    },
    black: {
      games: blackRow?.total ?? 0,
      wins: blackRow?.wins ?? 0,
      rate: blackRow ? Math.round(((blackRow.wins ?? 0) / blackRow.total) * 100) : 0,
    },
  };

  // By time control
  const tcRows = await db
    .select({
      category: games.timeControlCategory,
      total: sql<number>`COUNT(*)::int`,
      wins: sql<number>`SUM(CASE WHEN ${games.result} = 'win' THEN 1 ELSE 0 END)::int`,
    })
    .from(games)
    .where(gameFilter)
    .groupBy(games.timeControlCategory);

  const tcLabels: Record<string, string> = {
    bullet: "Bullet",
    blitz: "Blitz",
    rapid: "Rapid",
    classical: "Classical",
    correspondence: "Correspondence",
    unknown: "Інше",
  };

  const byTimeControl = tcRows.map((r) => ({
    label: tcLabels[r.category] ?? r.category,
    games: r.total,
    rate: Math.round(((r.wins ?? 0) / r.total) * 100),
  }));

  // Top 5 openings
  const openingRows = await db
    .select({
      opening: sql<string>`COALESCE(${games.openingName}, 'Невідомий дебют')`,
      total: sql<number>`COUNT(*)::int`,
      wins: sql<number>`SUM(CASE WHEN ${games.result} = 'win' THEN 1 ELSE 0 END)::int`,
    })
    .from(games)
    .where(gameFilter)
    .groupBy(sql`COALESCE(${games.openingName}, 'Невідомий дебют')`)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(5);

  const openings = openingRows.map((r) => ({
    name: r.opening,
    games: r.total,
    rate: Math.round(((r.wins ?? 0) / r.total) * 100),
  }));

  // ELO history — respects the same period filter as the rest of the stats
  const eloDateFilter =
    days === 0
      ? sql`${games.playerRating} IS NOT NULL`
      : and(
          sql`${games.playerRating} IS NOT NULL`,
          sql`${games.playedAt} > NOW() - INTERVAL '1 day' * ${days}`
        );
  const eloRows = await db
    .select({
      platform: chessAccounts.platform,
      timeControl: games.timeControlCategory,
      playedAt: games.playedAt,
      rating: games.playerRating,
    })
    .from(games)
    .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
    .where(and(eq(chessAccounts.userId, userId), eloDateFilter))
    .orderBy(asc(games.playedAt));

  type EloPoint = { playedAt: string; rating: number };
  type EloByTC = Partial<Record<string, EloPoint[]>>;

  function groupByTC(platform: string): EloByTC {
    const result: EloByTC = {};
    for (const r of eloRows) {
      if (r.platform !== platform) continue;
      const tc = r.timeControl ?? "unknown";
      if (!result[tc]) result[tc] = [];
      result[tc]!.push({ playedAt: r.playedAt.toISOString(), rating: r.rating! });
    }
    return result;
  }

  const eloHistory = {
    chess_com: groupByTC("chess_com"),
    lichess: groupByTC("lichess"),
  };

  return NextResponse.json({
    totalGames,
    totalAvailable,
    accounts,
    wdl,
    byColor,
    byTimeControl,
    openings,
    eloHistory,
  });
}
