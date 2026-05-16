# Phase 14: Board Interaction + Sounds - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Два покращення взаємодії з шахівницею:
1. **Click-to-move** — клік на фігуру підсвічує доступні ходи (дот у центрі клітинки); клік на підсвіченій клітинці робить хід. Drag-and-drop залишається поряд.
2. **Звуки** — стандартні шахові звуки Chess.com стилю (хід, взяття, шах, рокіровка/кінець гри). Супроводжують навігацію по mainline та нові ходи в explore.

</domain>

<decisions>
## Implementation Decisions

### Click-to-move — Scope

- **D-01:** Click-to-move **активний в обох режимах** — mainline і explore.
- **D-02:** У **mainline mode**: клік на фігуру лише показує підсвічування доступних ходів (preview). Хід **не робиться** і explore не вмикається. Explore вмикається лише при фактичному ході (клік на підсвічену клітинку або drag).
- **D-03:** У **explore mode**: клік на фігуру → підсвічування → клік на підсвічену клітинку → хід (стандартна поведінка).
- **D-04:** Drag-and-drop залишається повністю функціональним поряд із click-to-move.

### Click-to-move — Selection Logic

- **D-05:** Клік на вибрану (вже виділену) фігуру → **deselect** (знімає підсвічування).
- **D-06:** Клік на **іншу власну фігуру** → deselect попередньої + select нова + нове підсвічування.
- **D-07:** Клік на **порожню клітинку** (без підсвічки) після вибору → **deselect**.
- **D-08:** Якщо фігура вибрана і починається **drag** — drag знімає вибір і виконується як звичайний drag (підсвічування очищається).

### Click-to-move — Підсвічування

- **D-09:** Стиль доступних клітинок: **дот у центрі клітинки** (Chess.com стиль) — коло ~25% ширини клітинки через `customSquareStyles`.
- **D-10:** Клітинки з **ворожою фігурою** (capture) — **рамка** замість дота (capture style).
- **D-11:** Кольори/стиль підсвічування та виділення вибраної фігури — на розсуд розробника в дусі dark-green/teal теми.

### Звуки — Джерело та тригери

- **D-12:** Бібліотека: **`chess-sounds`** npm пакет (Chess.com-style звуки, без самостійного хостингу файлів).
- **D-13:** Тригери звуків:
  - **Хід (звичайний)** — переміщення фігури без взяття і без шаху
  - **Взяття** — хід із захопленням ворожої фігури
  - **Шах** — хід, що ставить шах королю
  - **Рокіровка** — рокіровка (окремий звук); **кінець гри** — окремий звук
- **D-14:** Звуки грають і при **навігації по mainline** (Next/Prev/First/Last/goToMove) — кожен перехід відтворює відповідний звук залежно від типу ходу.
- **D-15:** Звуки грають при **explore ходах** (нові ходи через click-to-move або drag).

### Claude's Discretion

- Точний колір і розмір дотів та підсвічки виділення (в дусі `var(--color-teal)` та існуючих `lastMoveSquares` кольорів).
- Гучність, debounce (щоб не накопичувались звуки при швидкій навігації).
- Чи додавати хук `useChessSound` або інлайн-виклики — структурне рішення розробника.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Основні файли для реалізації

- `src/app/(app)/games/[id]/GameView.tsx` — головний компонент; містить `<Chessboard>` з `onPieceDrop`, `customSquareStyles`, `arePiecesDraggable`; selectedSquare state треба додати сюди
- `src/app/(app)/games/[id]/GameView.module.css` — стилі; дотові підсвічування не потребують CSS (через customSquareStyles), але стан вибраної фігури може
- `src/hooks/useExploreMode.ts` — `handleBoardDrop` логіка; click-to-move в explore mode має викликати ту саму логіку `handleBoardDrop`
- `src/hooks/useGameNavigation.ts` — навігація mainline; goNext/goPrev/goToMove — тут треба тригерити звуки

### react-chessboard API (ключові props)

- `onSquareClick` — обробник кліку на клітинку (Square → void); реалізує click-to-move
- `onPieceClick` — обробник кліку на фігуру (piece, square → void); альтернатива до onSquareClick для вибору фігури
- `customSquareStyles` — вже використовується для `lastMoveSquares`; сюди додаються дот-стилі
- `onPieceDragBegin` — коли drag починається; тут треба знімати click-selection

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `customSquareStyles` в `<Chessboard>` — вже використовується для `lastMoveSquares` (підсвічування останнього ходу). Нові дот-стилі мерджаться поверх цього об'єкта.
- `handleBoardDrop` в `useExploreMode` — логіка ходу через drag; click-to-move має викликати той самий механізм (або спільну `handleMove(from, to)` функцію).
- `chess.js` — `chess.moves({ square, verbose: true })` повертає список легальних ходів для будь-якої клітинки. Використовується для побудови списку підсвічуваних клітинок.
- `parsed?.positions[currentMove]` — поточна позиція mainline; `explorationChess` — поточна позиція explore mode.

### Established Patterns

- CSS Modules + `customSquareStyles` — підсвічування клітинок робиться через inline style об'єкти, не CSS.
- `useState` для UI-стану в GameView (activeTab, flipped, analysisState тощо) — `selectedSquare: Square | null` додається аналогічно.
- Dependency Policy: `chess-sounds` — нова залежність; обґрунтування: без неї треба самостійно хостити audio-файли (більше роботи, не кращий результат).

### Integration Points

- `selectedSquare` state + `onSquareClick` / `onPieceDragBegin` → GameView.tsx (або новий `useClickToMove` hook)
- Sound triggers → `useGameNavigation` (для mainline навігації) + callback при explore ходах
- `chess.moves()` виклик → потребує доступу до поточного `Chess` інстансу (mainline або explore)

</code_context>

<specifics>
## Specific Ideas

- **Reference:** Chess.com — дот у центрі клітинки для доступних ходів, рамка для capture-клітинок. Саме такий UX.
- **Звуки:** Chess.com стандартний звуковий пакет — move, capture, check, castle, game-end.
- **Навігація зі звуками:** при next/prev/goToMove визначати тип ходу (з `parsed.positions` або `analysis.moves`) і відтворювати відповідний звук.

</specifics>

<deferred>
## Deferred Ideas

- Свайп по шахівниці (ліво/право = prev/next) — конфліктує з drag; окрема фаза.
- Promotion picker (вибір фігури при перетворенні пішака) — зараз auto-queen; більш складна UX задача.
- Налаштування гучності або вимкнення звуків — settings сторінка; може бути частиною майбутньої фази налаштувань.

</deferred>

---

*Phase: 14-board-interaction-sounds*
*Context gathered: 2026-05-16*
