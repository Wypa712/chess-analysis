# ROADMAP.md — Chess Analysis App

Last updated: 2026-05-14

---

## Milestones

- [x] **Milestone 1 — v1** (COMPLETE) — Повна функціональність: auth, імпорт, перегляд партії, Stockfish, LLM, профіль
- [ ] **Milestone 2 — v2** (IN PROGRESS) — UX-покращення, альтернативні auth-методи, backlog

---

## Milestone 1 — v1 (COMPLETE)

All 8 original phases are complete. Production is live on Vercel.

### Phases

- [x] **Phase 1: Foundation & Auth** — GitHub OAuth, AppShell, protected routes, DB schema
- [x] **Phase 2: Game Import & List** — Chess.com/Lichess import, dashboard list з фільтрами
- [x] **Phase 3: Single Game View** — Інтерактивна дошка, навігація ходами, PGN move list
- [x] **Phase 4: Stockfish Engine Review** — Eval bar, eval graph SVG, класифікація ходів, ключові моменти
- [x] **Phase 5: Single-Game LLM Analysis** — Groq-аналіз партії, кешування, секції українською
- [x] **Phase 6: Group LLM Analysis** — Вибір 5–30 партій, стиснуті summary, груповий аналіз
- [x] **Phase 7: Player Profile** — Статистика W/D/L, ELO-графіки, LLM narrative summary
- [x] **Phase 8: Polish & Deploy** — Bugfix, responsive, production deploy

---

## Phase Details — Milestone 1

### Phase 1: Foundation & Auth
**Status:** COMPLETE
**Goal:** Користувач може увійти через GitHub OAuth та отримати доступ до захищених маршрутів
**Requirements:** REQ-AUTH-1, REQ-AUTH-2, REQ-AUTH-3, REQ-AUTH-4, REQ-SEC-1
**Success Criteria:**
  1. Користувач без сесії перенаправляється на `/auth/login`
  2. Авторизований користувач бачить `/dashboard`
  3. JWT сесія зберігається між перезавантаженнями сторінки
  4. AppShell (sidebar/bottom nav) відображається на всіх захищених маршрутах
**Plans:** Complete

### Phase 2: Game Import & List
**Status:** COMPLETE
**Goal:** Користувач може підключити Chess.com/Lichess і бачити список імпортованих партій
**Requirements:** REQ-IMPORT-1, REQ-IMPORT-2, REQ-IMPORT-3, REQ-IMPORT-4, REQ-IMPORT-6, REQ-IMPORT-7, REQ-GAMES-1, REQ-GAMES-2, REQ-GAMES-3, REQ-SEC-3
**Success Criteria:**
  1. Користувач підключає Chess.com або Lichess через username
  2. Партії імпортуються чанками по 50, до 1000 партій
  3. Dashboard показує пагінований список з фільтрами (платформа, time control, результат)
  4. Кожен рядок показує: суперник, результат, колір, дебют, time control, дата, статус аналізу
**Plans:** Complete

### Phase 3: Single Game View
**Status:** COMPLETE
**Goal:** Користувач може переглядати партію хід за ходом на інтерактивній дошці
**Requirements:** REQ-GAME-1, REQ-GAME-2, REQ-GAME-3, REQ-GAME-4, REQ-GAME-5, REQ-GAME-6
**Success Criteria:**
  1. Дошка відображає позицію для кожного ходу
  2. Навігація клавіатурою (стрілки) та кнопками (first/prev/next/last) працює
  3. PGN move list показує ходи без badge-ів якості
  4. Останній хід підсвічено на дошці
  5. Стрілка найкращого ходу та іконки якості ходів є на дошці
**Plans:** Complete

### Phase 4: Stockfish Engine Review
**Status:** COMPLETE
**Goal:** Користувач може отримати повний Stockfish-аналіз партії з класифікацією ходів
**Requirements:** REQ-ENGINE-1, REQ-ENGINE-2, REQ-ENGINE-3, REQ-ENGINE-4, REQ-ENGINE-5, REQ-ENGINE-6, REQ-ENGINE-7
**Success Criteria:**
  1. Eval bar відображає оцінку поточної позиції
  2. Clickable SVG eval graph дозволяє перейти до будь-якого ходу
  3. Accuracy score відображається для обох гравців
  4. Кожен хід класифікується (brilliant/best/good/inaccuracy/mistake/blunder)
  5. Панель ключових моментів показує описи критичних ходів
  6. Результат аналізу зберігається в `engine_analyses`
**Plans:** Complete

