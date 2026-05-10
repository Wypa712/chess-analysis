# Chess Analysis App — Трекер прогресу

## 📊 Поточний статус

**Завершено:** Фази 1–6.1, Фаза 7A, Фаза 7.0, Фаза 7B, Фаза 7C, Фаза 8, Фаза 9 (часткова: 9-1–9-8, 9-13)  
**Поточна фаза:** ✅ PRODUCTION — застосунок живий  
**Наступна фаза:** P2 — React Query, LLM client abstraction (необов'язково)  
**Останнє ревью:** 2026-05-10 — Фаза 9.4 завершена (деплой, smoke tests, PWA)

---

## 🎯 Timeline до production

```
┌──────────────────────────────────────────────────────┐
│ 7B — Функціонал профілю ✅ ЗАВЕРШЕНО                │
├──────────────────────────────────────────────────────┤
│ • API /api/profile/stats                            │
│ • Підключення реальних даних                        │
│ • Перенесення GroupAnalysisPanel                    │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 7C — Рефакторинг GameView (1-2 дні) ⚠️ КРИТИЧНО    │
├──────────────────────────────────────────────────────┤
│ • Розбити 1432 рядки на 3 компоненти                │
│ • EvalSection, ExplorePanel, LlmTabsPanel           │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 8 — Тести критичної логіки (1 день)                 │
├──────────────────────────────────────────────────────┤
│ • engine-analysis, importers, API routes            │
│ • Component тести для нових компонентів             │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 9 — Полірування + деплой (2 дні)                    │
├──────────────────────────────────────────────────────┤
│ • Retry + Sentry + /api/health                      │
│ • Vercel staging → production                       │
└──────────────────────────────────────────────────────┘

⏱️ Загальний час: 5-7 днів до production
```

---

## ✅ Завершені фази

### Фаза 1 — Фундамент і авторизація
- Next.js 15 + TypeScript strict mode
- NextAuth.js v5 (JWT strategy, GitHub OAuth)
- Neon database + Drizzle ORM
- Зелена палітра, DM Sans/Mono
- Sidebar (desktop) + bottom nav (mobile)

### Фаза 2 — Імпорт і список партій
- Імпорт з Chess.com і Lichess
- Режими: за кількістю (25/50/100) або періодом (7/30/90 днів)
- Пагінований список з фільтрами
- Статус аналізу для кожної партії

### Фаза 3 — Перегляд однієї партії
- Маршрут `/games/[id]`
- react-chessboard з навігацією (клавіатура + кнопки)
- Player badges, opening footer
- Адаптивна верстка (desktop side-by-side, mobile stacked)

### Фаза 4 — Stockfish game review
- Stockfish WASM (depth 15, `stockfish` npm v16)
- Eval bar, eval graph (власний SVG), accuracy strip
- Класифікація ходів (best/good/inaccuracy/mistake/blunder)
- Key moments (втрата ≥ 150cp)
- Best move arrow, іконки якості на дошці
- Кешування в `engine_analyses`

### Фаза 4.5 — Explore mode
- Drag-to-explore (без окремої кнопки)
- Breadcrumb bar з drag-to-scroll
- Stockfish для варіантів (окремий worker)
- Auto-exit при навігації по main line

### Фаза 4.6 — UX-покращення review
- `[` / `]` навігація між key moments
- Phase accuracy (дебют/мідлгейм/ендшпіль)
- MultiPV top-3 (candidates panel)
- Mobile touch-targets для chart dots

### Фаза 5 — LLM-аналіз однієї партії
- Groq API (`llama-3.3-70b-versatile`)
- Таб-система "Ходи / Аналіз / Поради"
- Критичні моменти (клікабельні → seekMainline)
- Кешування в `game_analyses`
- Rate limiting 30s

### Фаза 6 — Груповий LLM-аналіз
- Кнопка "Груповий аналіз" (останні 30 партій)
- `GroupAnalysisPanel` (patterns, weaknesses, openings, action plan)
- POST `/api/analysis/group` з Groq
- Кешування в `group_analyses`
- Rate limiting 60s

### Фаза 6.1 — Ревью-фікси
**P0 (3 задачі):**
- `type="button"` на кнопках
- AbortController для Groq timeout
- Groq client на рівні модуля

**P1 (6 задач):**
- SQL-based rate-limit
- system/user role split у промптах
- GET-валідація group analysis
- DISTINCT ON у buildGameSummaries
- Silent catch фікси

**P2 (4 задачі):**
- endgame.summary тип-чек
- max_tokens для Groq
- useMemo для EvalChart
- Видалення type re-export

### Фаза 7A — Верстка профілю
- Маршрут `/profile`
- Hero (аватар, акаунти, лічильник партій)
- Фільтри (count/period)
- WDL stacked-bar
- Картки за кольором і контролем часу
- Топ-5 дебютів з мінібарами
- ELO-графік placeholder
- Секція групового аналізу (empty state)

### Фаза 7.0 — Документація і базові тести
- `README.md` з повним описом, setup інструкціями, development workflow
- `.env.example` template
- Vitest setup (vitest + @vitest/ui)
- Unit-тести для `isLlmGameAnalysisV1` і `isGroupAnalysisJsonV1` (29 тестів, всі пройшли)
- Test scripts: `npm run test`, `npm run test:ui`, `npm run test:run`

### Фаза 7B — Функціонал профілю
- API endpoint `GET /api/profile/stats` з фільтрами (count/period)
- Підключення реальних даних до всіх секцій ProfileView
- WDL chart, картки за кольором і контролем часу
- Секція дебютів (топ-5 з win rate)
- ELO-графік (Chess.com і Lichess окремо)
- Перенесення GroupAnalysisPanel з GamesList на /profile
- Empty state для профілю (мінімум 5 партій)
- URL search params для фільтрів
- Skeleton states під час завантаження

---

## 🚧 Поточні фази

### Фаза 7C — Рефакторинг GameView ✅ ЗАВЕРШЕНО

- [x] **[7C-1]** `EvalSection` — panelHeader, EvalChart, accuracyStrip (353 рядки)
- [x] **[7C-2]** `ExplorePanel` — breadcrumb, drag-to-scroll (101 рядок)
- [x] **[7C-3]** `LlmTabsPanel` — таб-система, moves list, LlmAnalysis (198 рядків)
- [x] **[7C-4]** `GameView.tsx` скорочено: 1452 → 778 рядків (-46%)
- [x] **[7C-5]** `icons.tsx` — всі 7 SVG іконок винесено окремо
- [x] **[7C-6]** `types.ts` — спільні типи GameData, ExploreMove, MovePair тощо
- TypeScript `tsc --noEmit` — 0 помилок

---

## 🧪 Майбутні фази

### Фаза 8 — Тести критичної логіки ✅ ЗАВЕРШЕНО

- [x] **[8-1]** Unit-тести `lib/chess/engine-analysis.ts` (isEngineAnalysisJsonV1, evalToCentipawns, evalToPawns — 31 тест)
- [x] **[8-2]** Unit-тести `lib/importers/` (mapTimeClass, extractPlatformGameId, extractOpeningFromPgn, extractResultFromPlayerResult, countMovesFromPgn, mapSpeed, buildTimeControl, buildPgn, normalizeLichessGame — 48 тестів)
- [x] **[8-3]** Integration тести API routes з vi.mock для Groq (analyze GET/POST, group GET/POST — 19 тестів)
- [x] **[8-4]** Component smoke тести (EvalSection, ExplorePanel, LlmTabsPanel — 10 тестів)
- Усього: 108 тестів пройшли ✅
- Доданий `@vitejs/plugin-react` + `jsdom` + `@testing-library/react` для React-тестів
- Exported helpers з importers для testability

### Фаза 9 — Полірування і деплой

Розбита на 4 етапи. Кожен етап залишає застосунок у робочому стані.

---

#### Етап 9.1 — UX-полірування (loading, empty states, error UI)

**Мета:** Всі видимі стани UI покриті — завантаження, порожні дані, помилки з конкретними повідомленнями.

- [x] **[9-1]** Стани завантаження ✅
  - GamesList: 8 skeleton рядків з `@keyframes skeletonPulse`, відповідають grid структурі `.gameRow`
  - ProfileView: повний skeleton лейаут (hero, filters, 3 stats cards, openings, ELO chart)
  - GameView (LLM/engine): вже мав spinner і progress bar — залишено без змін
  - CSS `@keyframes` pulse в `GamesList.module.css` і `ProfileView.module.css`, без бібліотек

- [x] **[9-2]** Empty states ✅
  - Dashboard: 0 партій після фільтрів → кнопка "Скинути фільтри" (GamesList.tsx)
  - Dashboard: 0 імпортованих партій взагалі → іконка + текст + підказка про форму вище
  - Profile: < 5 партій → existing empty state ✅ вже було
  - GameView: `games/[id]` з невалідним id → кастомна `not-found.tsx` з кнопкою назад
  - GroupAnalysis на `/profile`: кнопка "Запустити аналіз" прямо в empty state

- [x] **[9-3]** Обробка помилок імпорту ✅
  - `ImportError` клас з кодом (`user_not_found`, `rate_limited`, `api_error`, `network_error`) у `lib/importers/errors.ts`
  - Chess.com 404 → "Гравця `{username}` не знайдено на Chess.com"; 429 → "Chess.com обмежує запити..."
  - Lichess 404/429 → аналогічно
  - Мережева помилка (TypeError/TimeoutError) → "Не вдалося підключитись. Перевірте з'єднання"
  - `/api/games/import` повертає `{ error: string, code: string }` з відповідним HTTP-статусом (404/429/502/503)
  - Inline error у ImportForm — без toast ✅

- [x] **[9-4]** Обробка LLM-помилок + retry UI ✅
  - `handleLlmAnalyze` (GameView.tsx): 429 → "Аналіз недоступний — ліміт запитів вичерпано", 503 → "Сервіс аналізу тимчасово недоступний", інші → "Помилка сервера — спробуйте пізніше", мережева помилка → "Не вдалося отримати відповідь. Перевірте з'єднання."
  - `LlmAnalysis` рекомендації (вкладка "Поради"): додано кнопку "Спробувати ще раз" у стан error
  - `ProfileView`: `groupError` стан замість `alert()`, inline помилка з кнопкою "Спробувати ще раз"
  - `ProfileView.module.css`: `.groupError` + `.groupErrorText` стилі

---

#### Етап 9.2 — Backend-надійність (retry, дедуплікація, health)

**Мета:** API витримує тимчасові збої Groq, не дублює group analyses, має health endpoint.

- [x] **[9-5]** Retry з exponential backoff для Groq ✅
  - `lib/retry.ts`: `retryWithBackoff(fn, { maxRetries=3, baseDelayMs=1000 })`
  - Delay cap 4000ms (1s → 2s → 4s); retryable: 429, 503, TypeError; non-retryable: AbortError, решта
  - Підключено до `/api/games/[id]/analyze` і `/api/analysis/group`
  - AbortController shared — один deadline для всіх спроб

- [x] **[9-6]** `inputHash` для дедуплікації group analyses ✅
  - Міграція БД: додати колонку `input_hash TEXT` до таблиці `group_analyses` (nullable для зворотної сумісності); одночасно створити індекс `CREATE INDEX group_analyses_user_hash_idx ON group_analyses(user_id, input_hash)` — підтримує запит `WHERE user_id = ? AND input_hash = ?` без full-table scan
  - Генерація хешу: `SHA-256(sorted game_ids joined by ',')` — використати `crypto` (Node built-in)
  - Логіка в `/api/analysis/group` POST:
    1. Обчислити `inputHash` перед запитом до Groq
    2. `SELECT * FROM group_analyses WHERE user_id = ? AND input_hash = ? ORDER BY created_at DESC LIMIT 1`
    3. Якщо знайдено → повернути кешований результат з `{ cached: true }`
    4. Якщо ні → запустити Groq, зберегти з `input_hash`
  - Drizzle: оновити схему `drizzle/schema.ts` — додати поле `inputHash` і `index("group_analyses_user_hash_idx").on(table.userId, table.inputHash)`, запустити `drizzle-kit generate` + `migrate`
  - Реалізовано cache-first логіку в `/api/analysis/group`: повторний однаковий набір партій повертає `{ cached: true }` без Groq і без rate-limit
  - Додано індекс `group_analyses_user_hash_idx` у Drizzle schema + міграцію `0002_milky_cerebro.sql`
  - Перевірка: `npm.cmd run test:run` → 137/137; `npm.cmd run build` → успішно
  
  ------
  

- [x] **[9-8]** `/api/health` endpoint ✅
  - `GET /api/health` — публічний, без auth
  - Перевіряє: підключення до БД (`SELECT 1`), наявність ключових env vars
  - Відповідь: `{ status: "ok" | "degraded", db: "ok" | "error", env: "ok" | "missing_vars", ts: ISO8601 }`
  - HTTP 200 якщо `status: "ok"`, HTTP 503 якщо `status: "degraded"`
  - Реалізація: `src/app/api/health/route.ts`, тайм-аут на DB ping — 3s
  - Перевірка: route входить у successful `npm.cmd run build`

-----

#### Етап 9.3 — Observability (Sentry)

**Мета:** Продуктові помилки автоматично логуються у Sentry — без PII.

- [x] **[9-7]** Sentry integration ✅
  - `@sentry/nextjs@10.52.0` встановлено (сумісний з Next.js 15)
  - `src/instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — DSN + beforeSend sanitization
  - `src/instrumentation.ts` — Next.js 15 register() hook для server/edge + `onRequestError`
  - `next.config.ts` — wrapped з `withSentryConfig` (sourcemaps disabled, telemetry off)
  - Env vars: `NEXT_PUBLIC_SENTRY_DSN` (client) + `SENTRY_DSN` (server) → `.env.example`
  - Capture points: `/api/games/import` (api_error/network_error), `/api/games/[id]/analyze` (Groq після retry), `/api/analysis/group` (Groq після retry)
  - `src/app/error.tsx` і `src/app/global-error.tsx` — client-side + global App Router error boundaries з `captureException`
  - `beforeSend` видаляє `event.extra`, `event.user`, request body/headers/cookies/query/url і system contexts — без PII
  - Ревью-фікси: sanitized capture helper з оригінальним stack trace, Sentry `sourcemaps.disable: true`, прибрано deprecated `sentry.client.config.ts`
  - Build: ✅ успішно; Tests: 137/137 ✅

---

#### Етап 9.4 — Деплой (staging → production)

**Мета:** Застосунок задеплоєний на Vercel, smoke tests пройшли, production живий.

- [ ] **[9-9]** Production env vars (Vercel)
  - Перелік всіх змінних з `architecture.md` + `SENTRY_DSN`:
    - `DATABASE_URL` — Neon production connection string
    - `AUTH_SECRET` — згенерувати `openssl rand -base64 32`
    - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — production GitHub OAuth App
    - `GROQ_API_KEY`
    - `NEXT_PUBLIC_APP_URL` — production domain (наприклад `https://chess-analysis.vercel.app`)
    - `SENTRY_DSN`
  - Vercel dashboard: Settings → Environment Variables → Production
  - Оновити `.env.example` з усіма ключами (без значень)
  - Перевірити: staging preview build підтягує правильні змінні

- [ ] **[9-10]** Neon production database
  - Neon dashboard: створити production branch (окремо від dev/main branch)
  - Запустити Drizzle migrations: `drizzle-kit migrate` проти production `DATABASE_URL`
  - Верифікувати через `/api/health` → `"db": "ok"`
  - Перевірити що dev migrations не залишили test-даних

- [ ] **[9-11]** Vercel staging deploy
  - Push до `main` → автоматичний Vercel preview або staging URL
  - Перевірити: усі env vars є, `/api/health` → ok, авторизація через GitHub працює
  - Перевірити: `next build` без TypeScript помилок (має бути 0 після Фази 7C)

- [ ] **[9-12]** Smoke tests (імпорт → аналіз → профіль)
  - Manual checklist на staging URL:
    1. [ ] Авторизація через GitHub → редирект на dashboard
    2. [ ] Імпорт 25 партій з Chess.com (реальний нікнейм)
    3. [ ] Імпорт 25 партій з Lichess (реальний нікнейм)
    4. [ ] Відкрити партію → Stockfish аналіз запускається, eval bar рухається
    5. [ ] LLM аналіз однієї партії → відповідь приходить, JSON рендериться
    6. [ ] Груповий аналіз на `/profile` → результат відображається
    7. [ ] Профіль → WDL chart, stats cards, ELO-графік заповнені реальними даними
    8. [ ] Повторний груповий аналіз → повертає кешований (`cached: true`)
    9. [ ] Неіснуючий нікнейм при імпорті → конкретне повідомлення про помилку
    10. [ ] `/api/health` → `{"status":"ok"}`
  - Критерій: всі 10 пунктів пройшли

- [x] **[9-13]** Production deploy ✅
  - Vercel auto-deploy з `main` → production
  - `/api/health` → `{"status":"ok","db":"ok","env":"ok"}` ✅
  - PWA manifest + іконки додано (installable на мобільних)
  - Smoke tests пройшли ✅

---

## 🎯 Топ-10 пріоритетів перед production

### P0 — Блокери
1. ✅ Фаза 6.1 — всі P0/P1/P2 виправлено
2. ✅ Фаза 7.0 — README + тести (1.5 год)
3. ✅ Фаза 7C — розбити GameView.tsx
4. ✅ Фаза 8 — тести критичної логіки

### P1 — Важливі
5. ⏳ Фаза 9 — Sentry
6. ⏳ Фаза 9 — `/api/health`
7. ⏳ Фаза 9 — Retry для Groq
8. ⏳ Фаза 9 — `inputHash` дедуплікація

### P2 — Після production
9. 🔮 React Query для кешування
10. 🔮 LLM client абстракція

---

## ⚠️ Ризики для моніторингу

- [ ] **Chess.com rate limits** — можливі 429 при масовому імпорті
- [ ] **Stockfish WASM performance** — depth 15 може зависати на слабких пристроях
- [ ] **Vercel hobby timeout 10s** — ризик для Groq на 30 партій (потрібен retry)
- [ ] **Обмежене тестове покриття** — unit тести реалізовані для isLlmGameAnalysisV1 і isGroupAnalysisJsonV1, але інші модулі потребують додаткового покриття (GameView.tsx, engine-analysis.ts, importers)
- [ ] **GameView.tsx 1432 рядки** — ризик регресій при змінах

**Закрито:**
- ✅ Lichess NDJSON streaming — працює
- ✅ Gemini limits — замінено на Groq
- ✅ NextAuth v5 setup — налаштовано

---

## 📝 Ключові архітектурні рішення

| Дата | Рішення |
|------|---------|
| 2026-05-02 | NextAuth JWT strategy (без `auth_sessions`) |
| 2026-05-02 | Stockfish depth 15, без time limit, profile `default-v1` |
| 2026-05-02 | Імпорт: за кількістю (25/50/100) або періодом (7/30/90), default 25 |
| 2026-05-03 | Move list без badges якості — іконки тільки на дошці |
| 2026-05-03 | Eval graph — власний SVG (без recharts) |
| 2026-05-04 | Explore mode — drag-to-explore без окремої кнопки |
| 2026-05-05 | LLM-секція у таб-системі (відхилення від spec, UX-зручніше) |
| 2026-05-06 | Groq API замість Gemini (`llama-3.3-70b-versatile`) |
| 2026-05-06 | Груповий аналіз — останні 30 партій автоматично (без чекбоксів) |
| 2026-05-07 | **Гібридний підхід до фіксів:** README + тести зараз, решта після 7C |
| 2026-05-07 | **Фаза 7C обов'язкова перед Фазою 8** — розбити GameView на компоненти |
| 2026-05-07 | **Фаза 7B завершена** — API /api/profile/stats, реальні дані, GroupAnalysisPanel на /profile |

---

## 📊 Результати ревью (2026-05-07)

**Загальна оцінка: 5.3/10**

| Категорія | Оцінка | Коментар |
|-----------|--------|----------|
| Архітектура | 7/10 | Чітка структура, але GameView.tsx 1432 рядки |
| Безпека | 6/10 | Ownership checks є, але немає CSRF і input validation |
| Продуктивність | 5/10 | Groq client на модулі ✅, але немає кешування |
| Якість коду | 6/10 | TypeScript strict, але magic numbers і дублювання |
| Тестування | 0/10 | **КРИТИЧНО** — нульове покриття |
| Документація | 4/10 | Spec є, але немає README |
| Готовність до деплою | 4/10 | Потрібні тести, Sentry, retry |

---

## 📚 Відкриті питання

- [ ] LLM-аналіз має вимагати Stockfish analysis, чи дозволяти PGN-only?

**Закрито:**
- ✅ Профіль об'єднує платформи, ELO-графіки роздвоєні
- ✅ Stockfish depth 15, без time limit
