---
phase: 10-v2-polish-hardening
status: issues_found
depth: standard
files_reviewed: 17
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
reviewed_at: 2026-05-14
---

# Phase 10 Code Review

Reviewed wave-1 source changes from summaries and phase commits.

## Findings

### WR-01: Group-analysis cache no longer invalidates when per-game analysis inputs change

- **Severity:** Warning
- **File:** `src/app/api/analysis/group/route.ts:99`
- **Problem:** `inputHash` is now derived only from `usedIds` plus model and prompt version. The generated prompt still depends on `buildGameSummaries`, which reads latest engine analyses and latest game LLM analyses. If any selected game's engine analysis or individual LLM analysis changes after a group analysis is cached, a later group POST for the same game IDs returns the old group analysis without rebuilding summaries.
- **Evidence:** `createGroupInputHash(usedIds)` runs before cache lookup at lines 99-100, while the prompt content is built later from `buildGameSummaries(ownedGames)` at lines 157-158 and that helper reads `engineAnalyses` / `gameAnalyses` at lines 344-365.
- **Fix:** Keep cache lookup before full prompt construction, but make the pre-summary cache key include a cheap dependency fingerprint: selected game IDs in deterministic order plus latest relevant `engine_analyses.created_at` and `game_analyses.created_at` (or latest analysis row IDs / content hashes) for each game.

### WR-02: Engine-analysis payload limit trusts optional Content-Length only

- **Severity:** Warning
- **File:** `src/app/api/games/[id]/engine-analysis/route.ts:117`
- **Problem:** The 500 KB guard only rejects when `Content-Length` is present, parseable, and over the limit. A client using chunked transfer, omitting the header, or sending a non-numeric header still reaches `req.json()`, so the endpoint can parse an oversized JSON body.
- **Evidence:** Lines 117-123 skip rejection for missing or unparsable headers, then line 127 parses the full JSON body. The new test covers only the oversized-header path.
- **Fix:** Add an actual body-size enforcement path. For example, read `req.text()` with a bounded stream reader or a byte-counting helper before `JSON.parse`, rejecting once the accumulated body exceeds `MAX_PAYLOAD_BYTES`. Keep the header pre-check as an early optimization.

### IN-01: Retry-After seconds are not clamped

- **Severity:** Info
- **File:** `src/lib/retry.ts:43`
- **Problem:** `parseInt(retryAfter, 10) || 60` can propagate negative values if a malformed provider header is ever returned.
- **Evidence:** `parseInt("-5", 10)` is `-5`, which is truthy, so `retryAfterSeconds` becomes negative and the API response would include `retryAfter: -5`.
- **Fix:** Normalize to a positive finite integer, for example `Number.isFinite(parsed) && parsed > 0 ? parsed : 60`.

## Attack Surface Reviewed

- **User inputs:** route params, request bodies, `Content-Length`, query params, usernames, explicit game IDs.
- **Database queries:** ownership joins, group-analysis cache lookup, LLM lock insert/delete, profile stats aggregates, sync account lookups.
- **Auth/authz:** all reviewed protected endpoints call `auth()`; game-specific endpoints use ownership joins.
- **External calls:** Lichess and Chess.com username validation/imports, Groq chat completions.
- **State/session:** LLM request locks, `lastSyncedAt`, cached LLM/group analysis rows.
- **DoS/resource risks:** payload parsing, LLM retries, sync concurrency, stats query fan-out.

## Files Reviewed

- `drizzle/0002_rls_policies.sql`
- `src/app/api/analysis/group/route.structure.test.ts`
- `src/app/api/analysis/group/route.ts`
- `src/app/api/chess-accounts/route.test.ts`
- `src/app/api/chess-accounts/route.ts`
- `src/app/api/games/[id]/analyze/route.test.ts`
- `src/app/api/games/[id]/analyze/route.ts`
- `src/app/api/games/[id]/engine-analysis/route.test.ts`
- `src/app/api/games/[id]/engine-analysis/route.ts`
- `src/app/api/profile/stats/route.structure.test.ts`
- `src/app/api/profile/stats/route.ts`
- `src/app/api/sync/route.structure.test.ts`
- `src/app/api/sync/route.ts`
- `src/lib/db/llm-lock.ts`
- `src/lib/llm/groq-client.ts`
- `src/lib/retry.test.ts`
- `src/lib/retry.ts`

## Checklist Summary

- Injection: no SQL/string injection found in reviewed changes; Drizzle parameterization is used.
- XSS: no direct HTML/template rendering in reviewed files.
- Authentication: protected API routes check `auth()`.
- Authorization/IDOR: game/account routes use user-scoped joins or account filters.
- CSRF: not fully assessed; project auth/session CSRF posture is outside this file scope.
- Race conditions: LLM lock insert uses `onConflictDoNothing`; no new high-risk TOCTOU found.
- Session: no session mutation changes reviewed.
- Cryptography: SHA-256 cache hashes use non-secret input; no cryptographic auth added.
- Information disclosure: no raw provider errors returned to clients in changed routes.
- DoS: findings WR-02 and sync concurrency reviewed.
- Business logic: finding WR-01 affects cache freshness.

## Areas Not Fully Verified

- I did not apply the SQL migration to Neon; review is static.
- I did not test chunked or headerless oversized HTTP bodies against a live Next server.
- I did not review unrelated pre-existing dirty files outside the phase scope.
