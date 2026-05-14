---
phase: 10-v2-polish-hardening
plan: "01"
subsystem: security
tags: [rls, api-hardening, validation, postgres]
requires: []
provides:
  - Product-table RLS migration with service-role bypass policies
  - Engine analysis payload size guard
  - Platform-specific chess username validation
affects: [database, api, authz, chess-accounts, engine-analysis]
tech-stack:
  added: []
  patterns:
    - Content-Length guard before JSON body parsing
    - Platform-specific regex validation before external API calls
key-files:
  created:
    - drizzle/0002_rls_policies.sql
    - src/app/api/games/[id]/engine-analysis/route.test.ts
    - src/app/api/chess-accounts/route.test.ts
  modified:
    - src/app/api/games/[id]/engine-analysis/route.ts
    - src/app/api/chess-accounts/route.ts
key-decisions:
  - "Used service_role bypass policies only; user-scoped RLS policies remain deferred."
patterns-established:
  - "Security guards run before expensive parsing or external network calls."
requirements-completed: []
duration: 10 min
completed: 2026-05-14
---

# Phase 10 Plan 01: Security Hardening Summary

**Product-table RLS policies plus API guards for oversized engine payloads and invalid chess usernames**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-14T17:24:00Z
- **Completed:** 2026-05-14T17:34:54Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `0002` migration enabling RLS on all 7 product tables with `service_role` bypass policies.
- Added a 500 KB Content-Length guard before `req.json()` in the engine-analysis POST route.
- Added Lichess and Chess.com username regex validation before external profile lookups.
- Added regression coverage for the oversized-payload and invalid-username paths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RLS migration for all product tables** - `d6174bc` (`feat`)
2. **Task 2: Content-Length guard on engine-analysis POST** - `aa52730` (`feat`)
3. **Task 3: Platform-specific username regex validation in chess-accounts** - `50ab163` (`feat`)

**Plan metadata:** pending this SUMMARY commit.

## Files Created/Modified

- `drizzle/0002_rls_policies.sql` - Enables RLS and service-role bypass policies for product tables.
- `src/app/api/games/[id]/engine-analysis/route.ts` - Rejects payloads over 500 KB before JSON parsing.
- `src/app/api/games/[id]/engine-analysis/route.test.ts` - Covers the pre-parse 413 path.
- `src/app/api/chess-accounts/route.ts` - Validates platform-specific username syntax before API lookup.
- `src/app/api/chess-accounts/route.test.ts` - Covers invalid Lichess and Chess.com usernames.

## Decisions Made

- Followed the plan's DB-layer hardening scope: service-role bypass only, no user-scoped policies in this phase.
- Kept invalid Content-Length headers permissive, because the header is optional and can be absent in valid clients.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.  
**Impact on plan:** No scope change.

## Issues Encountered

- Git index writes required elevated execution in this environment; commits were created after approval.

## User Setup Required

Manual DB apply remains required: run `npx.cmd drizzle-kit push` or apply the migration in Neon. I did not run it.

## Verification

- `Select-String` found 7 `ENABLE ROW LEVEL SECURITY` statements and 7 `CREATE POLICY` statements.
- `npx.cmd tsc --noEmit` exited 0.
- `npx.cmd vitest run src/app/api/chess-accounts/route.test.ts src/app/api/games/[id]/engine-analysis/route.test.ts` passed: 2 files, 3 tests.

## Next Phase Readiness

Ready for `10-02`; shared LLM infrastructure can be refactored on top of these API hardening changes.

---
*Phase: 10-v2-polish-hardening*
*Completed: 2026-05-14*
