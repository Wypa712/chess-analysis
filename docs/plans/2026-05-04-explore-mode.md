# Phase 4.5 — Explore Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Дозволити користувачу робити довільні ходи від поточної позиції, бачити eval і bestMove Stockfish для explore-варіанту, та повертатися до основної лінії.

**Architecture:** Весь стан explore mode живе в `GameView.tsx`. `useStockfish` отримує новий публічний метод `analyzeSinglePosition`. Board отримує `arePiecesDraggable={true}` та `onPieceDrop` тільки в explore mode. Eval bar і best move arrow override-яться explore-даними.

**Tech Stack:** chess.js (Chess клас), react-chessboard (onPieceDrop, arePiecesDraggable), useStockfish (analyzeSinglePosition), CSS Modules.

---

## Task 1: Expose `analyzeSinglePosition` у `useStockfish`

**Files:**
- Modify: `src/hooks/useStockfish.ts`

**Що зробити:**

Додати новий публічний метод `analyzeSinglePosition(fen: string)` у хук, що ре-використовує внутрішню `analyzePosition`. Повертати його з хука.

```ts
// після функції terminate, перед return:
async function analyzeSinglePosition(
  fen: string
): Promise<{ eval: EngineEval; bestMove?: { uci: string; san?: string } }> {
  const worker = getWorker();
  if (!readyRef.current) {
    await waitForInit(worker, trackTimeout, clearTrackedTimeout);
    readyRef.current = true;
  }
  return analyzePosition(worker, fen, trackTimeout, clearTrackedTimeout);
}

return { analyzeGame, analyzeSinglePosition, terminate };
```

**Перевірка:** TypeScript не ругається, хук компілюється.

---

## Task 2: Explore стан і Chess імпорт у `GameView`

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx`

**Що зробити:**

**2a.** Додати імпорти:
```ts
import { Chess } from "chess.js";
import type { EngineEval } from "@/lib/chess/engine-analysis";
// EngineEval додати до вже існуючого import з engine-analysis
```

**2b.** Додати до `import { ..., type MoveClassification }` → `import { ..., type MoveClassification, type EngineEval }`.

**2c.** Додати тип ExploreMove локально (після type MovePair):
```ts
type ExploreMove = { san: string; from: string; to: string; uci: string };
```

**2d.** Деструктурувати `analyzeSinglePosition` з `useStockfish()`:
```ts
const { analyzeGame, analyzeSinglePosition, terminate } = useStockfish();
```

**2e.** Додати стан у `GameView` (після існуючих useState):
```ts
const [exploreMode, setExploreMode] = useState(false);
const [explorationChess, setExplorationChess] = useState<Chess | null>(null);
const [explorationMoves, setExplorationMoves] = useState<ExploreMove[]>([]);
const [exploreEvalResult, setExploreEvalResult] = useState<{
  eval: EngineEval;
  bestMove?: { uci: string; san?: string };
} | null>(null);
const [exploreAnalyzing, setExploreAnalyzing] = useState(false);
```

**Перевірка:** TypeScript strict — немає `any`, немає помилок компіляції.

---

## Task 3: Explore handlers

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx`

**Що зробити:**

Додати 4 handlers після `handleStartAnalysis`:

```ts
// 1. Exit explore — скидає стан, currentMove не змінює
function handleExitExplore() {
  setExploreMode(false);
  setExplorationChess(null);
  setExplorationMoves([]);
  setExploreEvalResult(null);
  setExploreAnalyzing(false);
}

// 2. Toggle explore on/off
function handleToggleExplore() {
  if (exploreMode) {
    handleExitExplore();
    return;
  }
  const baseFen = currentMove === -1
    ? (parsed?.startFen ?? "start")
    : (parsed?.positions[currentMove]?.fen ?? "start");
  const chess = new Chess(baseFen === "start" ? undefined : baseFen);
  setExplorationChess(chess);
  setExplorationMoves([]);
  setExploreEvalResult(null);
  setExploreMode(true);
}

// 3. Breadcrumb rollback — залишає перші (moveIndex+1) ходів
function handleBreadcrumbClick(moveIndex: number) {
  if (!parsed) return;
  const baseFen = currentMove === -1
    ? (parsed.startFen ?? "start")
    : (parsed.positions[currentMove]?.fen ?? "start");
  const chess = new Chess(baseFen === "start" ? undefined : baseFen);
  const movesToReplay = explorationMoves.slice(0, moveIndex + 1);
  for (const m of movesToReplay) {
    // promotion: "q" — обмеження: завжди ферзь; UI-вибір фігури не реалізований
    chess.move({ from: m.from, to: m.to, promotion: "q" });
  }
  setExplorationChess(chess);
  setExplorationMoves(movesToReplay);
  setExploreEvalResult(null);
}

// 4. Drop handler — валідує хід, аналізує позицію
async function handleExploreDrop(
  sourceSquare: string,
  targetSquare: string,
): Promise<boolean> {
  if (!explorationChess || exploreAnalyzing) return false;
  const chessCopy = new Chess(explorationChess.fen());
  let move;
  try {
    // promotion: "q" — обмеження: завжди ферзь; UI-вибір фігури не реалізований
    move = chessCopy.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
  } catch {
    return false;
  }
  if (!move) return false;

  const newMove: ExploreMove = {
    san: move.san,
    from: move.from,
    to: move.to,
    uci: `${move.from}${move.to}${move.promotion ?? ""}`,
  };
  setExplorationChess(chessCopy);
  setExplorationMoves((prev) => [...prev, newMove]);
  setExploreEvalResult(null);
  setExploreAnalyzing(true);
  try {
    const result = await analyzeSinglePosition(chessCopy.fen());
    setExploreEvalResult(result);
  } catch {
    // silent — не блокувати explore через engine помилку
  } finally {
    setExploreAnalyzing(false);
  }
  return true;
}
```

