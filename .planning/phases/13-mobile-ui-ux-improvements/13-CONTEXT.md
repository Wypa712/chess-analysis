# Phase 13: Mobile UI/UX Improvements - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Покращення мобільного досвіду в трьох зонах:
1. **Pull-to-refresh** на `/dashboard` — свайп донизу запускає sync (імпорт нових партій)
2. **Сторінка аналізу партії** — горизонтальний eval bar над полем, поле на повну ширину, ряд ходів під полем, більші кнопки навігації (48px)
3. **Вкладка «Ходи» прибирається** з нижнього панелю — залишаються тільки «Аналіз» і «Поради»

Зміни **тільки для мобільного** (max-width: 768px). Desktop не зачіпається.

</domain>

<decisions>
## Implementation Decisions

### Pull-to-refresh (Dashboard)

- **D-01:** Свайп донизу на `/dashboard` запускає **повний sync** (той самий що SyncStatusBar — імпорт нових партій з chess.com/lichess), а не просто invalidateQueries.
- **D-02:** Візуальний feedback: кастомний SVG-спінер з'являється зверху при потягуванні → при відпусканні зникає і SyncStatusBar приймає управління прогресом (показує "Синхронізація...").
- **D-03:** Реалізація — **кастомний gesture hook** (touchstart/touchmove/touchend), без зовнішньої бібліотеки. Поріг спрацювання: потягнути на ≥60px від верху сторінки.
- **D-04:** Pull-to-refresh активний тільки якщо `scrollY === 0` (сторінка вже вгорі) — стандартна поведінка.

### Лейаут сторінки аналізу на мобайлі (зверху донизу)

- **D-05:** Вертикальний eval bar **прибирається** з лівого боку поля на мобайлі.
- **D-06:** Замість нього — **горизонтальний eval bar** (тонка смужка ~12px заввишки) над полем, на повну ширину.
- **D-07:** Шахівниця займає **повну доступну ширину** (без відступу під eval bar зліва).
- **D-08:** Під шахівницею (над кнопками навігації) — **горизонтальний ряд ходів** (`overflow-x: auto`, auto-scroll до поточного ходу).
- **D-09:** Формат ходів у рядку: `1.e4 e5 2.Nf3 Nc6...` — пари ходів компактно, тап на хід = перехід до нього.
- **D-10:** Кнопки навігації (First/Prev/Next/Last) на мобайлі: **48px × 48px** (зараз 44px).

### Вкладки нижнього панелю

- **D-11:** На мобайлі вкладка **«Ходи» прибирається** з LlmTabsPanel — ходи тепер у горизонтальному рядку над полем.
- **D-12:** LlmTabsPanel на мобайлі показує тільки **«Аналіз» і «Поради»**.
- **D-13:** Default активна вкладка на мобайлі: «Аналіз» (не «Ходи», бо «Ходи» тепер вгорі).

### Claude's Discretion

- Висота горизонтального eval bar, точна анімація fill, styling — на розсуд розробника в дусі існуючого CSS.
- Висота рядку ходів (40-48px зазвичай добре).
- Threshold для pull-to-refresh drag (≥60px запропоновано, можна трохи скоригувати).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Ключові файли для реалізації

- `src/app/(app)/games/[id]/GameView.tsx` — головний компонент сторінки аналізу; містить boardSize logic, ResizeObserver, activeTab state, navBtn, LlmTabsPanel
- `src/app/(app)/games/[id]/GameView.module.css` — всі стилі, включаючи `@media (max-width: 768px)` блок (лінія 793)
- `src/app/(app)/games/[id]/LlmTabsPanel.tsx` — TabBar з трьома вкладками (moves/analysis/advice); треба прибрати "moves" на мобайлі
- `src/app/(app)/dashboard/DashboardClient.tsx` — dashboard; містить `handleSynced` (invalidateQueries) і `<SyncStatusBar onSynced={handleSynced} />`
- `src/components/SyncStatusBar/SyncStatusBar.tsx` — компонент sync; pull-to-refresh має викликати той самий flow

### Константи та розміри (GameView.tsx)

- `MAX_BOARD_SIZE = 760`, `MIN_BOARD_SIZE = 200`, `EVAL_BAR_WIDTH = 24`, `DESKTOP_VERTICAL_CHROME = 290`
- На мобайлі (`isMobile = window.matchMedia("(max-width: 768px)").matches`) вже використовується `availableW` (ширина), а не висота — це правильна основа
- Мобайл лейаут: `@media (max-width: 768px)` в GameView.module.css

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `SyncStatusBar` — вже вміє запускати sync та показувати прогрес; pull-to-refresh має викликати його `triggerSync` або подібний механізм (треба перевірити інтерфейс)
- `useQueryClient` + `invalidateQueries` — вже використовується в DashboardClient після sync; може бути частиною pull-to-refresh flow
- Горизонтальний eval bar — потребує нового CSS компонента або варіанту `.evalBar` (зараз вертикальний)
- Список ходів (`movePairs`) вже обчислений у GameView — `movePairs: MovePair[]` передається в LlmTabsPanel

### Established Patterns

- CSS Modules — всі стилі через `.module.css`, mobile через `@media (max-width: 768px)` в тому самому файлі
- ResizeObserver для boardSize — вже є, при зміні лейауту треба переконатись що compute() враховує новий лейаут (без EVAL_BAR_WIDTH на мобайлі)
- `useState(activeTab)` в GameView керує вкладками — на мобайлі default треба змінити на "analysis"

### Integration Points

- Pull-to-refresh hook → `DashboardClient` (або окремий `usePullToRefresh` hook)
- Горизонтальний eval bar → новий CSS клас або `orientation="horizontal"` prop у EvalBar компоненті
- Ряд ходів → новий `<MoveStrip>` компонент або inline в GameView для мобайлю
- LlmTabsPanel: мобайл-aware табар (hide "moves" tab via CSS або conditional render)

</code_context>

<specifics>
## Specific Ideas

- **Référence:** chess.com мобайл — ряд ходів горизонтально над полем, тап = перехід. Саме така UX-модель.
- **Ряд ходів:** scroll-snap або plain `overflow-x: auto` з `scrollIntoView` на поточному ході при навігації.
- **Eval bar горизонтальний:** білий fill зліва, чорний справа (або навпаки залежно від орієнтації). Анімований через `width` transition як зараз робить вертикальний.

</specifics>

<deferred>
## Deferred Ideas

- Свайп по шахівниці для переходу між ходами (жест left/right = next/prev) — потенційно конфліктує з drag-drop на шахівниці (explore mode). Залишено для окремого обговорення.
- Свайп по шахівниці для переходу між ходами: user згадував, але поки вирішили через кнопки 48px — можна додати пізніше.

</deferred>

---

*Phase: 13-mobile-ui-ux-improvements*
*Context gathered: 2026-05-16*
