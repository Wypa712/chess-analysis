---
gsd_state_version: 1.0
milestone: v2
milestone_name: v2
status: Ready for next phase
last_updated: "2026-05-16T00:00:00Z"
current_phase: 13
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 14
  completed_plans: 12
  percent: 86
---

# STATE.md — Chess Analysis App

Last updated: 2026-05-15 (Phase 12 complete)

---

## Project Reference

**Core value:** Україномовний шаховий тренер — Stockfish-аналіз + LLM-коучинг для гравців ~1000 ELO
**Current focus:** Phase 12 COMPLETE — Ready for next phase

---

## Current Position

Phase: 13 (mobile-ui-ux-improvements) — IN PROGRESS (2026-05-16)
Plans: 1/3 complete
**Milestone:** 2 — v2
**Last completed:** Phase 13 Plan 01 — Pull-to-Refresh on Dashboard (2026-05-16)
**Status:** Executing Phase 13

```
Progress: [████░░░░░░] 86%
Milestone 1: 8/8 phases ✅
Milestone 2: Phase 13 in progress (1/3 plans done)
```

---

## What Was Last Completed

**Phase 13 Plan 01: Pull-to-Refresh on Dashboard** — completed 2026-05-16

Delivered:

- `usePullToRefresh` hook — кастомний gesture hook (touchstart/touchmove/touchend, поріг 60px, клампінг 80px)
- `SyncStatusBar` — `forwardRef` + `useImperativeHandle` expose `runSync` через `SyncStatusBarHandle`
- `DashboardClient` — інтеграція hook + ref, SVG-спінер з `ptr-spin` анімацією

**v2 Phase 4: React Query + Client Caching** — completed 2026-05-15

Delivered:

- `@tanstack/react-query v5` встановлено, `QueryProvider` (SSR-safe via useState) обгортає весь (app) layout
- `GamesList` мігровано на `useQuery(['games', userId, filters])` зі staleTime 5 хвилин
- `DashboardClient` — `refreshKey` видалено, `invalidateQueries` після sync
- `GameView` — два GET useEffect → `useQuery` з staleTime Infinity, `initialFetchCount` видалено
- `ProfileView` — GET group analysis → `useQuery` зі staleTime 10 хвилин, `setQueryData` після POST
- Повторна навігація між сторінками більше не робить зайвих мережевих запитів

**v2 Phase 1: Onboarding + Auto-Sync** — completed 2026-05-10

Delivered:

- `/onboarding` page: підключення Chess.com/Lichess + chunked import progress bar
- `/settings` page: управління акаунтами + dev-only reset
- Автоматичний delta sync на dashboard mount/refresh (без ручної кнопки оновлення)
- Explore mode: drag pieces від будь-якої позиції, Stockfish оцінює, breadcrumb trail
- `llm_request_locks` таблиця для idempotent LLM-викликів
- Global color palette: teal/info/copper accents
- Protected routes переміщені до `src/app/(app)/` route group
- Bug fixes: group analysis cache hash, profile stats period filter, mobile UX, PWA icons
- Всі known bugs (phases 1–6) з `known-issues.md` marked as fixed

---

## What Is Next

**v2 Phase 2: Polish & Hardening** — залишився план 10-07 (UI/UX audit з human-verify checkpoint)
або
**v2 Phase 3: Email Auth + Google OAuth** (PLANNED, not urgent)

Priority: Low — GitHub OAuth залишається основним і достатнім методом входу.

Key work:

- Додати email/password auth через NextAuth.js v5 credentials provider
- Додати Google OAuth provider
- HMAC-SHA256 для `auth_verification_tokens.token`
- Увімкнути RLS на `users`, `auth_accounts`, `auth_verification_tokens`

Alternative next step (backlog):

- v2 Phase 3: React Query для client-side кешування (покращення UX навігації)
- v2 Phase 4: LLM abstraction, PGN export, accuracy trend, game sharing

---

## Blockers

None active.

---

## Open Questions

1. **LLM + Stockfish залежність:** Чи має single-game LLM-аналіз вимагати завершеного Stockfish-аналізу, чи може запускатись лише на PGN?
2. **RLS:** Таблиці `users`, `auth_accounts`, `auth_verification_tokens` без RLS — коли вмикати? (блокується v2 Phase 2)
3. **Lichess timeout:** 20s global timeout недостатньо для 50–100 партій — потрібен idle-chunk timeout (backlog)
4. **React Query:** Додавати у v2 Phase 3 або залишити без query client?

---

## Accumulated Context

### Architecture Decisions (LOCKED)

- Auth: GitHub OAuth, JWT, без `auth_sessions`, protected `src/app/(app)/`
- LLM: Groq `llama-3.3-70b-versatile`, strict Ukrainian JSON, кешування в DB
- Engine: Stockfish WASM client-side, два Web Workers
- Import: chunked 50/chunk, delta-sync watermark
- Styling: CSS Modules, dark-green + teal/copper palette, monospace для чисел
- Eval graph: custom SVG, без chart-бібліотек
- DB PKs: `uuid`, timestamps: `timestamptz`, outputs: `jsonb`

### Known Risk Areas

- `engine_analyses.analysis_json` розмір у Neon на scale — моніторити
- Lichess NDJSON streaming timeout для великих імпортів
- Groq rate limits під навантаженням після launch

### Technical Todos (Backlog)

- [ ] Lichess idle-chunk timeout fix
- [ ] RLS вмикання (блокує email auth)
- [ ] Моніторинг Groq rate limits
- [ ] `engine_analyses.analysis_json` size monitoring

---

## Session Continuity

To resume work:

1. Read `.planning/ROADMAP.md` — поточна фаза і success criteria
2. Read `spec/progress-tracker.md` — деталі прогресу і відкриті питання
3. Read `spec/code-standards.md` — conventions і правила реалізації
4. Check `spec/architecture.md` перед будь-якими архітектурними змінами

Next command to run: `/gsd-plan-phase v2-phase-2` або вибрати backlog item