**Перевірка:** TypeScript компілюється. `handleExploreDrop` — async, що ok для `onPieceDrop` (react-chessboard підтримує Promise<boolean>).

---

## Task 4: Auto-exit explore при навігації по main line

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx`

**Що зробити:**

Модифікувати `goFirst`, `goPrev`, `goNext`, `goLast` і keyboard handler:

```ts
// Замінити існуючі:
const goFirst = () => { if (exploreMode) handleExitExplore(); setCurrentMove(-1); };
const goPrev  = () => { if (exploreMode) handleExitExplore(); setCurrentMove((m) => Math.max(-1, m - 1)); };
const goNext  = () => { if (exploreMode) handleExitExplore(); setCurrentMove((m) => Math.min(totalMoves - 1, m + 1)); };
const goLast  = () => { if (exploreMode) handleExitExplore(); setCurrentMove(totalMoves - 1); };
```

У keyboard handler (useEffect з handleKey):
```ts
function handleKey(e: KeyboardEvent) {
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    if (exploreMode) handleExitExplore();
    setCurrentMove((m) => Math.max(-1, m - 1));
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    if (exploreMode) handleExitExplore();
    setCurrentMove((m) => Math.min(totalMoves - 1, m + 1));
  }
}
```

**Увага:** keyboard `useEffect` має `[totalMoves]` у deps. Додати `exploreMode` і `handleExitExplore` у deps array:
```ts
}, [totalMoves, exploreMode, handleExitExplore]);
```

Щоб не було stale closure, загорнути `handleExitExplore` у `useCallback`. **Важливо:** визначати `handleExitExplore` у коді ДО `goFirst`/`goPrev`/`goNext`/`goLast` і keyboard `useEffect`:
```ts
const handleExitExplore = useCallback(() => {
  setExploreMode(false);
  setExplorationChess(null);
  setExplorationMoves([]);
  setExploreEvalResult(null);
  setExploreAnalyzing(false);
}, []);

// Потім нижче:
const goFirst = () => { if (exploreMode) handleExitExplore(); setCurrentMove(-1); };
// ...goNext, goPrev, goLast аналогічно
```

**Перевірка:** навігація стрілками та кнопками при active explore mode виходить з explore і навігує.

---

## Task 5: Board — explore FEN, draggable, square styles, overlay

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx`

**Що зробити:**

**5a.** Обчислити display FEN:
```ts
const displayFen = exploreMode && explorationChess
  ? explorationChess.fen()
  : boardFen;
```

**5b.** Обчислити square styles для explore:
```ts
const exploreLastMove = explorationMoves[explorationMoves.length - 1];
const displaySquareStyles = exploreMode && exploreLastMove
  ? {
      [exploreLastMove.from]: { background: "rgba(255, 255, 0, 0.35)" },
      [exploreLastMove.to]:   { background: "rgba(255, 255, 0, 0.5)" },
    }
  : lastMoveSquares;
```

**5c.** Eval value override:
```ts
const evalValue =
  exploreMode && exploreEvalResult
    ? evalToPawns(exploreEvalResult.eval)
    : analysis && currentMove >= 0
      ? evalToPawns(analysis.moves[currentMove]?.evalAfter)
      : evalToPawns(analysis?.evalGraph[0]?.eval);
```

**5d.** Best move arrow override — замінити `bestMoveArrow` useMemo:
```ts
const bestMoveArrow = useMemo<Arrow[]>(() => {
  const bm = exploreMode ? exploreEvalResult?.bestMove : currentPositionBestMove;
  if (!bm?.uci || bm.uci.length < 4) return [];
  return [[
    bm.uci.slice(0, 2) as Square,
    bm.uci.slice(2, 4) as Square,
    "rgba(61, 122, 53, 0.85)",
  ]];
}, [exploreMode, exploreEvalResult, currentPositionBestMove]);
```

