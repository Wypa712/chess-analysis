---
phase: 10-v2-polish-hardening
plan: "03"
subsystem: performance
tags: [retry, rate-limit, profile-stats, sync, concurrency]
requires: []
provides:
  - LLM Retry-After propagation through retryWithBackoff
  - Parallel profile statistics queries
  - Sync account import concurrency cap
affects: [llm, profile, sync, api]
tech-stack:
  added: []
  patterns:
    - Typed LLM rate-limit error carrying retry-after seconds
    - Structure tests for query and concurrency shape
    - Local concurrency limiter without new dependencies
key-files:
  created:
    - src/lib/retry.test.ts
    - src/app/api/profile/stats/route.structure.test.ts
    - src/app/api/sync/route.structure.test.ts
  modified:
    - src/lib/retry.ts
    - src/app/api/games/[id]/analyze/route.ts
    - src/app/api/analysis/group/route.ts
    - src/app/api/profile/stats/route.ts
    - src/app/api/sync/route.ts
key-decisions:
  - "Used a local semaphore-style helper for sync concurrency instead of adding p-limit."
  - "Returned retryAfter seconds in LLM 429 JSON responses without exposing provider internals."
patterns-established:
  - "Provider Retry-After headers are surfaced through a typed domain error."
  - "Independent DB aggregate queries can be grouped in Promise.all after early guards."
requirements-completed: []
duration: 10 min
completed: 2026-05-14
---

# Phase 10 Plan 03: Performance and Rate-Limit Summary

**Retry-After aware LLM errors, parallel profile stats queries, and capped sync imports**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-14T17:57:00Z
- **Completed:** 2026-05-14T18:06:50Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added `LlmRateLimitError` and surfaced Groq `Retry-After` seconds without retrying the request.
- Added route-level 429 responses with Ukrainian copy and `retryAfter` JSON fields for game and group analysis.
- Parallelized the five profile statistics aggregate queries with one `Promise.all`.
- Replaced uncapped account sync fan-out with a local concurrency limiter set to 2.

## Task Commits

Each task was committed atomically where possible:

1. **Task 1: Propagate Groq Retry-After header** - `c114058` (`feat`)
2. **Task 2: Parallelize profile/stats queries + wire LlmRateLimitError** - `15dd336` (`perf`) plus route catch branches in `2de439c`
3. **Task 3: Cap sync concurrency at 2** - `3306a0f` (`perf`)

**Plan metadata:** pending this SUMMARY commit.

## Files Created/Modified

- `src/lib/retry.ts` - Exports `LlmRateLimitError` and throws it for 429 responses with `Retry-After`.
- `src/lib/retry.test.ts` - Covers immediate no-retry behavior for 429 Retry-After responses.
- `src/app/api/games/[id]/analyze/route.ts` - Returns HTTP 429 with `retryAfter` for LLM rate limits.
- `src/app/api/analysis/group/route.ts` - Returns HTTP 429 with `retryAfter` for LLM rate limits.
- `src/app/api/profile/stats/route.ts` - Runs five stats queries in parallel.
- `src/app/api/profile/stats/route.structure.test.ts` - Guards the parallel query shape.
- `src/app/api/sync/route.ts` - Caps per-account sync imports at two concurrent tasks.
- `src/app/api/sync/route.structure.test.ts` - Guards against uncapped `Promise.all(accounts.map(...))`.

## Decisions Made

- Kept retry behavior unchanged for 429 responses without Retry-After; only explicit Retry-After responses bypass retries.
- Used structure tests for the profile and sync changes because the acceptance criteria are about query/execution shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Commit ordering] Route rate-limit catch branches landed in overlapping route refactor commit**
- **Found during:** Task 2 (profile/stats + analyze route wiring)
- **Issue:** The working tree already had `10-02` and `10-03` route changes interleaved before execution; staging the shared-route refactor also included the LLM rate-limit catch branches.
- **Fix:** Preserved the existing history and documented `2de439c` as part of the Task 2 evidence instead of rewriting commits.
- **Files modified:** `src/app/api/games/[id]/analyze/route.ts`, `src/app/api/analysis/group/route.ts`
- **Verification:** TypeScript and relevant Vitest suites passed after all task commits.
- **Committed in:** `2de439c`

---

**Total deviations:** 1 auto-fixed (commit-ordering documentation).  
**Impact on plan:** Implementation matches the plan; only task-to-commit attribution overlaps because files were premodified.

## Issues Encountered

- Existing uncommitted changes for wave-1 plans were already interleaved in the working tree. I preserved them and committed by the closest task grouping without reverting user work.

## User Setup Required

None - no external service configuration required.

## Verification

- `Select-String` checks found `LlmRateLimitError`, `retry-after`, profile `Promise.all`, `SYNC_CONCURRENCY`, and `runWithConcurrencyLimit`.
- `npx.cmd tsc --noEmit` exited 0.
- `npx.cmd vitest run src/lib/retry.test.ts src/app/api/profile/stats/route.structure.test.ts src/app/api/sync/route.structure.test.ts src/app/api/games/[id]/analyze/route.test.ts` passed; Vitest ran 7 files and 43 tests due project matching.

## Next Phase Readiness

Wave 1 implementation is ready for aggregate verification before any wave 2 work.

---
*Phase: 10-v2-polish-hardening*
*Completed: 2026-05-14*
