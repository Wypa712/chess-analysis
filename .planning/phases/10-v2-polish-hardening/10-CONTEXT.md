# Phase 10: v2 Polish & Hardening — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve quality of the existing system without adding new capabilities. Scope covers:
- Security hardening (RLS on product tables, input validation, error exposure)
- Code cleanup (extract shared utilities, split oversized files)
- Performance quick wins (parallelise DB queries, fix cache ordering, cap sync concurrency)
- UI/UX polish (general visual audit, mobile responsive, error states, loading states)

New features (email auth, React Query, LLM abstraction) are NOT in scope — those belong in v2 Phases 2–4.

</domain>

<decisions>
## Implementation Decisions

### Security

- **D-01:** Enable RLS on ALL product tables (`chess_accounts`, `games`, `engine_analyses`, `game_analyses`, `group_analyses`, `player_summaries`, `llm_request_locks`). Add service-role bypass policies so the backend continues to work. Verify the Neon connection role does not have `BYPASSRLS`.
- **D-02:** Token hashing (`auth_verification_tokens.token`) is DEFERRED to v2 Phase 2 (Email Auth) — tokens are only used in email flows that don't exist yet.
- **D-03:** Add `Content-Length` guard on `POST /api/games/[id]/engine-analysis` — reject payloads > 500 KB before `req.json()`.
- **D-04:** Add platform-specific username regex validation in `POST /api/chess-accounts` before external API calls (Lichess: `[a-zA-Z0-9_-]`, Chess.com: `[a-zA-Z0-9_]`).
- **D-05:** Propagate Groq `Retry-After` header to the client on 429. Show distinct "LLM перевантажена — спробуй через N сек" message in the UI.

### Code Cleanup

- **D-06:** Extract `acquireLlmLock` / `releaseLlmLock` into `src/lib/db/llm-lock.ts`; import from both analyze routes.
- **D-07:** Extract Groq client singleton into `src/lib/llm/groq-client.ts`; import from both analyze routes.
- **D-08:** Refactor oversized files — extract logic into hooks/sub-components:
  - `GameView.tsx` (871 lines) → `useGameNavigation` hook + `useExploreMode` hook
  - `ProfileView.tsx` (664 lines) → `useProfileStats` hook + split chart sub-components
  - `useStockfish.ts` (622 lines) → `useStockfishWorker` (raw UCI) + `useGameAnalysis` (higher-level state)
- **D-09:** Fix queen promotion in explore mode — add a UI hint ("тільки ферзь") or a simple promotion-choice modal.
- **D-10:** Rename `totalGames` → `analyzedGames` in `GET /api/profile/stats` response to remove the ambiguous duplicate field.

### Performance

- **D-11:** Wrap the 5 sequential DB queries in `GET /api/profile/stats` in `Promise.all([...])`.
- **D-12:** Move the `inputHash` cache lookup in `POST /api/analysis/group` to BEFORE `buildGameSummaries` — compute summaries only on cache miss.
- **D-13:** Cap `POST /api/sync` parallel imports at concurrency 2 (use a concurrency limiter; existing code fans out to all accounts).

### UI/UX

- **D-14:** Run a full visual UI audit across all pages — identify inconsistencies, spacing, typography, and colour usage. Apply fixes as a sweep.
- **D-15:** Full mobile responsive review across all pages — board, panels, nav, forms. Fix layout issues found.
- **D-16:** Improve error states:
  - Onboarding: replace generic "Помилка мережі" with parsed server message (JSON error body or status text).
  - `SyncStatusBar`: add 429 branch — show "Синхронізацію rate-limited — спробуй через 60 сек", skip mount-time auto-sync for 60 s using `localStorage` timestamp.
  - Game/profile pages: ensure API errors surface a readable error state (not blank screen).
- **D-17:** Loading states — addressed by the visual UI audit (D-14); resolve any spinner/skeleton inconsistencies found.

### Claude's Discretion

