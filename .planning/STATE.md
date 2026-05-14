---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 10
status: executing
last_updated: "2026-05-14T17:57:33.331Z"
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# STATE.md — Chess Analysis App

Last updated: 2026-05-14 (Phase 10 planned)

---

## Project Reference

**Core value:** Україномовний шаховий тренер — Stockfish-аналіз + LLM-коучинг для гравців ~1000 ELO
**Current focus:** Phase 10 — v2-polish-hardening

---

## Current Position

Phase: 10 (v2-polish-hardening) — EXECUTING
Plan: 3 of 7
**Milestone:** 2 — v2
**Current phase:** 10
**Last completed:** v2 Phase 1 — Onboarding + Auto-Sync (2026-05-10)
**Status:** Ready to execute

```
Progress: [░░░░░░░░░░] 0%
Milestone 1: 8/8 phases ✅
Milestone 2: 1/4 phases ✅ (v2 Phase 1 done)
```

---

## What Was Last Completed

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

**v2 Phase 2: Email Auth + Google OAuth** (PLANNED, not urgent)

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
