---
phase: 13-mobile-ui-ux-improvements
verified: 2026-05-16T12:00:00Z
status: human_needed
score: 11/11
overrides_applied: 0
human_verification:
  - test: "Pull-to-refresh на /dashboard на реальному мобайлі або у DevTools Touch Simulation"
    expected: "Потягнути вниз від scrollY===0 показує SVG-спінер, відпустити після 60px — запускає sync (SyncStatusBar показує 'Синхронізація…')"
    why_human: "Gesture-логіка (touchstart/touchmove/touchend) не перевіряється grep-ом; потрібен реальний дотик або симуляція у браузері"
  - test: "Горизонтальний eval bar і MoveStrip у GameView на мобайлі"
    expected: "Шахівниця займає повну ширину (без відступу для вертикального eval bar), eval bar 12px з'являється над полем, MoveStrip 44px під полем, вертикальний eval bar прихований"
    why_human: "isMobile визначається через ResizeObserver + matchMedia; потрібна реальна ширина viewport <= 768px для перевірки умовного рендеру"
  - test: "MoveStrip: тап на хід і автоскрол активного токена"
    expected: "Натискання на хід переходить до нього; активний токен автоматично прокручується в центр горизонтальної смужки"
    why_human: "scrollIntoView({ behavior: 'smooth', inline: 'center' }) потребує живого DOM для перевірки"
  - test: "Вкладка 'Ходи' прихована на мобайлі в LlmTabsPanel"
    expected: "На viewport <= 768px вкладка 'Ходи' не видима, залишаються лише 'Аналіз' і 'Поради' по 50% кожна"
    why_human: "CSS attribute selector .tabItem[data-tab='moves'] { display: none } — потрібен браузер для перевірки фактичного відображення"
  - test: "Кнопки навігації 48x48px на мобайлі"
    expected: "На viewport <= 768px кнопки First/Prev/Next/Last збільшені до 48x48px (замість 44x44px)"
    why_human: "CSS media query override потребує браузера для підтвердження розміру"
---

# Phase 13: Mobile UI/UX Improvements — Verification Report

