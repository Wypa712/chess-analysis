---
phase: 13-mobile-ui-ux-improvements
reviewed: 2026-05-16T12:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/hooks/usePullToRefresh.ts
  - src/components/SyncStatusBar/SyncStatusBar.tsx
  - src/app/(app)/dashboard/DashboardClient.tsx
  - src/app/(app)/games/[id]/GameView.tsx
  - src/app/(app)/games/[id]/GameView.module.css
  - src/app/(app)/games/[id]/LlmTabsPanel.tsx
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-05-16T12:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Фаза 13 додає pull-to-refresh на дашборді, горизонтальний eval-бар та мобільний move-strip для перегляду партії. Загальна якість коду хороша: стабільні ref-замикання для обробників подій, правильне очищення addEventListener, захист від race condition у sync. Виявлено 2 блокери та 4 попередження, що потребують виправлення.

---

## Critical Issues

### CR-01: `touchcancel` не обробляється — дотяг-індикатор залишається "застряглим"

**File:** `src/hooks/usePullToRefresh.ts:85-93`

**Issue:** Гак реєструє `touchstart`, `touchmove` та `touchend`, але **не обробляє `touchcancel`**. Браузер генерує `touchcancel` коли система перехоплює дотик (сповіщення, скролл браузера, incoming call, тощо). Якщо `touchcancel` спрацьовує після початку драгу — `isDraggingRef.current` залишається `true`, `dragYRef.current > 0`, а `isReadyRef.current` може бути `true`. При наступному `touchstart` код перевіряє лише `window.scrollY > 0`, тому наступний `onTouchEnd` може мимоволі тригернути sync без реальної дії користувача. Крім того, індикатор залишається видимим (ненульовий `dragY`, ненульова `opacity`).

**Fix:**
```ts
el.addEventListener("touchstart", onTouchStart, { passive: true });
el.addEventListener("touchmove", onTouchMove, { passive: false });
el.addEventListener("touchend", onTouchEnd, { passive: true });
el.addEventListener("touchcancel", reset, { passive: true }); // <-- додати

return () => {
  el.removeEventListener("touchstart", onTouchStart);
  el.removeEventListener("touchmove", onTouchMove);
  el.removeEventListener("touchend", onTouchEnd);
  el.removeEventListener("touchcancel", reset);              // <-- додати
};
```

---

### CR-02: `evalToPawns` ніколи не повертає `null`/`undefined`, але код перевіряє саме це — маємо приховану семантичну помилку

**File:** `src/app/(app)/games/[id]/GameView.tsx:472,478`

**Issue:** Тип `evalToPawns` оголошений як `(evalScore: EngineEval | undefined): number` і **завжди повертає `number`** (0, якщо `evalScore` — `undefined` або `null`). Перевірки на рядках 472 і 478:
```ts
if (evalValue === null || evalValue === undefined) return 50;
```
ніколи не спрацьовують. Це означає, що коли аналіз ще не запущений і `analysis === null`, `evalToPawns(undefined)` повертає `0`, а `evalValue === 0` — цілком валідне число. Код *вважає*, що відображає "нейтральний" стан (50%), але насправді відображає "рівна позиція +0.00", що вводить в оману. Горизонтальний бар також відображає 50% (ширина) і показує "+0.00" — виглядає наче аналіз вже є.

Справжня помилка: при `!analysis` має повертатися sentinel-значення `null`, щоб компоненти могли відрізнити "немає даних" від "справді 0".

**Fix:**
```ts
// engine-analysis.ts
export function evalToPawns(evalScore: EngineEval | undefined): number | null {
  if (!evalScore) return null;
  return evalToCentipawns(evalScore) / 100;
}

// GameView.tsx — після цього null-перевірки стануть коректними
const mainlineEvalValue: number | null =
  analysis && currentMove >= 0
    ? evalToPawns(analysis.moves[currentMove]?.evalAfter)
    : evalToPawns(analysis?.evalGraph[0]?.eval);
```
Увага: `EvalBar` приймає `value: number` — треба також оновити пропс до `value: number | null` і прибрати `Math.abs(value)` без null-guard.

---

## Warnings

### WR-01: Мобільна висота `analysisPanel` жорстко задана `70vh` — некоректно на iOS з address bar

**File:** `src/app/(app)/games/[id]/GameView.module.css:820-823`

**Issue:**
```css
.analysisPanel {
  height: 70vh;
}
```
На iOS Safari `100vh` враховує адресний рядок, тому `70vh` при відкритому браузері і при прокрутці до `100dvh` дають різні значення. Панель або обрізається, або залишає порожнє місце. Сусідній `.layout` вже використовує `height: 100dvh` — варто бути послідовним.

**Fix:**
```css
.analysisPanel {
  height: 70dvh; /* або flex-based замість фіксованої висоти */
}
```

---

### WR-02: `window.scrollY` у `onTouchStart` перевіряє скрол усієї сторінки, а не контейнера

**File:** `src/hooks/usePullToRefresh.ts:37`

**Issue:** Хук прикріплюється до `containerRef` (div усередині дашборду), але гард `if (window.scrollY > 0) return` перевіряє скрол **вікна**, а не самого контейнера. Якщо AppShell обгортає контент у власний scrollable div (що типово для mobile PWA layout), `window.scrollY` завжди буде `0`, а реальний скрол відбувається всередині flex-контейнера. Тоді pull-to-refresh спрацьовуватиме навіть коли контент проскролено вниз, конфліктуючи зі звичайним скролом.

