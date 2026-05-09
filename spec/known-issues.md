# Known Issues — Chess Analysis App

Список виявлених проблем для виправлення. Кожен пункт містить файл, рядки та опис.

Проблеми згруповані у **6 фаз** (кожна фаза = 1 промт виправлень).

---

## Фаза 1 — Typos у документації та планах (7 задач) ✅ ВИПРАВЛЕНО

*Тільки текстові виправлення. Жодних змін у коді.*

### 1. Typos in AGENTS.md

**File:** `AGENTS.md` — line 20  
**Issue:** Опечатки в реченні про фази реалізації: `реалізція` → `реалізація`, `створенення` → `створення`, `дизану` → `дизайну`.

---

### 2. Typos in CLAUDE.md

**File:** `CLAUDE.md` — line 21  
**Issue:** Два опечатки: `дизану` → `дизайну`, `реалізція` → `реалізація` в абзаці «Реалізація кожної фази…».

---

### 3. explore-mode plan — useCallback order

**File:** `docs/plans/2026-05-04-explore-mode.md` — lines 176–225  
**Issue:** `handleExitExplore` має бути загорнутий у `useCallback` до того, як його використовують `goFirst`, `goPrev`, `goNext`, `goLast` і клавіатурний `useEffect`. Залежності `useEffect` мають включати `[totalMoves, exploreMode, handleExitExplore]`.

---

### 4. explore-mode plan — hardcoded queen promotion

**File:** `docs/plans/2026-05-04-explore-mode.md` — line 128  
**Issue:** `chess.move({ ..., promotion: "q" })` у двох хендлерах жорстко кодує ферзя і унеможливлює недопромоцію. Потрібно або додати UI-вибір фігури, або задокументувати обмеження.

---

### 5. review-enhancements plan — missing useState import

**File:** `docs/plans/2026-05-05-review-enhancements.md` — lines 253–254  
**Issue:** Приклад `GroupAnalysisPanel` використовує `useState`, але відсутній `import { useState } from 'react';` у верхній частині прикладного файлу.

---

### 12. spec/ui-context.md — Ukrainian typos

**File:** `spec/ui-context.md` — lines 123–124  
**Issue:** Опечатки: `найращого` → `найкращого`, `грарно` → `гарно`, `накращий` → `найкращий` у пунктах про стрілочки і якість ходу.

---

### 27. group-analysis plan — checkbox stops navigation but not propagation

**File:** `docs/plans/2026-05-06-group-analysis.md` — lines 47–58  
**Issue:** `onClick` на `<td>` викликає `e.preventDefault()` але не `e.stopPropagation()`. Клік по чекбоксу все одно може тригерити навігацію через `<tr>/<Link>`. Потрібно додати `e.stopPropagation()`.

---

## Фаза 2 — CSS & Accessibility (8 задач) ✅ ВИПРАВЛЕНО

*Лише зміни у CSS-файлах. Ніяких TypeScript/логіки.*

### 15. dashboard/page.module.css — color-only stat markers

**File:** `src/app/dashboard/page.module.css` — lines 47–69  
**Issue:** `.statMark` та варіанти `.statWin`, `.statDraw`, `.statLoss` покладаються лише на колір. Потрібні текстові мітки або `aria-label` для доступності (color-blind users).

---

### 16. GameView.module.css — missing :focus-visible on toggles

**File:** `src/app/games/[id]/GameView.module.css` — lines 526–542  
**Issue:** `.movesToggle`, `.keyMomentsToggle`, `.llmAccordionToggle` не мають `:focus-visible` стилів. Потрібно додати outline/box-shadow аналогічно до `.moveCell:focus-visible`.

---

### 17. GameView.module.css — very small font sizes

**File:** `src/app/games/[id]/GameView.module.css` — line 51 та інші  
**Issue:** `.evalBarValueLabel`, `.evalBarLabel`, `.phaseAccuracyHeader`, `.phasePlayerLabel` використовують `font-size: 7px`–`9px`. Рекомендується мінімум `10–11px` або відносні одиниці `rem/em`.