### Phase 5: Single-Game LLM Analysis
**Status:** COMPLETE
**Goal:** Користувач може отримати LLM-аналіз окремої партії
**Requirements:** REQ-LLM-1, REQ-LLM-2, REQ-LLM-3, REQ-LLM-4, REQ-LLM-5
**Success Criteria:**
  1. Кнопка "Аналізувати партію" запускає Groq-запит
  2. LLM отримує PGN + колір гравця + результат + time control + ключові моменти Stockfish
  3. Відповідь: структурований JSON українською (загальна оцінка, дебют, миттілшпіль, ендшпіль, критичні моменти, рекомендації)
  4. Аналіз кешується в `game_analyses`; повторний запуск вимагає підтвердження
**Plans:** Complete

### Phase 6: Group LLM Analysis
**Status:** COMPLETE
**Goal:** Користувач може проаналізувати групу партій для виявлення повторюваних патернів
**Requirements:** REQ-GROUP-1, REQ-GROUP-2, REQ-GROUP-3, REQ-GROUP-4, REQ-GROUP-5
**Success Criteria:**
  1. Checkbox-вибір 5–30 партій з dashboard
  2. LLM отримує стиснуті summary (не повні PGN)
  3. Відповідь: JSON з повторюваними патернами, тактичними та стратегічними слабкостями, оцінкою дебютів, планом дій
  4. Результат зберігається в `group_analyses`
**Plans:** Complete

### Phase 7: Player Profile
**Status:** COMPLETE
**Goal:** Користувач може переглянути статистику та прогрес рейтингу
**Requirements:** REQ-PROFILE-1, REQ-PROFILE-2, REQ-PROFILE-3, REQ-PROFILE-4, REQ-PROFILE-5, REQ-PROFILE-6
**Success Criteria:**
  1. Профіль доступний при мінімум 5 імпортованих партіях
  2. Фільтр за Period: 7/30/90 днів або всі партії
  3. Статистика W/D/L, результати за time control та кольором, топ дебюти з win rate
  4. ELO-графіки розділені по платформах; відображаються лише для платформ з партіями
  5. LLM narrative summary можна згенерувати та регенерувати
**Plans:** Complete

### Phase 8: Polish & Deploy
**Status:** COMPLETE
**Goal:** Застосунок стабільний, responsive та розгорнутий у production
**Requirements:** REQ-NF-1..10
**Success Criteria:**
  1. Застосунок розгорнутий на Vercel і доступний публічно
  2. Responsive layout: desktop side-by-side, mobile vertical stack
  3. Дошка квадратна на всіх розмірах екрану
  4. API ключі та stack traces не видно в UI
  5. Всі known bugs виправлені
**Plans:** Complete

---

## Milestone 2 — v2 (IN PROGRESS)

### Phases

- [x] **v2 Phase 1: Onboarding + Auto-Sync** ✅ COMPLETE (2026-05-10)
- [ ] **v2 Phase 2: Polish & Hardening** — Security, code cleanup, performance wins, UI/UX audit (PLANNED)
- [ ] **v2 Phase 3: Email Auth + Google OAuth** — Альтернативні методи входу (PLANNED, not urgent)
- [ ] **v2 Phase 4: React Query + Client Caching** — Покращення UX через client-side кешування (Backlog)
- [ ] **v2 Phase 5: LLM Abstraction + Backlog Features** — LLM multi-provider, PGN export, accuracy trend, game sharing (Backlog)

---

## Phase Details — Milestone 2

### v2 Phase 1: Onboarding + Auto-Sync
**Status:** COMPLETE (2026-05-10)
**Goal:** Новий користувач може підключити акаунти через onboarding і не потребує ручного оновлення
**Requirements:** REQ-V2-1, REQ-V2-2, REQ-V2-3, REQ-V2-4, REQ-IMPORT-5, REQ-EXPLORE-1..5, REQ-SEC-2
**Success Criteria:**
  1. Новий користувач бачить `/onboarding` після першого входу
  2. Onboarding показує progress bar chunked initial import
  3. Dashboard автоматично синхронізує нові партії при mount/refresh
  4. Explore mode: гравець може перетягувати фігури і Stockfish оцінює кожен хід
  5. Breadcrumb explore variation дозволяє повернутись до будь-якої точки
  6. `llm_request_locks` запобігає дублюванню LLM-запитів
**Plans:** Complete
**Completed:** 2026-05-10