**Fix:**
```ts
function onTouchStart(e: TouchEvent) {
  const scrollTop = el.scrollTop ?? 0; // el — containerRef.current
  if (scrollTop > 0) return;
  // ...
}
```

---

### WR-03: `DESKTOP_VERTICAL_CHROME = 290` — магічна константа без прив'язки до реального layout

**File:** `src/app/(app)/games/[id]/GameView.tsx:44,341`

**Issue:** Константа `290px` у `availableH = layoutEl.clientHeight - DESKTOP_VERTICAL_CHROME` жорстко кодує "хром" інтерфейсу (хедер, нав-бар, відступи). Якщо будь-який компонент змінить висоту або з'являться нові елементи, дошка або виходитиме за межі, або матиме надлишковий відступ. ResizeObserver спостерігає за `layoutEl`, але не розраховує хром динамічно.

**Fix:**
Замість `DESKTOP_VERTICAL_CHROME` вираховувати реальну висоту всіх елементів крім дошки:
```ts
const boardAreaChildren = Array.from(boardAreaEl.children);
const nonBoardHeight = boardAreaChildren
  .filter(child => child !== boardRowEl)
  .reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
const availableH = boardAreaEl.clientHeight - nonBoardHeight;
```
Або, як мінімум, задокументувати з чого складаються ці 290px.

---

### WR-04: Стан `llmStatus` та `analysisState` ініціалізується зі snapshot квері до mount — може не синхронізуватися

**File:** `src/app/(app)/games/[id]/GameView.tsx:129-135`

**Issue:**
```ts
const [analysisState, setAnalysisState] = useState<...>(
  engineAnalysisData ? "done" : "idle"
);
const [llmStatus, setLlmStatus] = useState<LlmStatus>(
  llmAnalysisData ? "done" : "idle"
);
```
`engineAnalysisData` та `llmAnalysisData` під час першого рендеру завжди `undefined` (запит ще не завершений — `isPending: true`), оскільки компонент відрендерений за умови `if (enginePending || llmPending) return <RouteLoader>`. Тому обидва `useState` завжди ініціалізуються як `"idle"`, попри наявність даних у кеші. Синхронізацію закрито через два окремих `useEffect` (рядки 138-149), але між першим рендером і першим ефектом є короткий момент де стан — `"idle"` замість `"done"`, що може спричинити миготіння кнопки "Запустити аналіз".

**Fix:**
Прибрати ранній `return` або ініціалізувати стан після перевірки `isPending`:
```ts
// Оскільки рядок 434 гарантує що ми тут тільки коли !enginePending && !llmPending:
const [analysisState, setAnalysisState] = useState(
  engineAnalysisData ? "done" as const : "idle" as const
);
```
Але для цього потрібно перемістити `useState`-виклики після `if (enginePending || llmPending)` — що порушує правила hooks. Правильне рішення: видалити дублювання стану, використовувати `engineAnalysisData` напряму як джерело правди, а `analysisState` — тільки для відстеження *поточного* локального аналізу Stockfish.

---

## Info

### IN-01: Вбудований `<style>` з `@keyframes` у тіло компонента рендериться при кожному ре-рендері

**File:** `src/app/(app)/dashboard/DashboardClient.tsx:73`

**Issue:**
```tsx
<style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
```
Цей `<style>` тег вставляється у DOM при кожному рендері компонента. Хоча браузер ігнорує дублікати, це нестандартна практика в Next.js App Router і може конфліктувати з CSS Streaming. Краще оголосити анімацію у CSS-модулі.

**Fix:**
Перенести у `page.module.css` або окремий CSS-файл:
```css
@keyframes ptr-spin {
  to { transform: rotate(360deg); }
}
```

---

### IN-02: Відсутня обробка `touchcancel` у `usePullToRefresh` — дублювання з CR-01 (якісний аспект)

Додатково до безпекового аспекту (CR-01): відсутність `touchcancel` робить хук несумісним зі стандартом Pointer Events та майбутніми браузерними оновленнями, які активніше використовують скасування дотиків.

---

### IN-03: Mate-значення у `LlmTabsPanel` ігнорує знак — від'ємний мат не відображається

**File:** `src/app/(app)/games/[id]/LlmTabsPanel.tsx:61-63`

**Issue:**
```ts
const mateVal = typeof c.eval?.value === "number" ? Math.abs(c.eval.value) : null;
const evalStr = isMate
  ? (mateVal !== null ? `M${mateVal}` : "?")
  : `${sign}${pawns.toFixed(2)}`;
```
Якщо `pawns < -50` (опонент матує), `sign` буде `""` (порожній рядок, бо `pawns > 0` — false), але `evalStr` формується як `M${mateVal}` (без мінуса). Результат: "-M3" відображається як "M3" — користувач бачить що він матує, хоча насправді його матують.

**Fix:**
```ts
const evalStr = isMate
  ? (mateVal !== null ? `${pawns < 0 ? "-" : ""}M${mateVal}` : "?")
  : `${sign}${pawns.toFixed(2)}`;
```

---

_Reviewed: 2026-05-16T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