---

### 18. GameView.module.css — 100vh on mobile

**File:** `src/app/games/[id]/GameView.module.css` — line 5 (`.layout`)  
**Issue:** `height: 100vh` не враховує mobile browser chrome. Додати fallback + `height: 100dvh` для браузерів що підтримують dynamic viewport units.

---

### 19. GameView.module.css — hidden scrollbar on exploreMoveTrail

**File:** `src/app/games/[id]/GameView.module.css` — lines 844–851  
**Issue:** `scrollbar-width: none` та `::-webkit-scrollbar { display: none }` повністю приховують скролбар. Потрібно стилізувати мінімальний скролбар або додати візуальний індикатор переповнення для доступності.

---

### 23. ImportForm.module.css — missing cursor on submitBtn

**File:** `src/components/ImportForm/ImportForm.module.css` — lines 110–122  
**Issue:** `.submitBtn` не має `cursor: pointer` у базовому стані (є лише `cursor: not-allowed` для disabled).

---

### 24. ImportForm.module.css — missing cursor on seg

**File:** `src/components/ImportForm/ImportForm.module.css` — lines 66–75  
**Issue:** `.seg` не має `cursor: pointer`. Потрібно додати для інтерактивних segmented-кнопок.

---

### 34. ProfileView.module.css — missing cursor and :focus-visible on buttons

**File:** `src/components/ProfileView/ProfileView.module.css` — lines 153–168  
**Issue:** `.filterModeBtn` (та аналогічні кнопки) не мають `cursor: pointer` і `:focus-visible` стилів. Потрібно додати обидва для доступності клавіатурних користувачів, включно з `.filterModeBtnActive`.

---

## Фаза 3 — Null-safety у компонентах (8 задач) ✅ ВИПРАВЛЕНО

*TypeScript: null-guards, non-null assertions, dead code, date validation.*

### 22. games/layout.tsx — non-null assertion on session.user

**File:** `src/app/games/layout.tsx` — line 12  
**Issue:** `session.user!` — non-null assertion. Потрібно явно перевіряти `session.user` і редіректити або повертати fallback якщо відсутній.

---

### 30. profile/layout.tsx — non-null assertion on session.user

**File:** `src/app/profile/layout.tsx` — line 12  
**Issue:** `session.user!` — non-null assertion. Потрібна явна перевірка `session.user` з redirect або fallback.

---

### 31. profile/page.tsx — non-null assertion on session.user

**File:** `src/app/profile/page.tsx` — lines 7–11  
**Issue:** Перевіряється лише `session`, а не `session.user`. Потрібно `if (!session || !session.user) redirect("/auth/login")` і передавати `session.user` без `!`.

---

### 32. GroupAnalysisPanel — unsafe dynamic CSS class lookup

**File:** `src/components/GroupAnalysisPanel/GroupAnalysisPanel.tsx` — lines 70–83  
**Issue:** `styles[\`priority${a.priority}\`]` може повернути `undefined` при невалідному значенні. Потрібен safe lookup з fallback на `styles.priorityDefault`.

---

### 33. GroupAnalysisPanel — "Invalid Date" for bad createdAt

**File:** `src/components/GroupAnalysisPanel/GroupAnalysisPanel.tsx` — line 26  
**Issue:** `new Date(createdAt).toLocaleDateString("uk-UA")` повертає «Invalid Date» для некоректного рядка. Потрібна перевірка `!isNaN(date.getTime())` з fallback на `"—"`.

---

### 35. ProfileView.tsx — dead variable `n`

**File:** `src/components/ProfileView/ProfileView.tsx` — lines 441–442  
**Issue:** `const n = maxLen > 1 ? maxLen : 2;` оголошується але ніде не використовується. Потрібно видалити.

---

### 36. ProfileView.tsx — group analysis fetch ignores HTTP status

