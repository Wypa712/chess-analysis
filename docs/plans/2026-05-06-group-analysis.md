# Фаза 6 — Груповий LLM-аналіз: план реалізації

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Дозволити користувачу вибирати 5–30 партій на дашборді і отримувати єдиний LLM-аналіз повторюваних закономірностей, слабкостей і пріоритизованого плану дій.

**Architecture:** Multi-select стан живе у `GamesList.tsx` (Client Component). Floating action bar з'являється при виборі ≥1 партії, блокується при <5 або >30. POST `/api/analysis/group` отримує масив game_ids, будує стислі summaries, викликає Groq і зберігає результат у `group_analyses`. Результат рендериться у `GroupAnalysisPanel` нижче списку партій.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, CSS Modules, Drizzle ORM, groq-sdk (llama-3.3-70b-versatile), Neon PostgreSQL.

---

## Етап 1 — Верстка (mock-дані, без реального API)

### Task 1: Multi-select стан і чекбокси у GamesList

**Files:**
- Modify: `src/components/GamesList/GamesList.tsx`
- Modify: `src/components/GamesList/GamesList.module.css`

**Step 1: Додати стан вибору у GamesList**

У `GamesList.tsx` після існуючих `useState` додати:

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

function toggleSelect(id: string) {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

function clearSelection() {
  setSelectedIds(new Set());
}
```

**Step 2: Додати чекбокс першою колонкою у рядку партії**

У рядку `<tr>` перед існуючими `<td>` додати:

```tsx
<td className={styles.checkboxCell} onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSelect(game.id); }}>
  <input
    type="checkbox"
    checked={selectedIds.has(game.id)}
    onChange={() => toggleSelect(game.id)}
    className={styles.gameCheckbox}
    aria-label="Вибрати партію"
  />
</td>
```

Зверни увагу: `<tr>` є `<Link>` → чекбокс треба зупиняти propagation через `onClick` на `<td>`.

**Step 3: Додати CSS для чекбоксу і виділеного рядка**

```css
/* GamesList.module.css */
.checkboxCell {
  width: 36px;
  padding: 0 8px;
  vertical-align: middle;
  cursor: pointer;
}

.gameCheckbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent, #4caf78);
  cursor: pointer;
}

