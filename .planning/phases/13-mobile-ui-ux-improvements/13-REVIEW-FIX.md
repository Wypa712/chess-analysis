---
phase: 13-mobile-ui-ux-improvements
fixed_at: 2026-05-16T18:35:00+02:00
review_path: .planning/phases/13-mobile-ui-ux-improvements/13-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-05-16T18:35:00+02:00  
**Source review:** `.planning/phases/13-mobile-ui-ux-improvements/13-REVIEW.md`  
**Iteration:** 1

## Summary

- Findings in scope: 2 (1 Critical + 1 Warning)
- Fixed: 2
- Skipped: 0
- Info findings excluded by default `--fix` scope

## Fixed Issues

### CR-01: Pull-to-refresh checked the dashboard wrapper instead of AppShell scroll root

**Files modified:** `src/components/AppShell.tsx`, `src/components/AppShell.test.tsx`, `src/hooks/usePullToRefresh.ts`

**Applied fix:** Added `data-scroll-root` to the AppShell `<main>` scroll viewport. `usePullToRefresh` now checks `closest("[data-scroll-root]")` and only begins dragging when that scroll root is at `scrollTop === 0`.

### WR-01: Hidden mobile Moves tab could remain active after resize

**Files modified:** `src/app/(app)/games/[id]/GameView.tsx`, `src/app/(app)/games/[id]/components.test.tsx`

**Applied fix:** Added a responsive state guard in `GameView` that switches `activeTab` from `"moves"` to `"analysis"` whenever `isMobile` becomes true.

## Additional Test Hygiene

`components.test.tsx` had TypeScript-only test issues that blocked `tsc --noEmit`: a missing `rank` field in a candidate fixture and regex `s` flags incompatible with the configured TypeScript target. These were corrected without changing production behavior.

## Verification

- `npm.cmd run test:run -- src/components/AppShell.test.tsx "src/app/(app)/games/[id]/components.test.tsx"` — 20 passed
- `npm.cmd run test:run` — 155 passed
- `npx.cmd tsc --noEmit` — passed

---

_Fixed: 2026-05-16T18:35:00+02:00_  
_Fixer: Codex inline code-fixer_  
_Iteration: 1_