- Specific approach for RLS policy implementation (service-role vs anon vs direct user-scoped)
- Concurrency limiter library/pattern for sync (e.g., `p-limit` or manual semaphore)
- Exact split point when refactoring large components — keep existing test coverage passing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Schema
- `spec/architecture.md` — system architecture decisions (LOCKED)
- `src/db/schema.ts` — Drizzle schema; all RLS changes go here + migrations
- `drizzle/0001_align_auth_schema.sql` — existing RLS enable statements (no policies yet)

### Security
- `.planning/codebase/CONCERNS.md` — full list of security/debt/perf concerns with line refs (generated 2026-05-14)
- `src/lib/auth/token-hash.ts` — HMAC-SHA256 helper (exists, not wired — leave for Phase 2)

### Code to Refactor
- `src/app/(app)/games/[id]/GameView.tsx` — 871 lines, split into hooks
- `src/components/ProfileView/ProfileView.tsx` — 664 lines, split into hook + sub-components
- `src/hooks/useStockfish.ts` — 622 lines, split into worker + analysis hooks
- `src/app/api/games/[id]/analyze/route.ts` — contains duplicate llm-lock + groq-client
- `src/app/api/analysis/group/route.ts` — contains duplicate llm-lock + groq-client; cache ordering bug

### Performance
- `src/app/api/profile/stats/route.ts` — 5 sequential queries to parallelise
- `src/app/api/sync/route.ts` — fan-out concurrency to cap at 2
- `.planning/codebase/CONCERNS.md` §3 — performance risks with locations

### Spec & Standards
- `spec/code-standards.md` — coding conventions
- `spec/progress-tracker.md` — current progress and open questions
- `.planning/codebase/CONVENTIONS.md` — naming, CSS, TypeScript patterns (generated 2026-05-14)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/retry.ts` — `retryWithBackoff` already exists; extend to propagate `Retry-After` header
- `src/lib/auth/token-hash.ts` — HMAC helper exists but unused; leave for Phase 2
- CSS Modules + dark-green/teal/copper palette — established; visual audit should stay within this system
- `src/components/SyncStatusBar/SyncStatusBar.tsx` — already reads from `sessionStorage`; upgrade to `localStorage` for cross-tab sync guard

### Established Patterns
- CSS Modules — all styling via `.module.css`; no Tailwind
- Server Components for data fetching; Client Components for interactive UI (`'use client'`)
- Drizzle ORM with Neon — parameterized queries, no raw SQL in app code
- `vi.mock` + dynamic `await import('./route')` pattern in API route tests — maintain when refactoring

### Integration Points
- RLS migrations → new file in `drizzle/` (following `0001_`, `0002_` pattern)
- New shared lib files → `src/lib/db/` and `src/lib/llm/` directories
- Refactored hooks → co-located with the component or in `src/hooks/`

</code_context>

<specifics>
## Specific Ideas

- UI audit should cover all pages: `/dashboard`, `/games/[id]`, `/profile`, `/onboarding`, `/settings`
- Mobile review: any screen ≤ 768px, focus on the chess board + analysis panels (most complex layout)
- Error messages in Ukrainian (consistent with rest of app)
- SyncStatusBar 429 guard: `localStorage` key `chess_sync_rate_limited_until` (timestamp) — skip sync if current time < stored value

</specifics>

<deferred>
## Deferred Ideas

- `auth_verification_tokens.token` HMAC-SHA256 hashing → v2 Phase 2 (Email Auth)
- OAuth tokens at-rest encryption (`refresh_token`, `access_token`) → accepted risk for now (Neon transparent encryption assumed)
- `llmRequestLocks` table periodic cleanup job → backlog
- `group_analyses` / `player_summaries` retention policy → backlog
- Multi-tab sync coordination via `BroadcastChannel` → covered partially by `localStorage` timestamp guard (D-16); full BroadcastChannel is backlog
- CI pipeline setup → separate initiative

None — discussion stayed within phase scope otherwise.

</deferred>

---

*Phase: 10-v2-polish-hardening*
*Context gathered: 2026-05-14*
