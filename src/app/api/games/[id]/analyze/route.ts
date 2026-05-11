import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, engineAnalyses, gameAnalyses, games, llmRequestLocks } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import Groq from "groq-sdk";
import { isLlmGameAnalysisV1, type LlmGameAnalysisV1 } from "@/lib/llm/types";
import type { EngineAnalysisJsonV1 } from "@/lib/chess/engine-analysis";
import { retryWithBackoff } from "@/lib/retry";
import { captureSanitizedException } from "@/lib/observability/sentry";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LLM_MODEL = "llama-3.3-70b-versatile";
const GAME_PROMPT_VERSION = "game-analysis-v1";
const LOCK_TTL_MS = 2 * 60 * 1000;

// P0-3: module-level client so HTTP connections are reused across warm invocations
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

async function getOwnedGame(gameId: string, userId: string) {
  const rows = await db
    .select({
      id: games.id,
      pgn: games.pgn,
      result: games.result,
      color: games.color,
      opponent: games.opponent,
      openingName: games.openingName,
      timeControl: games.timeControl,
      timeControlCategory: games.timeControlCategory,
      moveCount: games.moveCount,
      playerRating: games.playerRating,
      opponentRating: games.opponentRating,
    })
    .from(games)
    .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
    .where(and(eq(games.id, gameId), eq(chessAccounts.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function getCachedEngineAnalysis(gameId: string): Promise<EngineAnalysisJsonV1 | null> {
  const rows = await db
    .select({ analysisJson: engineAnalyses.analysisJson })
    .from(engineAnalyses)
    .where(eq(engineAnalyses.gameId, gameId))
    .orderBy(desc(engineAnalyses.createdAt))
    .limit(1);
  return (rows[0]?.analysisJson as EngineAnalysisJsonV1) ?? null;
}

async function acquireLlmLock(lockKey: string, userId: string, scope: string): Promise<boolean> {
  await db
    .delete(llmRequestLocks)
    .where(sql`${llmRequestLocks.expiresAt} < NOW()`);

  const rows = await db
    .insert(llmRequestLocks)
    .values({
      lockKey,
      userId,
      scope,
      expiresAt: new Date(Date.now() + LOCK_TTL_MS),
    })
    .onConflictDoNothing()
    .returning({ lockKey: llmRequestLocks.lockKey });

  return rows.length > 0;
}

async function releaseLlmLock(lockKey: string, userId: string): Promise<void> {
  try {
    await db
      .delete(llmRequestLocks)
      .where(and(eq(llmRequestLocks.lockKey, lockKey), eq(llmRequestLocks.userId, userId)));
  } catch (err) {
    console.error("[LLM] lock release failed:", err);
  }
}

const SYSTEM_PROMPT = `Ти шаховий тренер. Відповідай ВИКЛЮЧНО валідним JSON без markdown-обгортки.
Мова відповіді: ТІЛЬКИ українська.
JSON має точно відповідати схемі:
{
  "version": 1,
  "language": "uk",
  "generalAssessment": "рядок — загальна оцінка партії 2-4 речення",
  "opening": { "summary": "рядок", "keyMistakes": ["рядок"] },
  "middlegame": { "summary": "рядок", "tacticalMisses": ["рядок"], "positionalIssues": ["рядок"] },
  "endgame": { "reached": true або false, "summary": "рядок або відсутнє" },
  "criticalMoments": [{ "moveNumber": число, "color": "white"|"black", "move": "SAN або null", "description": "рядок", "recommendation": "рядок" }],
  "recommendations": [{ "title": "рядок", "description": "рядок", "priority": 1|2|3 }]
}
Вимоги: criticalMoments — до 3 моментів; recommendations — 2-3 поради для ~1000 ELO; без термінів рівня гросмейстера без пояснення.`;

function buildUserMessage(
  game: NonNullable<Awaited<ReturnType<typeof getOwnedGame>>>,
  engineAnalysis: EngineAnalysisJsonV1 | null
): string {
  const colorUk = game.color === "white" ? "білими" : "чорними";
  const resultUk =
    game.result === "win" ? "перемога" : game.result === "loss" ? "поразка" : "нічия";

  const lines: string[] = [
    `Партія: ${game.openingName ?? "невідомий дебют"}`,
    `Гравець грав: ${colorUk}`,
    `Результат: ${resultUk}`,
    `Суперник: ${game.opponent}`,
    game.playerRating ? `Рейтинг гравця: ${game.playerRating}` : "",
    game.opponentRating ? `Рейтинг суперника: ${game.opponentRating}` : "",
    `Контроль часу: ${game.timeControlCategory} (${game.timeControl ?? "невідомо"})`,
    `Кількість ходів: ${game.moveCount}`,
    "",
    "PGN партії:",
    game.pgn,
  ].filter(Boolean);

  if (engineAnalysis) {
    lines.push("");
    lines.push(
      `Точність гравця: ${engineAnalysis.accuracy.player.toFixed(1)}%`,
      `Точність суперника: ${engineAnalysis.accuracy.opponent.toFixed(1)}%`,
      `Бліци: ${engineAnalysis.summary.blunderCount}, Помилки: ${engineAnalysis.summary.mistakeCount}, Неточності: ${engineAnalysis.summary.inaccuracyCount}`
    );

    if (engineAnalysis.keyMoments.length > 0) {
      lines.push("", "Ключові моменти (Stockfish):");
      for (const km of engineAnalysis.keyMoments) {
        lines.push(`- Хід ${km.moveNumber} (${km.color === "white" ? "білі" : "чорні"}): ${km.title} — ${km.description}`);
      }
    }
  } else {
    lines.push("", "Примітка: дані Stockfish-аналізу відсутні. Аналізуй лише за PGN.");
  }

  return lines.join("\n");
}

function createGameInputHash(
  game: NonNullable<Awaited<ReturnType<typeof getOwnedGame>>>,
  engineAnalysis: EngineAnalysisJsonV1 | null
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      model: LLM_MODEL,
      promptVersion: GAME_PROMPT_VERSION,
      game,
      engineAnalysis,
    }))
    .digest("hex");
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

  try {
    const ownedGame = await getOwnedGame(id, session.user.id);
    if (!ownedGame) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rows = await db
      .select({ analysisJson: gameAnalyses.analysisJson })
      .from(gameAnalyses)
      .where(eq(gameAnalyses.gameId, id))
      .orderBy(desc(gameAnalyses.createdAt))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ analysis: null });
    }

    return NextResponse.json({ analysis: rows[0].analysisJson });
  } catch (error) {
    console.error("[LLM] GET analyze failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

  if (!groq) {
    return NextResponse.json({ error: "LLM not configured" }, { status: 503 });
  }

  // Rate-limit: one LLM analysis per game per 30 seconds
  const recentRows = await db
    .select({ id: gameAnalyses.id })
    .from(gameAnalyses)
    .where(and(
      eq(gameAnalyses.gameId, id),
      sql`${gameAnalyses.createdAt} > NOW() - INTERVAL '30 seconds'`
    ))
    .limit(1);
  if (recentRows.length > 0) {
    return NextResponse.json({ error: "Too many requests. Please wait before re-analyzing." }, { status: 429 });
  }

  const engineAnalysis = await getCachedEngineAnalysis(id);
  const userMessage = buildUserMessage(ownedGame, engineAnalysis);
  const inputHash = createGameInputHash(ownedGame, engineAnalysis);
  const lockKey = `game-analysis:${id}:${inputHash}`;
  const lockAcquired = await acquireLlmLock(lockKey, session.user.id, "game-analysis");
  if (!lockAcquired) {
    return NextResponse.json(
      { error: "Analysis already in progress" },
      { status: 429 }
    );
  }

  try {

  let rawText: string;
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;

  // Shared AbortController — one deadline for all retry attempts
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const completion = await retryWithBackoff(() =>
      groq!.chat.completions.create(
        {
          model: LLM_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: "json_object" },
        },
        { signal: controller.signal }
      )
    );
    rawText = completion.choices[0]?.message?.content ?? "";
    promptTokens = completion.usage?.prompt_tokens;
    completionTokens = completion.usage?.completion_tokens;
  } catch (err) {
    const isAbort = err instanceof Error && (err.name === "AbortError" || err.message.toLowerCase().includes("abort"));
    console.error("[LLM] generateContent failed:", err);
    if (!isAbort) {
      captureSanitizedException(err, "LlmGameAnalysisRequestFailed", {
        route: "/api/games/[id]/analyze",
        provider: "groq",
        model: LLM_MODEL,
      });
    }
    return NextResponse.json(
      { error: isAbort ? "LLM timeout" : "LLM request failed" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }

  // Strip possible markdown fences the model might add despite instructions
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[LLM] JSON parse failed. Raw:", rawText.slice(0, 500));
    return NextResponse.json(
      { error: "LLM returned invalid JSON" },
      { status: 502 }
    );
  }

  if (!isLlmGameAnalysisV1(parsed)) {
    console.error("[LLM] Schema validation failed. Parsed:", JSON.stringify(parsed).slice(0, 500));
    return NextResponse.json(
      { error: "LLM response does not match expected schema" },
      { status: 502 }
    );
  }

  const analysis = parsed as LlmGameAnalysisV1;

  try {
    const [inserted] = await db
      .insert(gameAnalyses)
      .values({
        gameId: id,
        llmModel: LLM_MODEL,
        language: "uk",
        schemaVersion: 1,
        inputHash,
        promptTokens: promptTokens ?? null,
        completionTokens: completionTokens ?? null,
        analysisJson: analysis,
      })
      .returning({ analysisJson: gameAnalyses.analysisJson });

    return NextResponse.json({ analysis: inserted.analysisJson });
  } catch (err) {
    console.error("[DB] Failed to save game analysis:", err);
    const pgCode = err !== null && typeof err === "object" && "code" in err
      ? (err as { code: string }).code
      : null;
    if (pgCode === "23505") {
      return NextResponse.json({ error: "Analysis already in progress" }, { status: 429 });
    }
    return NextResponse.json(
      { error: "Failed to save analysis" },
      { status: 500 }
    );
  }
  } finally {
    await releaseLlmLock(lockKey, session.user.id);
  }
}