**File:** `src/components/ProfileView/ProfileView.tsx` — lines 87–99  
**Issue:** `fetch("/api/analysis/group")` не перевіряє `res.ok`. При помилці сервера (4xx/5xx) код намагається парсити JSON помилки як дані. Потрібна перевірка `if (!res.ok) throw new Error(…)`.

---

### 37. ProfileView.tsx — non-null assertions on stats subfields

**File:** `src/components/ProfileView/ProfileView.tsx` — lines 163–167  
**Issue:** `wdl!`, `byColor!`, `byTimeControl!`, `openings!` — non-null assertions що можуть крашнутись. Вже є guard `if (!stats.wdl || !stats.byColor || ...)` вище — перевірити що він покриває всі випадки і видалити `!`.

---

## Фаза 4 — API guards та type safety (8 задач) ✅ ВИПРАВЛЕНО

*API routes, type guards, error handling, config. Перевірити "Зауваження" перед виправленням.*

### 13. engine-analysis route — missing null check in .every()

**File:** `src/app/api/games/[id]/engine-analysis/route.ts` — lines 40–53  
**Issue:** Усередині `parsed.positions.every` `const move = analysis.moves[i]` може бути `undefined`. Потрібна перевірка `if (!move) return false;` перед зверненням до властивостей.

---

### 14. games/[id] route — unhandled DB error

**File:** `src/app/api/games/[id]/route.ts` — lines 23–45  
**Issue:** Блок `db.select(…)` не загорнутий у `try/catch`. Помилки БД не перехоплюються — сервер поверне необроблений 500. *(Зауваження: зовнішній `try/catch` уже є; перевірити що запит всередині нього.)*

---

### 20. GameView.tsx — keyboard handler ignores input elements

**File:** `src/app/games/[id]/GameView.tsx` — lines 255–269  
**Issue:** `handleKey` у `useEffect` перехоплює стрілки навіть коли фокус у текстовому полі. Потрібно `return` early якщо `e.target` є `input`, `textarea`, `select` або `contentEditable`. *(Зауваження: перевірити — ця перевірка вже є в коді з рядка 263.)*

---

### 21. GameView.tsx — movePairs crash on black-first game

**File:** `src/app/games/[id]/GameView.tsx` — lines 141–152  
**Issue:** Якщо перший хід чорних (pos.color === "b") і `pairs.length === 0`, код пише до `pairs[pairs.length - 1]` що є undefined. Потрібно перевіряти `pairs.length` і пушити новий pair з `white: undefined`. *(Зауваження: перевірити — схоже що код вже обробляє цей кейс.)*

---

### 25. ImportForm.tsx — undifferentiated error handling

**File:** `src/components/ImportForm/ImportForm.tsx` — lines 42–51  
**Issue:** Будь-яка помилка у catch блоці маппиться на «Не вдалося підключитися до сервера», включаючи JSON-parse помилки. Потрібно розрізняти мережеві помилки (TypeError) і помилки парсингу (SyntaxError).

---

### 29. profile/stats route — totalGames semantics inconsistency

**File:** `src/app/api/profile/stats/route.ts` — lines 68–84  
**Issue:** `totalGames` у відповіді відображає загальну кількість доступних партій, але статистика рахується лише по `filteredGameIds` (обмежена count). Потрібно розрізнити `totalAvailableGames` і `analyzedGames` у відповіді або зробити `totalGames = filteredGameIds.length`.

---

### 38. types.ts — criticalMoments guard ignores optional `move` field

**File:** `src/lib/llm/types.ts` — lines 111–116  
**Issue:** Type guard для `criticalMoments` не валідує опціональне поле `move`. Якщо присутнє — потрібна перевірка `typeof c.move === "string"`.

---

### 39. vitest.config.ts — __dirname undefined in ESM

**File:** `vitest.config.ts` — line 11  
**Issue:** `path.resolve(__dirname, './src')` ламається в ESM де `__dirname` undefined. Файл вже використовує `fileURLToPath(import.meta.url)` для визначення `__dirname` — перевірити що alias використовує саме цю змінну, а не глобальний `__dirname`.

