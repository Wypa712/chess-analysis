# Chess Analysis App — Трекер прогресу

## Поточний статус

- Статус: Фази 1–4 завершені
- Поточна фаза: Фаза 4.5 — Explore mode (варіаційний дослідник)
- Джерело специфікації: `SPEC.md`

## Журнал рішень (додано)

| Дата | Рішення |
|---|---|
| 2026-05-02 | NextAuth: JWT strategy (без auth_sessions таблиці). |
| 2026-05-02 | LLM-аналіз вимагає Stockfish key moments. |
| 2026-05-02 | Auth роздвоєний на auth.config.ts (edge-safe) і auth.ts (DB adapter) для middleware. |
| 2026-05-02 | Drizzle migrations мають зберігатися в репозиторії; profile nav приховано до реалізації `/profile`. |
| 2026-05-02 | `users.email` зроблено unique, `updatedAt` оновлюється через Drizzle runtime updates. |
| 2026-05-02 | `next build` OOM на Windows — фікс: `cpus: 1` у next.config + `NODE_OPTIONS` у build script. |
| 2026-05-02 | Фаза 1 завершена. Дизайн: зелена палітра, DM Sans/Mono, sidebar + bottom nav. |
| 2026-05-03 | Імпорт має два режими: за кількістю 25/50/100 або за періодом 7/30/90; default — за кількістю 25. |
| 2026-05-03 | Список партій сортується від найсвіжішої; фільтри лишаються тільки за платформою, контролем часу і результатом. |
| 2026-05-03 | Move list лишається чистим SAN/PGN без badges якості ходу; іконки якості показуються на дошці. |
| 2026-05-03 | Рев’ю-фікс: auth schema вирівняна зі snake_case БД-спекою, додано constraints для verification tokens і group game_ids. |
| 2026-05-03 | Рев’ю-фікс: failed import нового chess account прибирається, щоб не лишати порожній акаунт після помилки API. |
| 2026-05-03 | Рев’ю-фікс Фази 4: Stockfish score нормалізується до white-positive, `engine_analyses.analysis_json` валідується перед збереженням і використовує `default-v1`. |
| 2026-05-03 | Рев’ю-фікс Фази 4: статус engine-аналізу показується у списку партій; маркери якості ходу прив’язані до destination square з урахуванням орієнтації дошки. |
| 2026-05-04 | Рев’ю-фікс Фази 4: accuracy переведено на average win probability loss, `winProbabilityLoss` зберігається для ходів, а `evalGraph` має optional `bestMove` для позицій. |
| 2026-05-04 | Рев’ю-фікс Фази 2/4: Lichess NDJSON читається stream-ом з batch insert; `/api/games` summary узгоджено з активними фільтрами і UI не зависає в loading після API-помилки. |
| 2026-05-04 | Фаза 4 завершена: іконки якості ходу на дошці переведено на Chess.com-style (filled circle, white symbol, bottom-right corner); позначки класифікації додано в move list (праворуч у кожному рядку); блок ходів став collapsible accordion як key moments. |
| 2026-05-04 | Рев’ю-фікс Фази 4.5: переходи з графіка/key moments/move list виходять з explore mode; rollback варіанту переаналізовує позицію; Stockfish-запити серіалізовано; breadcrumb зроблено стабільним однорядковим slot-ом. |
| 2026-05-04 | UX Фази 4.5: explore-вхід переведено на drag-to-explore без окремої кнопки запуску; nav-кнопка активується лише для повернення до основної лінії партії. |
| 2026-05-05 | Рев’ю-фікс Фази 4/4.5: explore mode переведено на окремий latest-only Stockfish worker; дошка не блокує наступний хід під час аналізу, eval bar показує pending без фальшивого `0.0`, breadcrumb drag не викликає випадковий rollback, а API звіряє engine JSON з PGN перед збереженням. |
| 2026-05-05 | UX Фази 4.5: desktop-дошку збільшено — board area отримує більше ширини, `MAX_BOARD_SIZE` піднято до 760px, вертикальний budget розрахунку дошки зроблено менш стислим. |
| 2026-05-05 | Фаза 4.6: [ / ] навігація між key moments; phase accuracy на eval chart (3 фази); mobile touch-targets r=10 для chart dots; MultiPV 3 в explore mode — окрема функція analyzePositionMultiPV, 3 стрілки з opacity, candidates panel у правій панелі. |
| 2026-05-05 | Фаза 5: `@google/generative-ai` єдина нова залежність; `gemini-2.0-flash` основна модель; LLM-аналіз дозволяється і без Stockfish (PGN-only), але з попередженням; повторний аналіз записує новий рядок у `game_analyses`; критичні моменти клікабельні → seekMainline. |
| 2026-05-05 | Верстка Фази 5: LLM-секцію розміщено у таб-системі "Ходи / Аналіз / Поради" замість окремого блоку після ключових моментів — зручніший UX, погоджено як свідоме відхилення від spec. |

