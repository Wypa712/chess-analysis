# Review Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Додати три UX-покращення до game review: навігація `[`/`]` між ключовими моментами, фазові мітки з accuracy на eval chart, збільшені mobile touch-targets для крапок chart, та MultiPV (топ-3 ходи) в explore mode.

**Architecture:**
- `[`/`]` — розширення існуючого keyboard handler, uses готовий `keyMoments` масив.
- Phase accuracy — чиста helper-функція `calcPhaseAccuracy`, передається в `EvalChart` як новий prop; вертикальні пунктирні лінії + рядок цифр під SVG.
- Mobile dots — два кола замість одного (`r=10` transparent hit area + `r=2.5` visible).
- MultiPV — окремий `analyzePositionMultiPV` в `useStockfish.ts` з UCI `MultiPV 3`; кандидати відображаються в правій панелі (`analysisPanel`) в explore mode; стрілки на дошці 3 шт. з opacity що зменшується.

**Tech Stack:** Next.js 15, React, TypeScript, CSS Modules, SVG, Stockfish WASM UCI protocol

---

## Фазові межі (константи, визначаються в GameView.tsx)

```ts
const PHASE_OPENING_END_PLY   = 21;  // ply 1–20  = дебют (ходи 1–10)
const PHASE_MIDDLEGAME_END_PLY = 61;  // ply 21–60 = мідлгейм (ходи 11–30)
                                       // ply 61+   = ендшпіль
```

---