**Phase Goal:** Покращити мобільний UX — pull-to-refresh на дашборді, горизонтальний eval bar і MoveStrip у GameView, приховати вкладку "Ходи" на мобайлі.
**Verified:** 2026-05-16T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Користувач може потягнути вниз на /dashboard (scrollY===0) і запустити sync | VERIFIED | `usePullToRefresh.ts`: `if (window.scrollY > 0) return;` у onTouchStart; onTrigger викликається при isReady (delta >= 60) у onTouchEnd; DashboardClient передає `triggerSync = () => syncBarRef.current?.runSync()` |
| 2 | SVG-спінер з'являється зверху при потягуванні, зникає після відпускання | VERIFIED | `DashboardClient.tsx` рядки 76-107: SVG-спінер з `indicatorStyle` (opacity 0→1, translateY слідує за пальцем); ptr-spin animation при `isReady`; transition 0.25s/0.2s при `!isDragging` |
| 3 | SyncStatusBar показує 'Синхронізація…' після тригера pull-to-refresh | VERIFIED | `SyncStatusBar.tsx` рядок 117-120: `{syncing && <span className={styles.syncing}>…Синхронізація…</span>}`; `runSync` встановлює `setSyncing(true)`; expose через `useImperativeHandle` |
| 4 | Pull-to-refresh не активується якщо сторінку вже прокручено вниз (scrollY > 0) | VERIFIED | `usePullToRefresh.ts` рядок 37: `if (window.scrollY > 0) return;` у onTouchStart |
| 5 | Шахівниця займає повну ширину на мобайлі (немає відступу для вертикального eval bar) | VERIFIED | `GameView.tsx` рядки 338-340: `const availableW = mobile ? boardAreaEl.clientWidth - paddingX : boardAreaEl.clientWidth - paddingX - EVAL_BAR_WIDTH - BOARD_ROW_GAP;` — умовний розрахунок |
| 6 | Горизонтальний eval bar (12px висота) відображається над шахівницею на мобайлі | VERIFIED | `GameView.tsx` рядки 497-510: `{isMobile && <div className={styles.evalBarHorizontalWrap}>…</div>}`; CSS `.evalBarHorizontal { height: 12px }` (рядок 1402-1410) |
| 7 | Горизонтальний ряд ходів (44px, overflow-x auto) відображається під шахівницею на мобайлі | VERIFIED | `GameView.tsx` рядки 555-589: `{isMobile && movePairs.length > 0 && <div className={styles.moveStrip}>…</div>}`; CSS `.moveStrip { height: 44px; overflow-x: auto }` (рядок 1433-1446) |
| 8 | Тап на хід у MoveStrip переходить до цього ходу | VERIFIED | `GameView.tsx` рядки 567,579: `onClick={() => seekMainline(whiteIdx)}` / `onClick={() => seekMainline(blackIdx)}` |
| 9 | Активний хід у MoveStrip підсвічений і автоматично прокручується в центр | VERIFIED | Клас `styles.moveStripTokenActive` на активному токені (рядки 567,579); `activeTokenRef` + `useEffect([currentMove])` → `scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })` (рядки 321-325) |
| 10 | Вкладка 'Ходи' прихована на мобайлі в LlmTabsPanel | VERIFIED | `LlmTabsPanel.tsx` рядок 92: `data-tab={tab}` на кожному button; `GameView.module.css` рядок 842: `.tabItem[data-tab="moves"] { display: none; }` всередині `@media (max-width: 768px)` |
| 11 | Default activeTab на мобайлі — 'analysis' (не 'moves') | VERIFIED | `GameView.tsx` рядки 89-91: `useState<...>(typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches ? "analysis" : "moves")` |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/usePullToRefresh.ts` | Gesture hook з touchstart/touchmove/touchend логікою | VERIFIED | Файл існує, 110 рядків; onTouchStart/onTouchMove/onTouchEnd handlers з addEventListener passive:false на touchmove; повертає containerRef, indicatorStyle, isReady |
| `src/components/SyncStatusBar/SyncStatusBar.tsx` | forwardRef + useImperativeHandle + SyncStatusBarHandle | VERIFIED | `forwardRef<SyncStatusBarHandle, SyncStatusBarProps>` (рядок 22); `useImperativeHandle(ref, () => ({ runSync }), [runSync])` (рядок 77); `export type SyncStatusBarHandle = { runSync: () => void }` (рядок 16) |
| `src/app/(app)/dashboard/DashboardClient.tsx` | Інтеграція usePullToRefresh + SyncStatusBar ref | VERIFIED | `import { usePullToRefresh }` (рядок 8); `syncBarRef = useRef<SyncStatusBarHandle>` (рядок 33); `usePullToRefresh(triggerSync)` (рядок 51); SVG-спінер (рядки 76-107); `<SyncStatusBar ref={syncBarRef}` (рядок 120) |
| `src/app/(app)/games/[id]/GameView.tsx` | isMobile state, умовний рендер HorizontalEvalBar і MoveStrip, виправлена boardSize calc | VERIFIED | `const [isMobile, setIsMobile] = useState(false)` (рядок 85); evalBarHorizontalWrap (рядок 498); moveStrip (рядок 556); boardSize без EVAL_BAR_WIDTH на мобайлі (рядок 339); activeTokenRef + scrollIntoView (рядок 80, 321-325) |
| `src/app/(app)/games/[id]/GameView.module.css` | CSS класи для горизонтального eval bar, MoveStrip, override evalBarWrap і navBtn | VERIFIED | evalBarHorizontalWrap (рядок 1394), evalBarHorizontal (1402), evalBarHorizontalWhite/Black/Label (1412-1429), moveStrip (1433), moveStripNum/Token/TokenActive (1452-1482), movePairGroup (1484); @media block: evalBarWrap display:none (833), navBtn 48px (837), tabItem[data-tab="moves"] display:none (842) |
| `src/app/(app)/games/[id]/LlmTabsPanel.tsx` | data-tab атрибут на кожному tab button | VERIFIED | Рядок 92: `data-tab={tab}` присутній у map; жодних JS-умов для мобайлу |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `usePullToRefresh.ts` | `DashboardClient.tsx` | onTrigger callback → syncBarRef.current.runSync() | WIRED | `triggerSync = useCallback(() => { syncBarRef.current?.runSync(); }, [])` передається в `usePullToRefresh(triggerSync)` |
| `DashboardClient.tsx` | `SyncStatusBar.tsx` | ref передається через forwardRef | WIRED | `<SyncStatusBar ref={syncBarRef} onSynced={handleSynced} />`; SyncStatusBar обгорнутий у forwardRef |
| `GameView.tsx isMobile branch` | boardSize calculation | availableW без EVAL_BAR_WIDTH subtraction на мобайлі | WIRED | `mobile ? boardAreaEl.clientWidth - paddingX : boardAreaEl.clientWidth - paddingX - EVAL_BAR_WIDTH - BOARD_ROW_GAP` |
| `MoveStrip active token ref` | scrollIntoView | useEffect([currentMove]) | WIRED | `useEffect(() => { if (activeTokenRef.current) { activeTokenRef.current.scrollIntoView(...); } }, [currentMove]);` |
| `LlmTabsPanel tabItem button` | `GameView.module.css media query` | data-tab attribute + CSS selector | WIRED | `data-tab={tab}` на button + `.tabItem[data-tab="moves"] { display: none; }` у @media (max-width: 768px) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `DashboardClient.tsx` — pull indicator | indicatorStyle (opacity, translateY) | usePullToRefresh (dragY state) | Так — touchmove delta обчислення | FLOWING |
| `GameView.tsx` — HorizontalEvalBar | evalWhitePercent, evalDisplayStr | evalValue → evalToPawns() → analysis moves | Так — з engineAnalysisData (React Query) | FLOWING |
| `GameView.tsx` — MoveStrip | movePairs, currentMove | parsed.positions через parsePgn() | Так — PGN парсинг з game.pgn | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED для gesture/visual behaviors — потребують браузера з touch simulation.

---

### Probe Execution

Step 7c: Проби не декларовані в PLANах і не знайдені в scripts/. SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| mobile-ux | 13-01, 13-02, 13-03 | Мобільний UX: pull-to-refresh, горизонтальний eval bar, MoveStrip, приховування вкладки "Ходи" | SATISFIED | Всі три плани виконані; артефакти існують і wire-поєднані |
| REQ-NF-8 | 13-02 | Responsive layout: desktop side-by-side board+panels, mobile vertical stack | SATISFIED | isMobile state + умовний рендер; desktop layout незмінений (boardRow залишається) |
| REQ-NF-9 | 13-02 | Chessboard remains square at all viewport sizes | SATISFIED | boardSize = snapBoardSize(availableW) на мобайлі — завжди квадрат |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | Жодних TBD/FIXME/XXX/PLACEHOLDER не знайдено |

Перевірені файли: usePullToRefresh.ts, SyncStatusBar.tsx, DashboardClient.tsx, GameView.tsx, GameView.module.css, LlmTabsPanel.tsx — жодних debt-маркерів, стабів або порожніх реалізацій.

---

### Human Verification Required

#### 1. Pull-to-refresh жест на /dashboard

**Test:** Відкрити /dashboard на мобайлі або у Chrome DevTools (Toggle Device Toolbar → будь-який телефон). Потягнути вниз від самого верху сторінки (scrollY === 0).
**Expected:** З'являється круглий SVG-спінер зверху (teal дуга), при протягуванні >= 60px починає обертатися. Після відпускання — SyncStatusBar показує "Синхронізація…" і запускає POST /api/sync.
**Why human:** Touch gesture (touchstart/touchmove/touchend) неможливо перевірити grep-ом; потребує реального або симульованого дотику.

#### 2. Горизонтальний eval bar і MoveStrip у GameView на мобайлі

**Test:** Відкрити будь-яку партію з engine-аналізом на мобайлі (viewport <= 768px).
**Expected:** Шахівниця займає повну ширину. Над шахівницею — горизонтальна смужка 12px (білий/чорний баланс + підпис оцінки). Під шахівницею — горизонтальний рядок ходів 44px зі скролом. Вертикальний eval bar зліва прихований.
**Why human:** isMobile встановлюється ResizeObserver + matchMedia — потребує реального viewport <= 768px.

#### 3. MoveStrip: тап і автоскрол

**Test:** На мобайлі у GameView натиснути на хід у середині партії (наприклад хід 25).
**Expected:** Шахівниця переходить до цього ходу; токен ходу автоматично прокручується в центр MoveStrip.
**Why human:** scrollIntoView з `inline: "center"` потребує живого DOM.

#### 4. Вкладка "Ходи" прихована на мобайлі

**Test:** Відкрити /games/[id] на мобайлі (viewport <= 768px).
**Expected:** У нижній панелі видно лише дві вкладки — "Аналіз" і "Поради", кожна ~50% ширини. Вкладка "Ходи" відсутня.
**Why human:** CSS attribute selector потребує браузера для підтвердження.

#### 5. Кнопки навігації 48x48px на мобайлі

**Test:** Відкрити /games/[id] на мобайлі, DevTools → inspect кнопок First/Prev/Next/Last.
**Expected:** Computed size = 48x48px (замість 44x44px на десктопі).
**Why human:** CSS media query override потребує браузера.

---

### Gaps Summary

Gaps відсутні. Всі 11 обов'язкових truths верифіковані статично. Статус `human_needed` через 5 поведінкових аспектів, що потребують перевірки у браузері з touch simulation або реальним мобайлом.

---

_Verified: 2026-05-16T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