### v2 Phase 2: Polish & Hardening
**Status:** PLANNED
**Goal:** Підвищити якість існуючої системи: security, code cleanup, performance wins, UI/UX audit
**Context:** `.planning/phases/10-v2-polish-hardening/10-CONTEXT.md`
**Dependencies:** v2 Phase 1
**Success Criteria:**
  1. RLS увімкнено на всіх продуктових таблицях з service-role policies
  2. Дублюючий код (llm-lock, groq-client) винесено в shared lib
  3. GameView, ProfileView, useStockfish розбиті на менші частини
  4. Profile/stats запити паралельні; group analysis cache ordering виправлено
  5. UI audit пройдений, мобайл responsive перевірений по всіх сторінках
  6. Error states покращені (onboarding, SyncStatusBar 429, game/profile)
**Plans:** 7 plans
Plans:
- [x] 10-01-PLAN.md — Security: RLS migration + Content-Length guard + username regex validation
- [x] 10-02-PLAN.md — Code cleanup: extract llm-lock + groq-client shared libs + fix group cache ordering
- [x] 10-03-PLAN.md — Performance: parallelize profile/stats queries + cap sync concurrency + Retry-After propagation
- [x] 10-04-PLAN.md — Refactor: split GameView (useGameNavigation + useExploreMode) + useStockfish (useStockfishWorker + useGameAnalysis)
- [x] 10-05-PLAN.md — Refactor: split ProfileView (useProfileStats) + rename totalGames → analyzedGames + queen-promotion hint
- [x] 10-06-PLAN.md — Error states: SyncStatusBar 429/localStorage + onboarding error parsing + game/profile error visibility
- [ ] 10-07-PLAN.md — UI/UX audit: visual sweep + mobile responsive review (has human-verify checkpoint)

### v2 Phase 3: Email Auth + Google OAuth
**Status:** PLANNED
**Goal:** Користувач може увійти через email/пароль або Google акаунт (не лише GitHub)
**Requirements:** REQ-V2-5, REQ-V2-6
**Dependencies:** v2 Phase 2
**Success Criteria:**
  1. Користувач може зареєструватись з email + пароль
  2. Користувач може увійти через Google OAuth
  3. GitHub OAuth залишається активним (не замінюється)
  4. `auth_verification_tokens.token` захищений HMAC-SHA256 (вимога безпеки)
  5. RLS вмикається на раніше незахищених таблицях
**Plans:** TBD
**UI hint**: yes

### v2 Phase 4: React Query + Client Caching
**Status:** PLANNED
**Goal:** Навігація між сторінками швидша завдяки client-side кешуванню даних
**Requirements:** REQ-V2-7
**Dependencies:** v2 Phase 1
**Success Criteria:**
  1. Список партій не перезавантажується при поверненні на dashboard
  2. Повторний перехід на сторінку партії не робить зайвих API-запитів
  3. Cache invalidation коректна після sync нових партій
**Plans:** TBD

### v2 Phase 5: LLM Abstraction + Backlog Features
**Status:** PLANNED
**Goal:** LLM-клієнт абстрагований від провайдера; PGN export, accuracy trend та sharing доступні
**Requirements:** REQ-V2-8, REQ-V2-9, REQ-V2-10, REQ-V2-11
**Dependencies:** v2 Phase 1
**Success Criteria:**
  1. LLM-провайдер змінюється через конфіг (не через правку коду)
  2. Користувач може скачати PGN окремої партії
  3. Accuracy trend chart показує динаміку точності гравця по сесіях
  4. Користувач може поділитись партією за посиланням
**Plans:** TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|---|---|---|---|
| M1 — 1. Foundation & Auth | Done | Complete | 2025 |
| M1 — 2. Game Import & List | Done | Complete | 2025 |
| M1 — 3. Single Game View | Done | Complete | 2025 |
| M1 — 4. Stockfish Engine Review | Done | Complete | 2025 |
| M1 — 5. Single-Game LLM Analysis | Done | Complete | 2025 |
| M1 — 6. Group LLM Analysis | Done | Complete | 2025 |
| M1 — 7. Player Profile | Done | Complete | 2025 |
| M1 — 8. Polish & Deploy | Done | Complete | 2025 |
| M2 — v2 Phase 1: Onboarding + Auto-Sync | Done | Complete | 2026-05-10 |
| M2 — v2 Phase 2: Polish & Hardening | 0/7 | Planned | - |
| M2 — v2 Phase 3: Email Auth + Google OAuth | TBD | Planned | - |
| M2 — v2 Phase 4: React Query + Client Caching | TBD | Planned | - |
| M2 — v2 Phase 5: LLM Abstraction + Backlog | TBD | Planned | - |
