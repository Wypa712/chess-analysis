---
phase: 10-v2-polish-hardening
plan: "02"
subsystem: api
tags: [llm, groq, locks, cache, refactor]
requires: []
provides:
  - Shared LLM request lock helpers
  - Shared Groq client singleton
  - Analyze routes wired to shared LLM infrastructure
  - Group-analysis cache lookup before LLM lock acquisition
affects: [game-analysis, group-analysis, llm, cache]
tech-stack:
  added: []
  patterns:
    - Shared DB helper module for LLM request locks
    - Shared LLM provider singleton module
key-files:
  created:
    - src/lib/db/llm-lock.ts
    - src/lib/llm/groq-client.ts
  modified:
    - src/app/api/games/[id]/analyze/route.ts
    - src/app/api/analysis/group/route.ts
    - src/app/api/games/[id]/analyze/route.test.ts
    - src/app/api/analysis/group/route.structure.test.ts
key-decisions:
  - "Kept lock helper logic identical while moving it behind named exports."
  - "Changed group-analysis inputHash to use selected game IDs so cache lookup can run before summary aggregation."
patterns-established:
  - "Route handlers import shared LLM infrastructure instead of owning provider/client setup."
requirements-completed: []
duration: 22 min
completed: 2026-05-14
---

# Phase 10 Plan 02: LLM Infrastructure Refactor Summary

**Shared LLM lock helpers and Groq client for game and group analysis routes**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-14T17:35:00Z
- **Completed:** 2026-05-14T17:57:04Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Extracted `acquireLlmLock` and `releaseLlmLock` into `src/lib/db/llm-lock.ts`.
- Extracted the module-level Groq singleton into `src/lib/llm/groq-client.ts`.
- Removed local lock/client duplicates from game and group analyze routes.
- Moved group-analysis cache lookup before `buildGameSummaries`, avoiding summary aggregation and lock use on cache hits.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract LLM lock helpers into shared lib** - `685c42f` (`refactor`)
2. **Task 2: Extract Groq client singleton into shared lib** - `08938b8` (`refactor`)
3. **Task 3: Wire shared libs into analyze routes** - `2de439c` (`refactor`)
4. **Acceptance fix: Check group cache before summary aggregation** - `77963bb` (`fix`)

**Plan metadata:** pending this SUMMARY commit.

## Files Created/Modified

- `src/lib/db/llm-lock.ts` - Exports shared lock acquire/release helpers.
- `src/lib/llm/groq-client.ts` - Exports the shared Groq singleton.
- `src/app/api/games/[id]/analyze/route.ts` - Imports shared lock/client modules.
- `src/app/api/analysis/group/route.ts` - Imports shared lock/client modules and checks cache before summary aggregation.
- `src/app/api/games/[id]/analyze/route.test.ts` - Updated a comment so grep-based verification only detects real client construction.
- `src/app/api/analysis/group/route.structure.test.ts` - Guards cache-before-summary ordering.

## Decisions Made

- No behavior changes were introduced to the lock helper implementation during extraction.
- The D-12 cache-ordering item required changing `inputHash` to use selected game IDs instead of summaries so lookup can happen before `buildGameSummaries`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Cache lookup still ran after summary aggregation**
- **Found during:** Code-review acceptance pass after initial `10-02` close-out
- **Issue:** The implementation satisfied cache-before-lock ordering, but the plan frontmatter required cache lookup before `buildGameSummaries`.
- **Fix:** Changed group-analysis input hash to use selected game IDs and added a structure test asserting cache lookup precedes `buildGameSummaries`.
- **Files modified:** `src/app/api/analysis/group/route.ts`, `src/app/api/analysis/group/route.structure.test.ts`
- **Verification:** The new structure test failed before the fix and passed after the fix; TypeScript passed.
- **Committed in:** `77963bb`

---

**Total deviations:** 1 auto-fixed (missing critical acceptance behavior).  
**Impact on plan:** Behavior now matches the stricter must-have; existing summary-based cache keys are superseded by game-ID based keys.

## Issues Encountered

- The `new Groq(` verification pattern matched a test comment; the comment was rephrased so the check reflects actual code.

## User Setup Required

None - no external service configuration required.

## Verification

- `Get-ChildItem -Path src/app/api -Recurse -Filter *.ts | Select-String -Pattern 'new Groq\\(|function acquireLlmLock'` returned no matches.
- `npx.cmd vitest run src/app/api/analysis/group/route.structure.test.ts` failed before the cache-ordering fix and passed after it.
- `npx.cmd tsc --noEmit` exited 0.
- `npx.cmd vitest run src/app/api/games/[id]/analyze/route.test.ts` passed; Vitest ran 4 files and 40 tests due project matching.

## Next Phase Readiness

Ready for `10-03`; rate-limit handling can now build on the shared retry and LLM route wiring.

---
*Phase: 10-v2-polish-hardening*
*Completed: 2026-05-14*