## Чекліст фаз

### Фаза 1 — Фундамент і авторизація

- [x] Створити Next.js 15 проєкт із TypeScript strict mode.
- [x] Налаштувати CSS Modules.
- [x] Налаштувати підключення до Neon database (drizzle + neon-http).
- [x] Додати Drizzle ORM.
- [x] Описати початкову database schema (`src/db/schema.ts`).
- [x] Запустити міграції (потрібен DATABASE_URL).
- [x] Налаштувати NextAuth.js v5.
- [x] Налаштувати JWT strategy для NextAuth.js v5.
- [x] Налаштувати GitHub OAuth.
- [x] Додати login page (`/auth/login`).
- [x] Захистити `/dashboard` через middleware.
- [x] Додати базовий authenticated shell (AppShell).
- [x] `next build` без помилок і попереджень.
- [x] Застосувати палітру з дизайн-прототипу (зелена/лісова тема, `#0e1a0e` bg).
- [x] Підключити шрифти DM Sans + DM Mono.
- [x] Замінити top navbar на вузький sidebar з іконками (desktop).
- [x] Додати bottom navigation для mobile.

### Фаза 2 — Імпорт і список партій

- [x] Додати модель chess account і збереження в БД.
- [x] Реалізувати імпорт з Lichess.
- [x] Реалізувати імпорт з Chess.com.
- [x] Додати режим імпорту за кількістю: 25 / 50 / 100 найновіших партій.
- [x] Додати режим імпорту за періодом: 7 / 30 / 90 днів.
- [x] Встановити імпорт за замовчуванням: за кількістю, 25 партій.
- [x] Нормалізувати імпортовані партії у локальну схему.
- [x] Пропускати вже імпортовані партії.
- [x] Додати пагінований список партій.
- [x] Показувати статус аналізу для кожної партії.

### Фаза 3 — Перегляд однієї партії

#### Верстка (2026-05-03, погоджено)