---

## Фаза 5 — Build infrastructure + Race conditions (3 задачі) ✅ ВИПРАВЛЕНО

*Складні зміни: gitignore + скрипти, networking timeout, concurrency.*

### 11. public/stockfish.js tracked in git

**File:** `public/stockfish.js` — line 1  
**Issue:** Згенерований артефакт відстежується git. Потрібно додати `public/stockfish.js`, `public/stockfish.wasm`, `public/stockfish-nnue-16-single.wasm` до `.gitignore`, написати `scripts/copy-stockfish.mjs` і додати `prebuild`/`postinstall` скрипти до `package.json`.

---

### 26. lichess.ts — 20s global timeout kills streaming import

**File:** `src/lib/importers/lichess.ts` — lines 204–207  
**Issue:** `AbortSignal.timeout(20_000)` застосовується до всього стрімінгового запиту. Для великих імпортів (50–100 партій) таймаут спрацьовує передчасно. Потрібно збільшити або замінити idle-таймаутом що скидається на кожному чанку.

---

### 28. analyze route — race condition on rate-limit check

**File:** `src/app/api/games/[id]/analyze/route.ts` — lines 168–179  
**Issue:** Два одночасних запити можуть обидва пройти перевірку `recentRows` до INSERT, що дозволить дублікати. Потрібне атомарне check-and-insert (транзакція + `SELECT … FOR UPDATE` або `INSERT … ON CONFLICT`).

---

## Фаза 6 — DB migration & security (5 задач) ✅ ВИПРАВЛЕНО

*Найризикованіші зміни. Потребують ручного тестування на staging-базі перед застосуванням.*

### 6. Migration — existing PK before adding new one

**File:** `drizzle/0001_align_auth_schema.sql` — lines 6–9  
**Issue:** Міграція додає `auth_accounts_pkey`, не видаляючи наявний PRIMARY KEY. Потрібно спочатку виконати `ALTER TABLE "auth_accounts" DROP CONSTRAINT IF EXISTS <existing_pk_name>`.

---

### 7. Migration — CHECK constraint on non-empty table

**File:** `drizzle/0001_align_auth_schema.sql` — line 14 (group_analyses)  
**Issue:** `ADD CONSTRAINT group_analyses_game_ids_count CHECK (cardinality("game_ids") BETWEEN 5 AND 30)` може зламатися на наявних рядках. Потрібно додавати як `NOT VALID`, видаляти невідповідні рядки, потім `VALIDATE CONSTRAINT`. *(Зауваження: у файлі вже є патерн NOT VALID → DELETE → VALIDATE — перевірити актуальність.)*

---

### 8. Migration — auth_verification_tokens existing PK / duplicates

**File:** `drizzle/0001_align_auth_schema.sql` — line 13  
**Issue:** `ADD CONSTRAINT auth_verification_tokens_identifier_token_pk PRIMARY KEY` може зламатися якщо таблиця вже має PK або дублікати `(identifier, token)`. Потрібен `DROP CONSTRAINT IF EXISTS` + дедублікація перед застосуванням.

---

### 9. Snapshot — RLS disabled on critical tables

**File:** `drizzle/meta/0001_snapshot.json` — lines 144–145  
**Issue:** `isRLSEnabled: false` для `public.users`, `public.auth_accounts`, `public.auth_verification_tokens`. Потрібно увімкнути RLS (`ALTER TABLE … ENABLE ROW LEVEL SECURITY`) та додати відповідні політики доступу. Оновити snapshot.

---

### 10. Snapshot — verification token stored as plain text

**File:** `drizzle/meta/0001_snapshot.json` — lines 156–160, 181–186  
**Issue:** `auth_verification_tokens.token` зберігається як `text` (plain). Треба хешувати токени перед записом (HMAC-SHA256 або подібне) і порівнювати хеш при валідації. Змінити тип колонки на `varchar(64)` або `bytea`.

---

*Файл створено: 2026-05-09. Оновлювати після виправлення кожного пункту.*