### Task 1: `[` / `]` — клавіатурна навігація між ключовими моментами

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx` (keyboard handler, ~L186)

**Step 1: Знайти існуючий `useEffect` з `handleKey`**

У `GameView.tsx` (~L186) є:
```tsx
useEffect(() => {
  function handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      exitExploreIfActive();
      setCurrentMove((m) => Math.max(-1, m - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      exitExploreIfActive();
      setCurrentMove((m) => Math.min(totalMoves - 1, m + 1));
    }
  }
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [totalMoves, exitExploreIfActive]);
```

**Step 2: Додати гілки `[` і `]`**

Замінити весь `useEffect` наступним кодом. Зверни увагу: `analysis` і `currentMove` потрапляють у closure — їх треба додати в deps array:

```tsx
useEffect(() => {
  function handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      exitExploreIfActive();
      setCurrentMove((m) => Math.max(-1, m - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      exitExploreIfActive();
      setCurrentMove((m) => Math.min(totalMoves - 1, m + 1));
    } else if (e.key === "[") {
      // Попередній ключовий момент: останній km де km.ply - 1 < currentMove
      e.preventDefault();
      if (!analysis) return;
      const prev = [...analysis.keyMoments]
        .reverse()
        .find((km) => km.ply - 1 < currentMove);
      if (prev !== undefined) seekMainline(prev.ply - 1);
    } else if (e.key === "]") {
      // Наступний ключовий момент: перший km де km.ply - 1 > currentMove
      e.preventDefault();
      if (!analysis) return;
      const next = analysis.keyMoments.find((km) => km.ply - 1 > currentMove);
      if (next !== undefined) seekMainline(next.ply - 1);
    }
  }
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [totalMoves, exitExploreIfActive, seekMainline, analysis, currentMove]);
```

Пояснення логіки:
- `km.ply` — це ply ходу що спричинив ключовий момент (1-indexed)
- `seekMainline(km.ply - 1)` — переходить до того ходу в `currentMove` (0-indexed)
- `[` шукає reverse-пошуком: останній момент ДО поточного
- `]` шукає forward-пошуком: перший момент ПІСЛЯ поточного
- Обидва — no-op якщо нема куди йти (немає `analysis` або нема моментів по той бік)

**Step 3: Перевірити в браузері**

1. Відкрити партію де вже є Stockfish аналіз
2. Перейти до початку (`Home` або кнопка ← до кінця)
3. Натиснути `]` кілька разів — cursor стрибає до ключових моментів вперед
4. Натиснути `[` — cursor іде назад між моментами
5. Перевірити що на першому/останньому моменті — no-op (нічого не відбувається)
6. Переконатись що explore mode вимикається при `]`/`[` якщо був активний

**Step 4: Commit**

```
git add src/app/games/[id]/GameView.tsx
git commit -m "feat: [ / ] keyboard shortcuts to jump between key moments"
```

---

### Task 2: `calcPhaseAccuracy` helper

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx` (додати constants + helper перед компонентом, + `useMemo` всередині)

**Step 1: Додати константи і helper перед `export function GameView`**

Одразу перед рядком `export function GameView...` вставити:

```ts
const PHASE_OPENING_END_PLY    = 21;
const PHASE_MIDDLEGAME_END_PLY  = 61;

function calcPhaseAccuracy(
  moves: EngineAnalysisJsonV1["moves"],
  color: "white" | "black",
  fromPly: number,
  toPly: number
): number | null {
  const losses = moves
    .filter(
      (m) =>
        m.color === color &&
        m.ply >= fromPly &&
        m.ply < toPly &&
        m.winProbabilityLoss !== undefined
    )
    .map((m) => m.winProbabilityLoss!);
  if (losses.length === 0) return null;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
  const raw = 103.1668 * Math.exp(-0.04354 * avgLoss) - 3.1669;
  return Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
}
```

Ця функція — та сама Chess.com-формула що вже є в `useStockfish.ts` для загальної accuracy, але застосована до підмножини ходів за фазою і кольором.

**Step 2: Додати `phaseAccuracy` useMemo всередині компонента**

Одразу після `const currentMoveAnalysis = ...` (~L125) додати:

```tsx
const phaseAccuracy = useMemo(() => {
  if (!analysis) return null;
  const phases = [
    { from: 1,                       to: PHASE_OPENING_END_PLY },
    { from: PHASE_OPENING_END_PLY,   to: PHASE_MIDDLEGAME_END_PLY },
    { from: PHASE_MIDDLEGAME_END_PLY, to: Infinity },
  ];
  return phases.map((p) => ({
    white: calcPhaseAccuracy(analysis.moves, "white", p.from, p.to),
    black: calcPhaseAccuracy(analysis.moves, "black", p.from, p.to),
  }));
}, [analysis]);
```

Результат: `Array<{ white: number | null; black: number | null }> | null` де [0] = дебют, [1] = мідлгейм, [2] = ендшпіль. `null` коли нема ходів цього кольору у фазі (напр., гра закінчилась раніше).

**Step 3: Не комітити окремо** — Task 3 одразу підключить `phaseAccuracy` до `EvalChart`.

---

### Task 3: EvalChart — фазові роздільники і accuracy рядок

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx` (EvalChart props type, JSX всередині EvalChart, виклик EvalChart)
- Modify: `src/app/games/[id]/GameView.module.css` (новий .phaseAccuracyRow + дочірні класи)

**Step 1: Оновити тип props `EvalChart`**

Знайти `function EvalChart({` (~L884) і розширити тип:

```tsx
function EvalChart({
  evals,
  currentIndex,
  onSeek,
  keyMoments = [],
  phaseAccuracy = null,
}: {
  evals: number[];
  currentIndex: number;
  onSeek: (i: number) => void;
  keyMoments?: EngineAnalysisJsonV1["keyMoments"];
  phaseAccuracy?: Array<{ white: number | null; black: number | null }> | null;
}) {
```

**Step 2: Додати фазові вертикальні лінії в SVG**

Знайти блок `{/* Key moment dots */}` і одразу ПЕРЕД ним вставити:

```tsx
{/* Phase dividers */}
{n >= 2 && [PHASE_OPENING_END_PLY, PHASE_MIDDLEGAME_END_PLY]
  .filter((divPly) => divPly < n)
  .map((divPly) => {
    const x = AXIS_W + (divPly / (n - 1)) * CHART_CONTENT_W;
    return (
      <line
        key={divPly}
        x1={x} y1={0}
        x2={x} y2={CHART_H}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1}
        strokeDasharray="2,2"
      />
    );
  })
}
```

Пояснення: x-позиція роздільника розраховується за тією ж логікою що й точки графіка — `AXIS_W + (ply / (n-1)) * CHART_CONTENT_W`. Фільтр `divPly < n` прибирає роздільник якщо партія закінчилась раніше фази.

**Step 3: Додати рядок accuracy під SVG**

Після `</svg>` але ще всередині `<div className={styles.evalChartWrap}>` додати:

```tsx
{phaseAccuracy && n >= 2 && (
  <div className={styles.phaseAccuracyRow}>
    {(["Дебют", "Мідл", "Кінець"] as const).map((label, i) => {
      const pa = phaseAccuracy[i];
      const fmt = (v: number | null) => v !== null ? `${v}%` : "–";
      return (
        <div key={label} className={styles.phaseAccuracyCell}>
          <span className={styles.phaseAccuracyLabel}>{label}</span>
          <span className={styles.phaseAccuracyWhite}>{fmt(pa?.white ?? null)}</span>
          <span className={styles.phaseAccuracyBlack}>{fmt(pa?.black ?? null)}</span>
        </div>
      );
    })}
  </div>
)}
```

**Step 4: Передати `phaseAccuracy` у виклик `EvalChart` (~L667)**

```tsx
<EvalChart
  evals={analysis ? analysis.evalGraph.map((p) => evalToPawns(p.eval)) : []}
  currentIndex={currentMove + 1}
  onSeek={(i) => seekMainline(i - 1)}
  keyMoments={analysis?.keyMoments}
  phaseAccuracy={phaseAccuracy}
/>
```

**Step 5: Додати CSS в кінець `GameView.module.css`**

```css
/* ── Phase accuracy row (below eval chart) ───────────────────────────────── */

.phaseAccuracyRow {
  display: flex;
  width: 100%;
  padding: 3px 0 0;
  margin-left: 28px; /* вирівнюється з AXIS_W = 28px */
  width: calc(100% - 28px);
}

.phaseAccuracyCell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.phaseAccuracyLabel {
  font-size: 7px;
  font-family: var(--font-mono);
  color: rgba(255, 255, 255, 0.28);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.phaseAccuracyWhite {
  font-size: 9px;
  font-family: var(--font-mono);
  color: rgba(232, 220, 200, 0.7); /* пшеничний — колір білих */
}

.phaseAccuracyBlack {
  font-size: 9px;
  font-family: var(--font-mono);
  color: var(--color-text-faded);
}
```

**Step 6: Перевірити в браузері**

1. Відкрити партію з аналізом (>20 ходів)
2. Під eval chart — 3 колонки: Дебют / Мідл / Кінець
3. Кожна показує % точності окремо для білих (пшеничний колір) і чорних (приглушений)
4. На eval chart — пунктирні вертикальні лінії ділять графік на фази
5. Для короткої партії (<21 ходу) — Мідл і Кінець показують "–" для обох
6. Якщо аналіз не запущений — рядок не рендериться взагалі

**Step 7: Commit**

```
git add src/app/games/[id]/GameView.tsx src/app/games/[id]/GameView.module.css
git commit -m "feat: phase accuracy breakdown on eval chart (opening/middlegame/endgame)"
```

---

### Task 4: Збільшені touch-targets для крапок ключових моментів (мобільний)

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx` (EvalChart SVG, key moment circles ~L1005)

**Step 1: Знайти key moment circles**

У `EvalChart` є блок `{/* Key moment dots */}` (~L1005):

```tsx
{keyMoments.map((km) => {
  if (km.ply >= n) return null;
  const kx = AXIS_W + (km.ply / (n - 1)) * CHART_CONTENT_W;
  const ky = evalToChartY(evals[km.ply] ?? 0);
  const dotColor = km.type === "blunder" ? "#d44c4c" : "#e07b39";
  return (
    <circle
      key={km.ply}
      cx={kx}
      cy={ky}
      r={2}
      fill={dotColor}
      stroke="rgba(0,0,0,0.4)"
      strokeWidth={0.5}
    />
  );
})}
```

**Step 2: Замінити `<circle>` на `<g>` з двома колами**

```tsx
{keyMoments.map((km) => {
  if (km.ply >= n) return null;
  const kx = AXIS_W + (km.ply / (n - 1)) * CHART_CONTENT_W;
  const ky = evalToChartY(evals[km.ply] ?? 0);
  const dotColor = km.type === "blunder" ? "#d44c4c" : "#e07b39";
  return (
    <g key={km.ply}>
      {/* Невидимий великий touch-target для мобільного (r=10 ≈ 20px діагональ) */}
      <circle
        cx={kx}
        cy={ky}
        r={10}
        fill="transparent"
        style={{ cursor: "pointer" }}
      />
      {/* Видима крапка (pointerEvents none — клік обробляє великий target) */}
      <circle
        cx={kx}
        cy={ky}
        r={2.5}
        fill={dotColor}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={0.5}
        style={{ pointerEvents: "none" }}
      />
    </g>
  );
})}
```

Чому два кола: SVG `<circle r=10>` з `fill="transparent"` отримує всі mouse/touch події на площі 20×20px, але сам невидимий. Видима крапка `r=2.5` має `pointerEvents: none` — тому всі кліки обробляє великий target. Загальний `handleClick` на `<svg>` вже розраховує позицію і викликає `onSeek`, тому окрема логіка на `<g>` не потрібна.

**Step 3: Перевірити**

1. Chrome DevTools → Toggle device toolbar → iPhone SE або iPhone 14
2. Відкрити партію з аналізом що має key moments (blunder/mistake)
3. Тапнути поряд з крапкою (в межах ~10px) — має переходити до ключового моменту
4. Перевірити на desktop що звичайний клік по chart ще працює коректно

**Step 4: Commit**

```
git add src/app/games/[id]/GameView.tsx
git commit -m "feat: larger touch targets for key moment dots on mobile"
```

---

### Task 5: MultiPV в explore mode (топ-3 ходи-кандидати)

**Files:**
- Modify: `src/hooks/useStockfish.ts` (новий `analyzePositionMultiPV`, оновлений `analyzeSinglePosition`)
- Modify: `src/app/games/[id]/GameView.tsx` (стан `exploreEvalResult`, `bestMoveArrow`, UI кандидатів)
- Modify: `src/app/games/[id]/GameView.module.css` (нові класи для candidates panel)

#### Частина A: useStockfish.ts

**Step 1: Додати тип `CandidateMove` і оновити `RawResult`**

На початку файлу після існуючих типів додати:

```ts
type CandidateMove = {
  rank: number;
  eval: EngineEval;
  uci: string;
  san?: string;
};

type RawResult = {
  eval: EngineEval;
  bestMove?: { uci: string; san?: string };
  candidates?: CandidateMove[];
};
```

**Step 2: Додати нову функцію `analyzePositionMultiPV` після існуючої `analyzePosition`**

Ця функція — окрема реалізація спеціально для MultiPV. Не змінює `analyzePosition` — так game worker залишається незайманим.

```ts
const EXPLORE_MULTI_PV = 3;

function analyzePositionMultiPV(
  worker: Worker,
  fen: string,
  track: TrackFn,
  clear: ClearFn,
  signal?: AbortSignal
): Promise<RawResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Stockfish MultiPV analysis canceled"));
      return;
    }

    // latestByRank: зберігає останній результат для кожного multipv-rank
    const latestByRank = new Map<number, { eval: EngineEval; uci: string }>();

    const timeout = track(window.setTimeout(() => {
      cleanup();
      reject(new Error("Stockfish MultiPV timed out"));
    }, 60000));

    const cleanup = () => {
      clear(timeout);
      worker.removeEventListener("message", handler);
      worker.removeEventListener("error", handleError);
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Stockfish worker failed during MultiPV analysis"));
    };

    const handleAbort = () => {
      cleanup();
      reject(new Error("Stockfish MultiPV analysis canceled"));
    };

    const handler = (e: MessageEvent<string>) => {
      const msg = e.data;

      // Парсимо info-рядки з multipv
      // Формат: "info depth 15 multipv 2 score cp 45 ... pv e7e5 ..."
      if (msg.startsWith("info") && msg.includes("multipv") && msg.includes("score")) {
        const mpvMatch  = msg.match(/multipv (\d+)/);
        const cpMatch   = msg.match(/score cp (-?\d+)/);
        const mateMatch = msg.match(/score mate (-?\d+)/);
        // Перший хід з pv-лінії — це хід-кандидат
        const pvMatch   = msg.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

        if (mpvMatch && pvMatch) {
          const rank = parseInt(mpvMatch[1], 10);
          const uci  = pvMatch[1];
          let score: EngineEval = { type: "cp", value: 0 };
          if (cpMatch)   score = { type: "cp",   value: parseInt(cpMatch[1], 10) };
          else if (mateMatch) score = { type: "mate", value: parseInt(mateMatch[1], 10) };
          latestByRank.set(rank, { eval: score, uci });
        }
      }

      if (msg.startsWith("bestmove")) {
        cleanup();

        if (latestByRank.size === 0) {
          // Позиція без ходів (мат/пат)
          resolve({ eval: { type: "cp", value: 0 } });
          return;
        }

        const rank1 = latestByRank.get(1);
        const normalizedRank1Eval = normalizeEval(
          rank1?.eval ?? { type: "cp", value: 0 },
          fen
        );

        const candidates: CandidateMove[] = Array.from(latestByRank.entries())
          .sort(([a], [b]) => a - b)
          .map(([rank, c]) => ({
            rank,
            eval: normalizeEval(c.eval, fen),
            uci: c.uci,
            san: bestMoveSan(fen, c.uci),
          }));

        resolve({
          eval: normalizedRank1Eval,
          bestMove: rank1
            ? { uci: rank1.uci, san: bestMoveSan(fen, rank1.uci) }
            : undefined,
          candidates,
        });
      }
    };

    worker.addEventListener("message", handler);
    worker.addEventListener("error", handleError);
    signal?.addEventListener("abort", handleAbort, { once: true });

    // Встановлюємо MultiPV перед go
    worker.postMessage(`setoption name MultiPV value ${EXPLORE_MULTI_PV}`);
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${STOCKFISH_DEPTH}`);
  });
}
```

**Step 3: Оновити `analyzeSinglePosition` — використовувати `analyzePositionMultiPV`**

Знайти `async function analyzeSinglePosition` в `useStockfish` і замінити виклик `analyzePosition` на `analyzePositionMultiPV`:

```ts
async function analyzeSinglePosition(
  fen: string
): Promise<{
  eval: EngineEval;
  bestMove?: { uci: string; san?: string };
  candidates: CandidateMove[];
}> {
  cancelExploreWorker();

  const controller = new AbortController();
  exploreAbortRef.current = controller;
  const worker = getExploreWorker();

  try {
    if (!exploreReadyRef.current) {
      await waitForInit(worker, trackTimeout, clearTrackedTimeout, controller.signal);
      exploreReadyRef.current = true;
    }

    const result = await analyzePositionMultiPV(
      worker,
      fen,
      trackTimeout,
      clearTrackedTimeout,
      controller.signal
    );

    return {
      eval: result.eval,
      bestMove: result.bestMove,
      candidates: result.candidates ?? [],
    };
  } finally {
    if (exploreAbortRef.current === controller) {
      exploreAbortRef.current = null;
    }
  }
}
```

Також оновити рядок `return { analyzeGame, analyzeSinglePosition, terminate };` — він не змінюється, але TypeScript перевірить нові типи.

**Step 4: Експортувати тип `CandidateMove`**

Додати в рядок `export type { ... }` вгорі файлу:
```ts
export type { EngineAnalysisJsonV1, MoveClassification, CandidateMove };
```

#### Частина B: GameView.tsx

**Step 5: Оновити тип стану `exploreEvalResult`**

Імпортувати `CandidateMove` з `useStockfish`:
```tsx
import { useStockfish } from "@/hooks/useStockfish";
import type { CandidateMove } from "@/hooks/useStockfish";
```

Змінити тип стану (~L73):
```tsx
const [exploreEvalResult, setExploreEvalResult] = useState<{
  eval: EngineEval;
  bestMove?: { uci: string; san?: string };
  candidates: CandidateMove[];
} | null>(null);
```

**Step 6: Оновити `bestMoveArrow` — показувати 3 стрілки в explore mode**

Знайти `const bestMoveArrow = useMemo<Arrow[]>` (~L142) і замінити:

```tsx
const bestMoveArrow = useMemo<Arrow[]>(() => {
  if (exploreMode) {
    if (!exploreEvalResult) return [];
    // Топ-3 кандидати зі зменшуваною прозорістю
    const opacities = [0.85, 0.50, 0.28];
    return exploreEvalResult.candidates
      .filter((c) => c.uci.length >= 4)
      .slice(0, 3)
      .map((c, i) => [
        c.uci.slice(0, 2) as Square,
        c.uci.slice(2, 4) as Square,
        `rgba(61, 122, 53, ${opacities[i] ?? 0.28})`,
      ] as Arrow);
  }
  // Основна лінія: одна стрілка найкращого ходу
  const bm = currentPositionBestMove;
  if (!bm?.uci || bm.uci.length < 4) return [];
  return [[
    bm.uci.slice(0, 2) as Square,
    bm.uci.slice(2, 4) as Square,
    "rgba(61, 122, 53, 0.85)",
  ]];
}, [exploreMode, exploreEvalResult, currentPositionBestMove]);
```

**Step 7: Додати candidates panel в `analysisPanel` (права панель)**

В правій панелі `{/* ── Right: analysis panel ── */}`, ПЕРЕД accuracy strip (`{/* Accuracy strip */}`), додати:

```tsx
{/* Explore candidates — видно тільки в explore mode */}
{exploreMode && (
  <div className={styles.exploreCandidatesPanel}>
    <span className={styles.exploreCandidatesTitle}>
      {exploreAnalyzing ? "Аналізую…" : "Кандидати"}
    </span>
    {!exploreAnalyzing && exploreEvalResult && exploreEvalResult.candidates.length > 0 ? (
      <div className={styles.exploreCandidatesList}>
        {exploreEvalResult.candidates.slice(0, 3).map((c, i) => {
          const pawns = evalToPawns(c.eval);
          const sign  = pawns > 0 ? "+" : "";
          const isMate = Math.abs(pawns) >= 50;
          const evalStr = isMate
            ? `M${Math.abs(c.eval.value)}`
            : `${sign}${pawns.toFixed(2)}`;
          return (
            <div key={c.uci} className={styles.exploreCandidateRow}>
              <span className={styles.exploreCandidateRank}>{i + 1}.</span>
              <span className={styles.exploreCandidateSan}>
                {c.san ?? c.uci}
              </span>
              <span
                className={styles.exploreCandidateEval}
                style={{ color: pawns >= 0 ? "rgba(232,220,200,0.8)" : "var(--color-text-faded)" }}
              >
                {evalStr}
              </span>
            </div>
          );
        })}
      </div>
    ) : !exploreAnalyzing ? (
      <span className={styles.exploreCandidatesEmpty}>Зробіть хід</span>
    ) : null}
  </div>
)}
```

#### Частина C: CSS

**Step 8: Додати нові класи в `GameView.module.css`**

```css
/* ── Explore candidates panel (right panel) ──────────────────────────────── */

.exploreCandidatesPanel {
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg2);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exploreCandidatesTitle {
  font-size: 9px;
  font-weight: 600;
  color: var(--color-green-mid);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.exploreCandidatesList {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.exploreCandidateRow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
}

.exploreCandidateRank {
  color: var(--color-text-faded);
  width: 14px;
  flex-shrink: 0;
}

.exploreCandidateSan {
  color: var(--color-text);
  font-weight: 600;
  min-width: 44px;
}

.exploreCandidateEval {
  font-size: 11px;
}

.exploreCandidatesEmpty {
  font-size: 11px;
  color: var(--color-text-faded);
  font-style: italic;
}
```

#### Перевірка

**Step 9: Перевірити в браузері**

1. Відкрити партію
2. Перетягнути фігуру — explore mode активується
3. На дошці має бути 3 зелені стрілки (яскрава + 2 напівпрозорих)
4. В правій панелі зверху — секція "Кандидати" з 3 рядками: SAN + eval
5. Поки аналіз іде — показується "Аналізую…"
6. Якщо в позиції є тільки 1-2 легальних ходи — рядків буде менше (не крашиться)
7. Вийти з explore mode → кандидати зникають, стрілка повертається до однієї
8. Перевірити що game analysis (кнопка "Запустити аналіз") все ще працює після explore

**Step 10: Commit**

```
git add src/hooks/useStockfish.ts src/app/games/[id]/GameView.tsx src/app/games/[id]/GameView.module.css
git commit -m "feat: MultiPV top-3 candidate moves in explore mode with arrows and eval panel"
```

---

### Task 6: Оновити progress tracker

**Files:**
- Modify: `spec/progress-tracker.md`

**Step 1: Позначити всі пункти фази 4.6 виконаними**

```markdown
### Фаза 4.6 — UX-покращення review

- [x] `[` / `]` — навігація між ключовими моментами через клавіатуру
- [x] Фазові мітки на eval chart (дебют/мідлгейм/ендшпіль) з accuracy по кожній фазі
- [x] Збільшені touch-таргети для крапок ключових моментів на мобільному
- [x] MultiPV top-3: стрілки кандидатів на дошці + candidates panel у правій панелі
```

**Step 2: Додати в Журнал рішень**

```markdown
| 2026-05-05 | Фаза 4.6: [ / ] навігація між key moments; phase accuracy на eval chart (3 фази); mobile touch-targets r=10 для chart dots; MultiPV 3 в explore mode — окрема функція analyzePositionMultiPV, 3 стрілки з opacity, candidates panel у правій панелі. |
```

**Step 3: Commit**

```
git add spec/progress-tracker.md
git commit -m "docs: phase 4.6 complete in progress tracker"
```
