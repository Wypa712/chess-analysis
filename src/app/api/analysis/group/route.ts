import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, engineAnalyses, gameAnalyses, games, groupAnalyses } from "@/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import Groq from "groq-sdk";
import { isGroupAnalysisJsonV1, type GroupAnalysisJsonV1 } from "@/lib/llm/types";

const LLM_MODEL = "llama-3.3-70b-versatile";
const MIN_GAMES = 5;
const MAX_GAMES = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// P0-3: module-level client so HTTP connections are reused across warm invocations
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// ── GET: last cached group analysis for the current user ────────────────────

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(groupAnalyses)
    .where(eq(groupAnalyses.userId, session.user.id))
    .orderBy(desc(groupAnalyses.createdAt))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ analysis: null });
  }

  // P1-15: validate at API boundary before returning to client
  if (!isGroupAnalysisJsonV1(rows[0].analysisJson)) {
    console.error("[group-analysis] GET: stored data failed schema check");
    return NextResponse.json({ analysis: null });
  }

  return NextResponse.json({
    analysis: {
      id: rows[0].id,
      gameIds: rows[0].gameIds,
      analysisJson: rows[0].analysisJson,
      createdAt: rows[0].createdAt,
    },
  });
}

// ── POST: run group analysis ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!groq) {
    return NextResponse.json({ error: "LLM not configured" }, { status: 503 });
  }

  // P1-6: rate-limit — one group analysis per 60 seconds per user
  const recentRows = await db
    .select({ id: groupAnalyses.id })
    .from(groupAnalyses)
    .where(and(
      eq(groupAnalyses.userId, userId),
      sql`${groupAnalyses.createdAt} > NOW() - INTERVAL '60 seconds'`
    ))
    .limit(1);
  if (recentRows.length > 0) {
    return NextResponse.json(
      { error: "Зачекайте хвилину перед повторним аналізом." },
      { status: 429 }
    );
  }

  // Accept optional explicit gameIds; if absent, auto-select last MAX_GAMES games.
  const body = await req.json().catch(() => ({}));
  let gameIds: string[] | null = null;
  if (Array.isArray(body?.gameIds) && body.gameIds.length > 0) {
    gameIds = body.gameIds as string[];
    if (gameIds.length < MIN_GAMES || gameIds.length > MAX_GAMES) {
      return NextResponse.json(
        { error: `Виберіть від ${MIN_GAMES} до ${MAX_GAMES} партій` },
        { status: 400 }
      );
    }
    if (!gameIds.every((id) => typeof id === "string" && UUID_RE.test(id))) {
      return NextResponse.json({ error: "Некоректний формат ідентифікатора партії" }, { status: 400 });
    }
  }

  // Load games with ownership check
  const ownedGames = gameIds
    ? await getGamesByIds(gameIds, userId)
    : await getLastNGames(MAX_GAMES, userId);

  if (ownedGames.length < MIN_GAMES) {
    return NextResponse.json(
      { error: `Потрібно мінімум ${MIN_GAMES} партій для групового аналізу` },
      { status: 400 }
    );
  }

  if (gameIds && ownedGames.length !== gameIds.length) {
    return NextResponse.json({ error: "Деякі партії не знайдено" }, { status: 403 });
  }

  const usedIds = ownedGames.map((g) => g.id);
  const summaries = await buildGameSummaries(ownedGames);
  const prompt = buildGroupPrompt(summaries);

  let parsed: GroupAnalysisJsonV1;
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;

  // P0-2: AbortController so the HTTP request is cancelled on timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const completion = await groq.chat.completions.create(
      {
        model: LLM_MODEL,
        messages: [
          { role: "system", content: GROUP_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      },
      { signal: controller.signal }
    );

    const rawText = completion.choices[0]?.message?.content ?? "";
    promptTokens = completion.usage?.prompt_tokens;
    completionTokens = completion.usage?.completion_tokens;

    const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    let unknown: unknown;
    try {
      unknown = JSON.parse(cleaned);
    } catch {
      console.error("[group-analysis] JSON parse failed. Raw:", rawText.slice(0, 500));
      return NextResponse.json({ error: "LLM повернув некоректний JSON" }, { status: 502 });
    }

    if (!isGroupAnalysisJsonV1(unknown)) {
      console.error("[group-analysis] Schema mismatch:", JSON.stringify(unknown).slice(0, 500));
      return NextResponse.json(
        { error: "LLM відповідь не відповідає схемі" },
        { status: 502 }
      );
    }

    parsed = unknown;
  } catch (err) {
    const isAbort = err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
    console.error("[group-analysis] LLM error:", err);
    return NextResponse.json(
      { error: isAbort ? "LLM timeout" : "Не вдалося отримати аналіз. Спробуйте ще раз." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }

  type SavedRow = { id: string; gameIds: string[]; analysisJson: unknown; createdAt: Date };
  let savedRow: SavedRow;
  try {
    const [saved] = await db
      .insert(groupAnalyses)
      .values({
        userId,
        gameIds: usedIds,
        llmModel: LLM_MODEL,
        language: "uk",
        schemaVersion: 1,
        promptTokens: promptTokens ?? null,
        completionTokens: completionTokens ?? null,
        analysisJson: parsed,
      })
      .returning({
        id: groupAnalyses.id,
        gameIds: groupAnalyses.gameIds,
        analysisJson: groupAnalyses.analysisJson,
        createdAt: groupAnalyses.createdAt,
      });

    if (!saved) {
      console.error("[group-analysis] DB insert returned no row");
      return NextResponse.json({ error: "Не вдалося зберегти аналіз" }, { status: 500 });
    }
    savedRow = saved;
  } catch (err) {
    console.error("[group-analysis] DB insert failed:", err);
    const pgCode = err !== null && typeof err === "object" && "code" in err
      ? (err as { code: string }).code
      : null;
    if (pgCode === "23505") {
      return NextResponse.json({ error: "Аналіз вже виконується" }, { status: 429 });
    }
    return NextResponse.json({ error: "Не вдалося зберегти аналіз" }, { status: 500 });
  }

  return NextResponse.json({
    analysis: {
      id: savedRow.id,
      gameIds: savedRow.gameIds,
      analysisJson: savedRow.analysisJson,
      createdAt: savedRow.createdAt,
    },
  });
}

// ── helpers ─────────────────────────────────────────────────────────────────

type GameRow = {
  id: string;
  result: string;
  color: string;
  opponent: string;
  openingName: string | null;
  timeControlCategory: string;
  playerRating: number | null;
  opponentRating: number | null;
};

async function getLastNGames(n: number, userId: string): Promise<GameRow[]> {
  return db
    .select({
      id: games.id,
      result: games.result,
      color: games.color,
      opponent: games.opponent,
      openingName: games.openingName,
      timeControlCategory: games.timeControlCategory,
      playerRating: games.playerRating,
      opponentRating: games.opponentRating,
    })
    .from(games)
    .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
    .where(eq(chessAccounts.userId, userId))
    .orderBy(desc(games.playedAt))
    .limit(n);
}

async function getGamesByIds(gameIds: string[], userId: string): Promise<GameRow[]> {
  return db
    .select({
      id: games.id,
      result: games.result,
      color: games.color,
      opponent: games.opponent,
      openingName: games.openingName,
      timeControlCategory: games.timeControlCategory,
      playerRating: games.playerRating,
      opponentRating: games.opponentRating,
    })
    .from(games)
    .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
    .where(and(inArray(games.id, gameIds), eq(chessAccounts.userId, userId)));
}

async function buildGameSummaries(rows: GameRow[]): Promise<string[]> {
  const ids = rows.map((g) => g.id);

  // P1-20: DISTINCT ON at SQL level — one row per game, latest first
  const [engineRows, llmRows] = await Promise.all([
    db
      .selectDistinctOn([engineAnalyses.gameId], {
        gameId: engineAnalyses.gameId,
        analysisJson: engineAnalyses.analysisJson,
      })
      .from(engineAnalyses)
      .where(inArray(engineAnalyses.gameId, ids))
      .orderBy(engineAnalyses.gameId, desc(engineAnalyses.createdAt)),
    db
      .selectDistinctOn([gameAnalyses.gameId], {
        gameId: gameAnalyses.gameId,
        analysisJson: gameAnalyses.analysisJson,
      })
      .from(gameAnalyses)
      .where(inArray(gameAnalyses.gameId, ids))
      .orderBy(gameAnalyses.gameId, desc(gameAnalyses.createdAt)),
  ]);

  const engineMap = new Map<string, Record<string, unknown>>();
  for (const r of engineRows) {
    engineMap.set(r.gameId, r.analysisJson as Record<string, unknown>);
  }
  const llmMap = new Map<string, Record<string, unknown>>();
  for (const r of llmRows) {
    llmMap.set(r.gameId, r.analysisJson as Record<string, unknown>);
  }

  return rows.map((g) => {
    const engine = engineMap.get(g.id);
    const llm = llmMap.get(g.id);

    const colorUk = g.color === "white" ? "білими" : "чорними";
    const resultUk =
      g.result === "win" ? "перемога" : g.result === "loss" ? "поразка" : "нічия";

    const lines: string[] = [
      `Партія vs ${g.opponent} (${resultUk}, ${colorUk}, ${g.timeControlCategory}, ${g.openingName ?? "невідомий дебют"})`,
    ];

    if (engine) {
      const acc = engine.accuracy as Record<string, number> | undefined;
      const summary = engine.summary as Record<string, number> | undefined;
      if (acc && typeof acc.player === "number" && typeof acc.opponent === "number") {
        lines.push(
          `Точність: ви ${acc.player.toFixed(1)}%, суперник ${acc.opponent.toFixed(1)}%`
        );
      }
      if (summary) {
        lines.push(
          `Помилки: блундери ${summary.blunderCount}, прорахунки ${summary.mistakeCount}`
        );
      }
    }

    if (llm) {
      const ga = llm.generalAssessment as string | undefined;
      if (ga) lines.push(`Загальна оцінка: ${ga.slice(0, 200)}`);
    }

    return lines.join("\n");
  });
}

const GROUP_SYSTEM_PROMPT = `Ти шаховий тренер, який аналізує серію партій гравця рівня ~1000 ELO.
Зосередься на практичних конкретних порадах. Уникай термінів рівня гросмейстера без пояснення.
Вкажи повторювані закономірності з конкретними доказами. Будь прямим і конструктивним.
Відповідай ВИКЛЮЧНО валідним JSON без markdown-обгортки, без пояснень поза JSON. Мова: ТІЛЬКИ українська.
JSON-схема відповіді (строго дотримуватись):
{
  "version": 1,
  "language": "uk",
  "patterns": ["рядок"],
  "tacticalWeaknesses": [{ "theme": "рядок", "evidence": "рядок", "advice": "рядок" }],
  "strategicWeaknesses": [{ "theme": "рядок", "evidence": "рядок", "advice": "рядок" }],
  "openingAssessment": [{ "openingName": "рядок", "issue": "рядок", "recommendation": "рядок" }],
  "actionPlan": [{ "priority": 1|2|3, "focus": "рядок", "practiceSuggestion": "рядок" }]
}
Вимоги: patterns — 3-5; tacticalWeaknesses — 2-4; strategicWeaknesses — 1-3; openingAssessment — 1-3; actionPlan — рівно 3 з пріоритетами 1, 2, 3.`;

function buildGroupPrompt(summaries: string[]): string {
  const gameBlock = summaries
    .map((s, i) => `--- Партія ${i + 1} ---\n${s}`)
    .join("\n\n");

  return `Проаналізуй наступні ${summaries.length} партій:\n\n${gameBlock}`;
}