.rowSelected {
  background-color: rgba(76, 175, 120, 0.08);
}
```

Додати `rowSelected` до `<tr>` коли `selectedIds.has(game.id)`.

**Step 4: Переконатись, що клік по рядку (Link) не вмикає чекбокс**

`<tr>` рендериться як `<Link>`, тому чекбокс-клік має `e.stopPropagation()` і `e.preventDefault()`.

---

### Task 2: Floating action bar (selection bar)

**Files:**
- Modify: `src/components/GamesList/GamesList.tsx`
- Modify: `src/components/GamesList/GamesList.module.css`

**Step 1: Додати `SelectionBar` компонент (inline у файлі GamesList)**

Рендерується над таблицею, тільки якщо `selectedIds.size > 0`:

```tsx
function SelectionBar({
  count,
  onAnalyze,
  onClear,
  loading,
}: {
  count: number;
  onAnalyze: () => void;
  onClear: () => void;
  loading: boolean;
}) {
  const tooFew = count < 5;
  const tooMany = count > 30;
  const disabled = tooFew || tooMany || loading;

  return (
    <div className={styles.selectionBar}>
      <span className={styles.selectionCount}>
        Вибрано: <strong>{count}</strong>
      </span>
      {tooFew && (
        <span className={styles.selectionHint}>мінімум 5 партій</span>
      )}
      {tooMany && (
        <span className={styles.selectionHint}>максимум 30 партій</span>
      )}
      <button
        className={styles.selectionAnalyzeBtn}
        onClick={onAnalyze}
        disabled={disabled}
      >
        {loading ? "Аналізуємо…" : "Груповий аналіз"}
      </button>
      <button className={styles.selectionClearBtn} onClick={onClear}>
        Скинути
      </button>
    </div>
  );
}
```

**Step 2: CSS для selection bar**

```css
.selectionBar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--surface-2, #1a2e1a);
  border: 1px solid var(--color-accent, #4caf78);
  border-radius: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.selectionCount {
  font-size: 14px;
  color: var(--text-primary, #e8f0e8);
}

.selectionHint {
  font-size: 12px;
  color: var(--text-muted, #7a9a7a);
}

.selectionAnalyzeBtn {
  margin-left: auto;
  padding: 6px 16px;
  background: var(--color-accent, #4caf78);
  color: #0e1a0e;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.selectionAnalyzeBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.selectionClearBtn {
  padding: 6px 12px;
  background: transparent;
  color: var(--text-muted, #7a9a7a);
  border: 1px solid var(--border, #2e4a2e);
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
```

**Step 3: Підключити `SelectionBar` у рендері `GamesList`**

До `<table>` додати:

```tsx
{selectedIds.size > 0 && (
  <SelectionBar
    count={selectedIds.size}
    onAnalyze={handleGroupAnalyze}
    onClear={clearSelection}
    loading={groupAnalyzing}
  />
)}
```

Додати стан: `const [groupAnalyzing, setGroupAnalyzing] = useState(false);`

Stub-функція на цьому етапі: `function handleGroupAnalyze() { /* TODO Task 7 */ }`

---

### Task 3: GroupAnalysisPanel — компонент результату (mock)

**Files:**
- Create: `src/components/GroupAnalysisPanel/GroupAnalysisPanel.tsx`
- Create: `src/components/GroupAnalysisPanel/GroupAnalysisPanel.module.css`

**Step 1: Визначити пропси та mock-дані**

```tsx
// GroupAnalysisPanel.tsx
"use client";

import { useState } from "react";
import styles from "./GroupAnalysisPanel.module.css";
import type { GroupAnalysisJsonV1 } from "@/lib/llm/types";

type Props = {
  analysis: GroupAnalysisJsonV1;
  gameCount: number;
  createdAt: string;
  onReanalyze?: () => void;
  reanalyzing?: boolean;
};
```

**Step 2: Секції панелі**

Структура рендеру (зверху вниз):

1. **Header** — "Груповий аналіз · N партій · дата · кнопка «Повторити»"
2. **Patterns** — список `analysis.patterns` (нумерований список)
3. **Tactical Weaknesses** — accordion-секції з `theme` / `evidence` / `advice`
4. **Strategic Weaknesses** — те саме
5. **Opening Assessment** — список `openingName` + `issue` + `recommendation`
6. **Action Plan** — 3 картки з priority badge (1/2/3), `focus`, `practiceSuggestion`

```tsx
export function GroupAnalysisPanel({ analysis, gameCount, createdAt, onReanalyze, reanalyzing }: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setOpenSections(p => ({ ...p, [key]: !p[key] }));
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Груповий аналіз · {gameCount} партій</h3>
        <span className={styles.date}>{new Date(createdAt).toLocaleDateString("uk-UA")}</span>
        {onReanalyze && (
          <button className={styles.reanalyzeBtn} onClick={onReanalyze} disabled={reanalyzing}>
            {reanalyzing ? "Аналізуємо…" : "Повторити"}
          </button>
        )}
      </div>

      {/* Patterns */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Повторювані закономірності</h4>
        <ol className={styles.patternList}>
          {analysis.patterns.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
      </div>

      {/* Tactical Weaknesses */}
      <WeaknessAccordion
        title="Тактичні слабкості"
        items={analysis.tacticalWeaknesses}
        sectionKey="tactical"
        open={!!openSections["tactical"]}
        onToggle={() => toggle("tactical")}
      />

      {/* Strategic Weaknesses */}
      <WeaknessAccordion
        title="Стратегічні слабкості"
        items={analysis.strategicWeaknesses}
        sectionKey="strategic"
        open={!!openSections["strategic"]}
        onToggle={() => toggle("strategic")}
      />

      {/* Opening Assessment */}
      {analysis.openingAssessment.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Оцінка дебютів</h4>
          <ul className={styles.openingList}>
            {analysis.openingAssessment.map((o, i) => (
              <li key={i} className={styles.openingItem}>
                <strong>{o.openingName}</strong>
                <span className={styles.openingIssue}>{o.issue}</span>
                <span className={styles.openingRec}>{o.recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Plan */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>План дій</h4>
        <div className={styles.actionPlanGrid}>
          {analysis.actionPlan.map((a, i) => (
            <div key={i} className={styles.actionCard}>
              <span className={`${styles.priorityBadge} ${styles[`priority${a.priority}`]}`}>
                {a.priority}
              </span>
              <strong className={styles.actionFocus}>{a.focus}</strong>
              <p className={styles.actionSuggestion}>{a.practiceSuggestion}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WeaknessAccordion({ title, items, sectionKey, open, onToggle }: {
  title: string;
  items: GroupAnalysisJsonV1["tacticalWeaknesses"];
  sectionKey: string;
  open: boolean;
  onToggle: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className={styles.accordion}>
      <button className={styles.accordionHeader} onClick={onToggle} aria-expanded={open}>
        <span>{title}</span>
        <span className={styles.accordionIcon}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className={styles.weaknessList}>
          {items.map((w, i) => (
            <li key={i} className={styles.weaknessItem}>
              <strong className={styles.weaknessTheme}>{w.theme}</strong>
              <span className={styles.weaknessEvidence}>{w.evidence}</span>
              <span className={styles.weaknessAdvice}>{w.advice}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Step 3: CSS файл**

```css
/* GroupAnalysisPanel.module.css */
.panel {
  border: 1px solid var(--border, #2e4a2e);
  border-radius: 8px;
  padding: 20px;
  background: var(--surface-1, #141f14);
  margin-top: 24px;
}

.header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e8f0e8);
  margin: 0;
}

.date {
  font-size: 12px;
  color: var(--text-muted, #7a9a7a);
}

.reanalyzeBtn {
  margin-left: auto;
  padding: 5px 12px;
  background: transparent;
  border: 1px solid var(--border, #2e4a2e);
  border-radius: 4px;
  color: var(--text-secondary, #b0c8b0);
  font-size: 13px;
  cursor: pointer;
}

.reanalyzeBtn:disabled { opacity: 0.4; cursor: not-allowed; }

.section {
  margin-bottom: 20px;
}

.sectionTitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent, #4caf78);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 10px;
}

.patternList {
  padding-left: 18px;
  margin: 0;
  color: var(--text-secondary, #b0c8b0);
  font-size: 14px;
  line-height: 1.6;
}

.accordion {
  margin-bottom: 12px;
  border: 1px solid var(--border, #2e4a2e);
  border-radius: 6px;
  overflow: hidden;
}

.accordionHeader {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--surface-2, #1a2e1a);
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8f0e8);
}

.accordionIcon { font-size: 10px; color: var(--text-muted, #7a9a7a); }

.weaknessList {
  list-style: none;
  padding: 12px 14px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weaknessItem {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
}

.weaknessTheme { color: var(--text-primary, #e8f0e8); font-weight: 600; }
.weaknessEvidence { color: var(--text-secondary, #b0c8b0); }
.weaknessAdvice { color: var(--color-accent, #4caf78); }

.openingList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.openingItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  padding: 8px 12px;
  background: var(--surface-2, #1a2e1a);
  border-radius: 4px;
}

.openingIssue { color: var(--text-secondary, #b0c8b0); }
.openingRec { color: var(--color-accent, #4caf78); }

.actionPlanGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.actionCard {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--border, #2e4a2e);
  border-radius: 6px;
  font-size: 13px;
}

.priorityBadge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
}

.priority1 { background: #e05555; color: #fff; }
.priority2 { background: #e09055; color: #fff; }
.priority3 { background: #4caf78; color: #0e1a0e; }

.actionFocus { color: var(--text-primary, #e8f0e8); font-size: 14px; }
.actionSuggestion { color: var(--text-secondary, #b0c8b0); line-height: 1.5; }
```

**Step 4: Підключити `GroupAnalysisPanel` у dashboard з mock-даними**

У `src/app/dashboard/page.tsx` (або де рендериться `GamesList`) нижче `<GamesList>` додати:

```tsx
{/* TODO Task 8 — замінити mock на реальний стан */}
{process.env.NODE_ENV === "development" && false && (
  <GroupAnalysisPanel
    analysis={MOCK_GROUP_ANALYSIS}
    gameCount={10}
    createdAt={new Date().toISOString()}
  />
)}
```

Mock треба тільки для локальної перевірки верстки, у виробничий код не ввімкнено.

---

## Етап 2 — Функціонал (реальний LLM + API)

### Task 4: Тип `GroupAnalysisJsonV1` і валідатор

**Files:**
- Modify: `src/lib/llm/types.ts`

**Step 1: Додати тип**

```ts
export type GroupAnalysisJsonV1 = {
  version: 1;
  language: "uk";
  patterns: string[];
  tacticalWeaknesses: Array<{
    theme: string;
    evidence: string;
    advice: string;
  }>;
  strategicWeaknesses: Array<{
    theme: string;
    evidence: string;
    advice: string;
  }>;
  openingAssessment: Array<{
    openingName: string;
    issue: string;
    recommendation: string;
  }>;
  actionPlan: Array<{
    priority: 1 | 2 | 3;
    focus: string;
    practiceSuggestion: string;
  }>;
};
```

**Step 2: Додати валідатор `isGroupAnalysisJsonV1`**

```ts
export function isGroupAnalysisJsonV1(value: unknown): value is GroupAnalysisJsonV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || v.language !== "uk") return false;
  if (!Array.isArray(v.patterns) || !v.patterns.every((p: unknown) => typeof p === "string")) return false;

  function isWeaknessArray(arr: unknown): boolean {
    if (!Array.isArray(arr)) return false;
    return arr.every((w: unknown) => {
      if (!w || typeof w !== "object") return false;
      const x = w as Record<string, unknown>;
      return typeof x.theme === "string" && typeof x.evidence === "string" && typeof x.advice === "string";
    });
  }

  if (!isWeaknessArray(v.tacticalWeaknesses)) return false;
  if (!isWeaknessArray(v.strategicWeaknesses)) return false;

  if (!Array.isArray(v.openingAssessment)) return false;
  if (!v.openingAssessment.every((o: unknown) => {
    if (!o || typeof o !== "object") return false;
    const x = o as Record<string, unknown>;
    return typeof x.openingName === "string" && typeof x.issue === "string" && typeof x.recommendation === "string";
  })) return false;

  if (!Array.isArray(v.actionPlan)) return false;
  if (!v.actionPlan.every((a: unknown) => {
    if (!a || typeof a !== "object") return false;
    const x = a as Record<string, unknown>;
    return (x.priority === 1 || x.priority === 2 || x.priority === 3) &&
      typeof x.focus === "string" && typeof x.practiceSuggestion === "string";
  })) return false;

  return true;
}
```

---

### Task 5: POST `/api/analysis/group` route

**Files:**
- Create: `src/app/api/analysis/group/route.ts`

**Step 1: Структура route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chessAccounts, engineAnalyses, gameAnalyses, games, groupAnalyses } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import Groq from "groq-sdk";
import { isGroupAnalysisJsonV1 } from "@/lib/llm/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LLM_MODEL = "llama-3.3-70b-versatile";
const MIN_GAMES = 5;
const MAX_GAMES = 30;
```

**Step 2: POST handler**

```ts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const gameIds: unknown = body?.gameIds;

  if (!Array.isArray(gameIds) ||
      gameIds.length < MIN_GAMES ||
      gameIds.length > MAX_GAMES ||
      !gameIds.every((id) => typeof id === "string" && UUID_RE.test(id))) {
    return NextResponse.json(
      { error: `Виберіть від ${MIN_GAMES} до ${MAX_GAMES} партій` },
      { status: 400 }
    );
  }

  const ownedGames = await getOwnedGames(gameIds as string[], userId);
  if (ownedGames.length !== gameIds.length) {
    return NextResponse.json({ error: "Деякі партії не знайдено" }, { status: 403 });
  }

  const summaries = await buildGameSummaries(ownedGames);
  const prompt = buildGroupPrompt(summaries);
  const analysisJson = await callLlm(prompt);

  const [saved] = await db.insert(groupAnalyses).values({
    userId,
    gameIds: gameIds as string[],
    llmModel: LLM_MODEL,
    language: "uk",
    schemaVersion: 1,
    analysisJson,
  }).returning();

  return NextResponse.json({ analysis: saved });
}
```

**Step 3: `getOwnedGames` — завантаження партій з перевіркою ownership**

```ts
async function getOwnedGames(gameIds: string[], userId: string) {
  return db
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
      playedAt: games.playedAt,
    })
    .from(games)
    .innerJoin(chessAccounts, eq(games.chessAccountId, chessAccounts.id))
    .where(and(
      inArray(games.id, gameIds),
      eq(chessAccounts.userId, userId),
    ));
}
```

**Step 4: `buildGameSummaries` — стислі зведення без повних PGN**

```ts
type GameRow = Awaited<ReturnType<typeof getOwnedGames>>[number];

async function buildGameSummaries(rows: GameRow[]): Promise<string[]> {
  return Promise.all(rows.map(async (g) => {
    const engineRow = await db
      .select({ analysisJson: engineAnalyses.analysisJson })
      .from(engineAnalyses)
      .where(eq(engineAnalyses.gameId, g.id))
      .orderBy(desc(engineAnalyses.createdAt))
      .limit(1);

    const llmRow = await db
      .select({ analysisJson: gameAnalyses.analysisJson })
      .from(gameAnalyses)
      .where(eq(gameAnalyses.gameId, g.id))
      .orderBy(desc(gameAnalyses.createdAt))
      .limit(1);

    const engine = engineRow[0]?.analysisJson as Record<string, unknown> | null;
    const llm = llmRow[0]?.analysisJson as Record<string, unknown> | null;

    const lines = [
      `Партія vs ${g.opponent} (${g.result}, ${g.color}, ${g.timeControlCategory}, ${g.openingName ?? "невідомий дебют"})`,
    ];

    if (engine) {
      const acc = engine.accuracy as Record<string, number> | undefined;
      const summary = engine.summary as Record<string, number> | undefined;
      if (acc) lines.push(`Точність: ви ${acc.player?.toFixed(1)}%, суперник ${acc.opponent?.toFixed(1)}%`);
      if (summary) lines.push(`Помилки: блундери ${summary.blunderCount}, прорахунки ${summary.mistakeCount}`);
    }

    if (llm) {
      const generalAssessment = llm.generalAssessment as string | undefined;
      if (generalAssessment) lines.push(`Загальна оцінка: ${generalAssessment.slice(0, 200)}`);
    }

    return lines.join("\n");
  }));
}
```

**Step 5: `buildGroupPrompt`**

```ts
function buildGroupPrompt(summaries: string[]): string {
  const systemPrompt = `You are a chess coach analyzing a batch of games for a ~1000 ELO player.
Focus on practical, actionable advice. Avoid grandmaster-level concepts.
Point out recurring patterns with specific evidence. Be direct and constructive.
Respond in Ukrainian.
Return strict JSON matching the requested schema. No markdown, no extra fields.`;

  const schema = `{
  "version": 1,
  "language": "uk",
  "patterns": ["string", ...],
  "tacticalWeaknesses": [{ "theme": "string", "evidence": "string", "advice": "string" }, ...],
  "strategicWeaknesses": [{ "theme": "string", "evidence": "string", "advice": "string" }, ...],
  "openingAssessment": [{ "openingName": "string", "issue": "string", "recommendation": "string" }, ...],
  "actionPlan": [{ "priority": 1|2|3, "focus": "string", "practiceSuggestion": "string" }, ...]
}`;

  const gameBlock = summaries.map((s, i) => `--- Партія ${i + 1} ---\n${s}`).join("\n\n");

  return `${systemPrompt}\n\nПроаналізуй наступні ${summaries.length} партій:\n\n${gameBlock}\n\nJSON-схема відповіді:\n${schema}`;
}
```

**Step 6: `callLlm` — виклик Groq з валідацією**

```ts
async function callLlm(prompt: string) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const response = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 2048,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM повернув некоректний JSON");
  }

  if (!isGroupAnalysisJsonV1(parsed)) {
    throw new Error("LLM відповідь не відповідає схемі GroupAnalysisJsonV1");
  }

  return parsed;
}
```

**Step 7: Обробка помилок у POST handler**

Обернути виклик `callLlm` у try/catch:

```ts
let analysisJson;
try {
  analysisJson = await callLlm(prompt);
} catch (err) {
  console.error("[group-analysis] LLM error:", err);
  return NextResponse.json(
    { error: "Не вдалося отримати аналіз. Спробуйте ще раз." },
    { status: 502 }
  );
}
```

---

### Task 6: GET `/api/analysis/group` — останній кешований результат

**Files:**
- Modify: `src/app/api/analysis/group/route.ts`

**Step 1: Додати GET handler**

```ts
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(groupAnalyses)
    .where(eq(groupAnalyses.userId, session.user.id))
    .orderBy(desc(groupAnalyses.createdAt))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ analysis: null });

  return NextResponse.json({ analysis: rows[0] });
}
```

---

### Task 7: Схема — перевірити `group_analyses` у Drizzle

**Files:**
- Read: `src/db/schema.ts`
- Modify if needed: `src/db/schema.ts`

**Step 1: Перевірити що `groupAnalyses` таблиця вже є у схемі**

Відкрити `src/db/schema.ts` і переконатись, що є:

```ts
export const groupAnalyses = pgTable("group_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gameIds: uuid("game_ids").array().notNull(),
  llmModel: text("llm_model").notNull(),
  language: analysisLanguage("language").notNull(),
  schemaVersion: integer("schema_version").notNull(),
  inputHash: text("input_hash"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  analysisJson: jsonb("analysis_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Якщо поля відрізняються або таблиці немає — привести у відповідність і запустити міграцію.

**Step 2: Запустити міграцію якщо потрібно**

```
npm.cmd run db:generate
npm.cmd run db:migrate
```

---

### Task 8: Підключити group analysis у `GamesList` / dashboard

**Files:**
- Modify: `src/components/GamesList/GamesList.tsx`
- Modify: `src/app/dashboard/page.tsx` (або файл де живе dashboard layout)

**Step 1: Завантаження кешованого аналізу при mount**

У `GamesList.tsx` або в dashboard page:

```tsx
const [groupAnalysis, setGroupAnalysis] = useState<GroupAnalysisResult | null>(null);
const [groupAnalysisLoading, setGroupAnalysisLoading] = useState(true);

useEffect(() => {
  fetch("/api/analysis/group")
    .then(r => r.json())
    .then(data => setGroupAnalysis(data.analysis ?? null))
    .catch(() => {})
    .finally(() => setGroupAnalysisLoading(false));
}, []);
```

Де `GroupAnalysisResult`:

```ts
type GroupAnalysisResult = {
  id: string;
  gameIds: string[];
  analysisJson: GroupAnalysisJsonV1;
  createdAt: string;
};
```

**Step 2: `handleGroupAnalyze` — реальний POST**

```tsx
async function handleGroupAnalyze() {
  if (selectedIds.size < 5 || selectedIds.size > 30) return;
  setGroupAnalyzing(true);
  try {
    const res = await fetch("/api/analysis/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameIds: Array.from(selectedIds) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setGroupAnalysisError(data.error ?? "Помилка аналізу");
      return;
    }
    setGroupAnalysis(data.analysis);
    clearSelection();
  } catch {
    setGroupAnalysisError("Мережева помилка. Спробуйте ще раз.");
  } finally {
    setGroupAnalyzing(false);
  }
}
```

Додати стан: `const [groupAnalysisError, setGroupAnalysisError] = useState<string | null>(null);`

**Step 3: Рендерити `GroupAnalysisPanel` та error state**

```tsx
{groupAnalysisError && (
  <div className={styles.groupError}>{groupAnalysisError}</div>
)}

{groupAnalysis && (
  <GroupAnalysisPanel
    analysis={groupAnalysis.analysisJson}
    gameCount={groupAnalysis.gameIds.length}
    createdAt={groupAnalysis.createdAt}
    onReanalyze={() => { /* відкрити selection mode */ }}
  />
)}
```

CSS для `.groupError`:

```css
.groupError {
  padding: 10px 14px;
  background: rgba(224, 85, 85, 0.1);
  border: 1px solid rgba(224, 85, 85, 0.4);
  border-radius: 6px;
  color: #e08080;
  font-size: 14px;
  margin-top: 8px;
}
```

---

### Task 9: Оновити `progress-tracker.md`

**Files:**
- Modify: `spec/progress-tracker.md`

**Step 1: Відмітити виконані пункти Фази 6**

```markdown
### Фаза 6 — Груповий LLM-аналіз

- [x] Додати multi-select для партій.
- [x] Обмежити вибір до 5-30 партій.
- [x] Формувати стислі зведення партій.
- [x] Додавати engine-дані і попередні LLM-нотатки, якщо вони є.
- [x] Визначити strict JSON schema для group analysis.
- [x] Генерувати український груповий аналіз.
- [x] Зберігати аналіз у `group_analyses`.
```

**Step 2: Додати рядок у журнал рішень**

```markdown
| 2026-05-06 | Фаза 6: груповий аналіз живе в GamesList (selection bar + GroupAnalysisPanel); кешований результат завантажується при відкритті дашборду; GET повертає останній запис user_id. |
```

---

## Порядок виконання

```
Етап 1 (верстка):
  Task 1 → Task 2 → Task 3 → перевірка у браузері

Етап 2 (функціонал):
  Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9
```

Tasks 4 і 5 можна виконувати паралельно.

## Перевірка готовності

- [ ] Чекбокси з'являються у кожному рядку GamesList
- [ ] Selection bar з'являється при ≥1 вибраній партії
- [ ] Кнопка "Груповий аналіз" недоступна при <5 або >30 партіях
- [ ] POST `/api/analysis/group` повертає результат з Groq
- [ ] Результат зберігається у `group_analyses` і завантажується при повторному відкритті
- [ ] `GroupAnalysisPanel` рендерить усі секції: patterns, weaknesses × 2, openings, action plan
- [ ] Помилка LLM показується у UI без крашу
- [ ] Верстка коректна на desktop і mobile