- [x] Додати маршрут `/games/[id]` — `src/app/games/[id]/page.tsx` + `src/app/games/layout.tsx`.
- [x] Рендерити дошку через `react-chessboard` (стартова позиція, орієнтація за кольором гравця).
- [x] Додати player badges (ім'я, рейтинг, іконка фігури по кольору).
- [x] Додати nav-кнопки (перший / попередній / наступний / останній / flip) — верстка без логіки.
- [x] Додати eval bar placeholder (Фаза 4).
- [x] Додати eval chart placeholder (Фаза 4).
- [x] Додати accuracy strip з placeholder-значеннями (Фаза 4).
- [x] Додати список ходів — статичний sample, готовий до підключення chess.js.
- [x] Додати opening footer.
- [x] Зробити рядки GamesList клікабельними посиланнями на `/games/[id]`.
- [x] Адаптивна верстка: desktop — side-by-side, mobile — stacked.

#### Функціонал (наступний крок, після погодження верстки)

- [x] Завантажувати партію за id з перевіркою ownership (`/api/games/[id]` GET).
- [x] Парсити PGN через `chess.js` — масив FEN-позицій.
- [x] Навігація по ходах (state + keyboard ArrowLeft/Right).
- [x] Оновлювати позицію на дошці при переході між ходами.
- [x] Замінити sample-ходи реальними SAN із PGN.
- [x] Підсвічувати поточний хід у списку.
- [x] Підсвічувати останній хід на дошці (customSquareStyles).
- [x] Виправити список ходів: рядки не стискаються, скрол з'являється всередині блоку.

### Фаза 4 — Stockfish game review

#### Верстка (статичні/mock дані, без реального движка)

- [x] Eval bar компонент — вертикальний градієнт чорний/білий, висота за оцінкою, значення centipawn/мат.
- [x] Eval graph компонент — власний SVG: лінія оцінки по ходах, клік по точці → перехід до ходу.
- [x] Іконки якості ходу на дошці — overlay з іконкою на квадраті поточного ходу.
- [x] Best move arrow — `customArrows` у react-chessboard для стрілки найкращого ходу.
- [x] Accuracy strip — панель з accuracy % для обох гравців (білий / чорний).
- [x] Key moments list — секція "ключові моменти" зі статичними рядками.
- [x] Key moments list — компактний 10px текст, власний внутрішній скрол і вирівняний заголовок.
- [x] Кнопка "Запустити аналіз" — три стани: idle / running (прогрес-бар) / done.
- [x] Review-фікси верстки Фази 4: точний click-seek графіка, keyboard-friendly кнопки ходів, cleanup mock-таймера.

#### Функціонал (реальний Stockfish WASM)

- [x] Performance spike — depth 15, без time limit (визначено на основі аналізу пакету).
- [x] `stockfish` npm v16 встановлено; `public/stockfish.js` + `public/stockfish.wasm` скопійовано (single-threaded, без CORS).
- [x] `scripts/copy-stockfish.mjs` — postinstall скрипт для відтворення після `npm install`.
- [x] `next.config.ts` — MIME `application/wasm` для `/stockfish.wasm`.
- [x] `useStockfish` хук (`src/hooks/useStockfish.ts`) — UCI init, черга n+1 FEN, depth 15, парсинг `score cp`/`score mate`, `bestmove`.
- [x] Класифікація ходів — best/good/inaccuracy/mistake/blunder за centipawn loss і порівнянням з engine bestmove.
- [x] Accuracy — Chess.com-подібна формула по average win probability loss (`103.1668 * exp(-0.04354 * avgLoss) - 3.1669`) для обох гравців.
- [x] Key moments — автоматичне визначення ходів із втратою ≥ 150cp.
- [x] Підключити `useStockfish` до `GameView.tsx` — замінити `handleStartAnalysis` і видалити mock.
- [x] Eval bar, eval graph, board overlay, best move arrow, accuracy strip, key moments — live дані замість mock.
- [x] POST `/api/games/[id]/engine-analysis` → зберігати результат в `engine_analyses`.
- [x] GET `/api/games/[id]/engine-analysis` → завантажувати кешований аналіз при відкритті партії.
- [x] зробити ревью прорахунку точності, помічені завищені показники
- [x] переробити іконки якості хода на дошці за прикладом в файлі image.png в design-prototype
- [x] реалізувати позначки якості  в блоці з ходами, закріпити їх по правій стороні ячейки з ходом, зробити блок з ходами слайдером, по прикладу з блоком "ключові моменти". позначки ходів мають бути у верзньому правому куті на дошці, не на нижньому правому

### Фаза 4.5 — Explore mode (варіаційний дослідник)

Дозволяє робити ходи на дошці від поточної позиції і прораховувати альтернативні варіанти.
Реалізується як Варіант A (простий explore mode, без збереження дерева варіантів).

План реалізації: `docs/plans/2026-05-04-explore-mode.md`

#### Task 1 — useStockfish: expose `analyzeSinglePosition`

- [x] Додати публічний метод `analyzeSinglePosition(fen)` у `useStockfish.ts` — ре-використовує внутрішню `analyzePosition`.

#### Task 2 — GameView: стан та імпорти

- [x] Імпортувати `Chess` з `chess.js` і `EngineEval` з `engine-analysis` у `GameView.tsx`.
- [x] Додати тип `ExploreMove` локально.
- [x] Деструктурувати `analyzeSinglePosition` з `useStockfish()`.
- [x] Додати стан: `exploreMode`, `explorationChess`, `explorationMoves`, `exploreEvalResult`, `exploreAnalyzing`.

#### Task 3 — GameView: explore handlers

- [x] `handleExitExplore` (useCallback) — скидає explore стан.
- [x] Drag-to-explore — перший валідний drop ініціалізує `Chess` від поточного `boardFen` і вмикає варіант без окремого toggle.
- [x] `handleBreadcrumbClick(i)` — rollback до ходу i, реплеїть ходи від base FEN.
- [x] `handleExploreDrop(src, tgt)` — валідує хід chess.js, додає в `explorationMoves`, викликає `analyzeSinglePosition`.

#### Task 4 — GameView: auto-exit при навігації

- [x] Модифікувати `goFirst/goPrev/goNext/goLast` — викликати `handleExitExplore()` перед навігацією якщо `exploreMode`.
- [x] Модифікувати keyboard handler — auto-exit при ArrowLeft/Right у explore mode.

#### Task 5 — Board: explore overrides

- [x] `displayFen` — `explorationChess.fen()` у explore mode, інакше `boardFen`.
- [x] `displaySquareStyles` — підсвічення explore-ходу або `lastMoveSquares`.
- [x] `evalValue` — з `exploreEvalResult.eval` у explore mode.
- [x] `bestMoveArrow` — з `exploreEvalResult.bestMove` у explore mode.
- [x] `<Chessboard>` — фігури draggable відразу на main line, `onPieceDrop` сам створює або продовжує explore-варіант.
- [x] Move overlay icon — приховати у explore mode.

#### Task 6 — Кнопка повернення до основної лінії в nav controls

- [x] Кнопка після Flip disabled на main line і стає active тільки в explore mode.
- [x] Кнопка повертає до основної лінії через `handleExitExplore`.
- [x] Додати `ReturnToMainlineIcon` SVG-компонент.

#### Task 7 — Breadcrumb bar

- [x] Рендерити між верхнім `PlayerBadge` і `boardRow` тільки якщо `exploreMode`.
- [x] Список ходів SAN — кожен клікабельний (`handleBreadcrumbClick(i)`).
- [x] Індикатор `…` під час `exploreAnalyzing`.
- [x] Кнопка "До партії" → `handleExitExplore`.

#### Task 8 — CSS

- [x] `.navBtnActive` — підсвічення активної кнопки повернення в explore mode.
- [x] `.exploreBreadcrumb`, `.exploreBreadcrumbLabel`, `.exploreBreadcrumbMove` — стилі breadcrumb.
- [x] `.exploreAnalyzing` — індикатор аналізу.
- [x] `.exploreExitBtn` — кнопка виходу.

#### Task 9 — додаткові правки
- [x] меню ходів варіанта стабілізовано: зарезервований однорядковий slot, горизонтальний скрол довгого варіанту, текст ходів обрізається без стрибків верстки
- [x] ux юзання прорахунку варіантів через окрему кнопку не дуже зручний. краще, щоб в любий момент юзер міг подвигати фігуру за тією ж логікою, яка є зараз але щоб з'являась або става активною кнопка вернутися до ориг таймлайну
- [x] якщо юзер тицяє кудись на графіку, у ключових моментах або в блоці з ходами — explore mode вимикається і перемикає на вибраний хід main line
- [x] rollback у breadcrumb повторно запускає аналіз позиції варіанту і ігнорує stale результати попередніх explore-запитів
- [x] Stockfish-запити через `useStockfish` серіалізовано, щоб full-game review і single-position explore не змішували UCI-команди в одному worker
- [x] breadcrumb з варіантами ходів має лише горизонтально скролитись при переповненні, а не розтягувати ширину всього блоку (`boardArea`)
- [x] breadcrumb: приховано scrollbar, inline-стиль ходів із роздільником `›`, label зелений, кнопка виходу через border-left
- [x] breadcrumb: drag-to-scroll — тягнеш мишею горизонтально, курсор `grabbing`, клік після drag блокується через `onClickCapture`
- [x] Рев’ю-фікс UX: explore-ходи не блокуються під час Stockfish-аналізу; новий хід скасовує попередній single-position запит і запускає актуальний.
- [x] Рев’ю-фікс UX: eval bar у pending explore-стані не показує фальшивий `0.0`.
- [x] Рев’ю-фікс: engine analysis API перевіряє, що `moves` і `evalGraph` відповідають PGN партії перед збереженням.
- [x] UX desktop: збільшено ігрове поле через ширший `boardArea`, `MAX_BOARD_SIZE=760` і мʼякший vertical chrome budget.
- [x] регресія верстки: `flex: 0 0 45%` + `flex: 0 0 55%` переповнювали layout на розмір gap — виправлено на flex-ratio без fixed widths; актуальний desktop split `11:10` на користь дошки
- [x] ось цей бар з варіантами - є біда шо не працює скррол, треба поправити, мб додати драг логіку

### Фаза 4.6 — UX-покращення review

План реалізації: `docs/plans/2026-05-05-review-enhancements.md`

- [x] `[` / `]` — навігація між ключовими моментами через клавіатуру
- [x] Фазові мітки на eval chart (дебют/мідлгейм/ендшпіль) з accuracy по кожній фазі
- [x] Збільшені touch-таргети для крапок ключових моментів на мобільному
- [x] MultiPV top-3: стрілки кандидатів на дошці + candidates panel у правій панелі
- [x] **Bug: mobile chart active area** — прибрано `height: 100px` override з `@media` блоку; SVG `height: auto` тепер зберігає ratio без letterboxing-смуг
- [x] **UX: phase accuracy color indicators** — `phaseAccuracyRow` перероблено на CSS grid 4×3; показуються рядки "Ви" / "Суп." з кольоровими dot-індикаторами (бежевий для білих, темний для чорних); `userColor` передається як prop у `EvalChart`

### Фаза 5 — LLM-аналіз однієї партії

#### Верстка (mock-дані, без SDK і API)

- [x] Додати секцію LLM-аналізу — реалізовано через таб-систему "Ходи / Аналіз / Поради" замість окремої секції після ключових моментів (свідоме рішення, UX-зручніше).
- [x] Кнопка "Аналізувати партію" — три стани: `idle` / `analyzing` (spinner + "Аналізуємо…") / `done` + `error` (кнопка "Спробувати ще раз" + warning).
  - `idle`: жодного кешу немає — показати кнопку із попередженням якщо немає Stockfish аналізу.
  - `done`: показати кнопку "Повторний аналіз" поруч із результатом.
- [x] Блок "Загальна оцінка" — текстовий параграф під кнопкою (mock: 2-3 речення).
- [x] Accordion-секції "Дебют / Мідлгейм / Ендшпіль" — розкриваються по кліку, кожна з коротким текстом (mock).
- [x] Блок "Критичні моменти" — до 3 рядків: `хід N` (клікабельний span) + опис (mock).
- [x] Блок "Рекомендації" — пронумерований список 2-3 пунктів (mock), винесено у таб "Поради".
- [x] Адаптивність: таб-контент scrollable на мобільному, секція відображається вертикально.
- [x] CSS Modules для всіх нових елементів — назви класів у стилі `.llmSection`, `.llmAnalyzeBtn`, `.llmPhaseAccordion` тощо.

#### Функціонал (реальний Gemini Flash)

- [ ] Встановити `@google/generative-ai` — єдина нова залежність.
- [ ] Визначити TypeScript тип `LlmGameAnalysisV1` у `src/lib/llm/types.ts` — strict JSON schema з полями: `summary`, `opening`, `middlegame`, `endgame`, `criticalMoments` (масив `{ply, description}`), `recommendations` (масив рядків).
- [ ] GET `/api/games/[id]/analyze` — повертає кешований запис із `game_analyses` або `null`; перевіряє ownership через сесію.
- [ ] POST `/api/games/[id]/analyze` — запуск LLM:
  1. Завантажити партію + engine analysis (PGN, keyMoments, accuracy, result, color, timeControl).
  2. Побудувати промпт: системний + дані партії + `keyMoments` (якщо є) + вимога `LlmGameAnalysisV1` JSON.
  3. Викликати `gemini-2.0-flash` через `@google/generative-ai`.
  4. Розпарсити і валідувати JSON відповідь проти `LlmGameAnalysisV1`.
  5. Зберегти в `game_analyses` (`llm_model`, `language: "uk"`, `schema_version: 1`, `analysis_json`).
  6. Повернути збережений аналіз.
- [ ] Обробка помилок: LLM timeout / invalid JSON → `400` з повідомленням, нічого не зберігати.
- [ ] Підключити GET у `GameView.tsx` — завантажувати кешований аналіз при відкритті партії.
- [ ] Підключити POST у `GameView.tsx` — клік "Аналізувати" → spinner → рендер результату.
- [ ] "Повторний аналіз" — повторний POST (незалежно від кешу, записує новий рядок у `game_analyses`).
- [ ] Клікабельні `хід N` у критичних моментах → `seekMainline(ply - 1)` для переходу до позиції на дошці.

### Фаза 6 — Груповий LLM-аналіз

- [ ] Додати multi-select для партій.
- [ ] Обмежити вибір до 5-30 партій.
- [ ] Формувати стислі зведення партій.
- [ ] Додавати engine-дані і попередні LLM-нотатки, якщо вони є.
- [ ] Визначити strict JSON schema для group analysis.
- [ ] Генерувати український груповий аналіз.
- [ ] Зберігати аналіз у `group_analyses`.

### Фаза 7 — Профіль і дашборд

- [ ] Додати маршрут `/profile`.
- [ ] Додати фільтри: 25 / 50 / 100 партій.
- [ ] Додати фільтри: 7 / 30 / 90 днів.
- [ ] Додати chart перемог / нічиїх / поразок.
- [ ] Додати результативність за контролем часу.
- [ ] Додати результативність за кольором.
- [ ] Додати найчастіші дебюти.
- [ ] Додати win rate за дебютом.
- [ ] Додати накопичувальне LLM-зведення.
- [ ] Ховати або пояснювати зведення, коли є менше ніж 5 партій.

### Фаза 8 — Полірування і деплой

- [ ] Додати стани завантаження.
- [ ] Додати порожні стани.
- [ ] Додати обробку помилок імпорту.
- [ ] Додати обробку LLM-помилок.
- [ ] Додати базове rate limiting.
- [ ] Налаштувати production env vars.
- [ ] Налаштувати Neon production database.
- [ ] Задеплоїти на Vercel.
- [ ] Провести smoke test production.

## Відкриті питання

- [x] Профіль має об'єднувати Chess.com і Lichess за замовчуванням, чи потрібен platform switcher? → Об'єднувати для всіх метрик, ELO-графіки завжди роздвоєні.
- [ ] LLM-аналіз однієї партії має вимагати готовий Stockfish analysis, чи дозволяти PGN-only analysis?
- [x] Які точні Stockfish depth/time defaults використати після performance spike? → depth 15, без time limit, profile `default-v1`.

## Ризики для моніторингу

- [ ] Chess.com rate limits.
- [x] Lichess NDJSON streaming у Next.js API routes.
- [ ] Stockfish WASM performance для full-game analysis.
- [ ] Розмір `engine_analyses.analysis_json` у Neon.
- [ ] Gemini free-tier limits.
- [ ] Складність NextAuth v5 + Neon setup.

## Журнал рішень

| Дата | Рішення |
|---|---|
| 2026-05-02 | Проєкт реалізується маленькими робочими фазами. |
| 2026-05-02 | v1 auth-first через GitHub OAuth. |
| 2026-05-02 | Анонімний режим не входить у v1. |
| 2026-05-02 | v1 підтримує Chess.com і Lichess. |
| 2026-05-02 | Імпорт обмежений погодженими режимами: 25/50/100 найновіших партій або 7/30/90 днів. |
| 2026-05-02 | Default import: за кількістю, 25 партій. |
| 2026-05-02 | LLM output: український strict JSON. |
| 2026-05-02 | Engine analysis зберігається в database. |
| 2026-05-02 | Детальна схема БД винесена в `database-schema.md`. |
| 2026-05-02 | Claude design prototype додано як UI-референс, не як production-код. |
| 2026-05-02 | Для NextAuth.js v5 використовується JWT strategy; `auth_sessions` не створюється. |
| 2026-05-03 | Фаза 2 реалізована; список партій має базові фільтри за платформою, контролем часу і результатом. |
| 2026-05-03 | ELO-графік будується з `games.player_rating` для обох платформ — один механізм, без rating-history API. |
| 2026-05-03 | Профіль об'єднує платформи для всіх метрик; ELO-секція завжди роздвоєна (Chess.com / Lichess). |
| 2026-05-03 | Список партій — один загальний з фільтром платформи; кожен рядок показує бейдж платформи. |
| 2026-05-03 | Фаза 3 верстка: layout side-by-side (eval bar + board + moves), placeholder-и для Фази 4 (eval bar, eval chart, accuracy). |
| 2026-05-03 | GamesList рядки перетворено на `<Link>` для навігації до `/games/[id]`. |
| 2026-05-03 | Порядок реалізації Фази 3: верстка → погодження → функціонал (chess.js + API). |
| 2026-05-03 | Верстка `/games/[id]` погоджена: дошка 700px, права панель flex-1 з border-left, gap 24px між панелями. |
| 2026-05-03 | Stockfish: використовується `stockfish` npm v16 (WASM), запуск через Web Worker, `.wasm` копіюється в `public/` через copy-script. |
| 2026-05-03 | Eval graph: власний SVG без chart-бібліотек (recharts та аналоги не вводяться). |
| 2026-05-03 | Фаза 4 розбита на два етапи: верстка (mock-дані) → функціонал (реальний Stockfish). |
| 2026-05-03 | Фаза 4 верстка: EvalBar, EvalChart (SVG), board overlay, best move arrow, key moments, кнопка аналізу з 3 станами — всі з mock-даними. |
| 2026-05-03 | Move list не показує badges якості ходу; класифікація лишається в engine data і board overlay. |
| 2026-05-03 | Рев’ю-фікси: додано міграцію `0001_align_auth_schema`, group game_ids constraint і cleanup нового chess account при failed import. |