**5e.** Оновити `<Chessboard>` props:
```tsx
<Chessboard
  id="game-board"
  position={displayFen}           // ← було boardFen
  boardWidth={boardSize}
  boardOrientation={boardOrientation}
  arePiecesDraggable={exploreMode}  // ← було false
  onPieceDrop={exploreMode ? handleExploreDrop : undefined}
  customSquareStyles={displaySquareStyles}  // ← було lastMoveSquares
  customArrows={bestMoveArrow}
  ...
/>
```

**5f.** Move overlay icon — НЕ показувати в explore mode (бо немає classification для explore ходів):
```tsx
{!exploreMode && currentMoveAnalysis && currentMoveTo && (
  <MoveOverlayIcon ... />
)}
```

**Перевірка:** drag & drop на дошці працює тільки в explore mode, стрілки та підсвічення оновлюються.

---

## Task 6: Кнопка "Дослідити" в nav controls

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx`

**Що зробити:**

Додати у `navControls` секцію, після кнопки Flip:
```tsx
<div className={styles.navDivider} />
<button
  type="button"
  className={`${styles.navBtn} ${exploreMode ? styles.navBtnActive : ""}`}
  onClick={handleToggleExplore}
  disabled={analysisState !== "done"}
  aria-pressed={exploreMode}
  title={
    analysisState !== "done"
      ? "Спочатку запустіть аналіз"
      : exploreMode
        ? "Вийти з варіанту"
        : "Дослідити варіанти"
  }
>
  <ExploreIcon />
</button>
```

Додати `ExploreIcon` компонент (поруч з іншими іконками):
```tsx
function ExploreIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
      <path d="M14 6l6 6-6 6" opacity={0.5} />
    </svg>
  );
}
```

**Перевірка:** кнопка disabled коли аналіз не запущено, title показує підказку.

---

## Task 7: Breadcrumb bar — верстка

**Files:**
- Modify: `src/app/games/[id]/GameView.tsx`

**Що зробити:**

Додати між верхнім `<PlayerBadge>` і `<div className={styles.boardRow}>`:

```tsx
{exploreMode && (
  <div className={styles.exploreBreadcrumb}>
    <span className={styles.exploreBreadcrumbLabel}>Варіант</span>
    {explorationMoves.map((m, i) => (
      <button
        key={i}
        type="button"
        className={styles.exploreBreadcrumbMove}
        onClick={() => handleBreadcrumbClick(i)}
      >
        {m.san}
      </button>
    ))}
    {exploreAnalyzing && (
      <span className={styles.exploreAnalyzing}>…</span>
    )}
    <button
      type="button"
      className={styles.exploreExitBtn}
      onClick={handleExitExplore}
    >
      Вийти
    </button>
  </div>
)}
```

**Перевірка:** breadcrumb з'являється тільки в explore mode, кожен хід клікабельний.

---

## Task 8: CSS для explore mode

**Files:**
- Modify: `src/app/games/[id]/GameView.module.css`

**Що зробити:**

Додати в кінець файлу:

```css
/* ── Explore mode ─────────────────────────────────────────── */

.navBtnActive {
  background: var(--color-green);
  color: #fff;
}

.exploreBreadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: var(--color-bg2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  flex-wrap: wrap;
  min-height: 28px;
}

.exploreBreadcrumbLabel {
  font-size: 10px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 4px;
  flex-shrink: 0;
}

.exploreBreadcrumbMove {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text);
  font-size: 12px;
  font-family: var(--font-mono);
  padding: 1px 5px;
  cursor: pointer;
  line-height: 1.4;
}

.exploreBreadcrumbMove:hover {
  background: var(--color-bg3);
  border-color: var(--color-green-mid);
}

.exploreAnalyzing {
  font-size: 11px;
  color: var(--color-text-muted);
  font-style: italic;
}

.exploreExitBtn {
  margin-left: auto;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text-muted);
  font-size: 11px;
  padding: 1px 8px;
  cursor: pointer;
  flex-shrink: 0;
}

.exploreExitBtn:hover {
  background: var(--color-bg3);
  color: var(--color-text);
}
```

**Перевірка:** breadcrumb коректно відображається, кнопка "Вийти" вирівняна по правому краю.

---

## Порядок виконання

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8
```

Всі кроки послідовні (кожен залежить від попереднього).

## Тест-план після реалізації

1. Відкрити партію без аналізу → кнопка "Дослідити" disabled, title підказка.
2. Запустити аналіз → кнопка enabled.
3. Клік "Дослідити" → explore mode увімкнено, кнопка підсвічена.
4. Потягнути фігуру → валідний хід → breadcrumb оновлюється, eval bar змінюється, bestMove стрілка оновлюється.
5. Невалідний хід → дошка відкочується, стан не змінюється.
6. Клік на хід у breadcrumb → rollback до нього, подальші ходи видалені.
7. Клік "Вийти" → повернення до main line позиції, explore стан скинуто.
8. Натиснути ArrowLeft/Right під час explore → auto-exit + навігація.
9. Flip дошки в explore mode → підсвічення і стрілки коректні.
10. Mobile: breadcrumb wrap коректно.
