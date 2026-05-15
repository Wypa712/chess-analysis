---
phase: 10-v2-polish-hardening
plan: "04"
subsystem: ui
tags: [react, hooks, stockfish, chessboard, vitest]

requires:
  - phase: 10-02
    provides: shared LLM infrastructure refactor dependency completed before wave 2
provides:
  - GameView navigation state extracted to useGameNavigation
  - GameView explore mode state extracted to useExploreMode
  - Stockfish worker protocol extracted to useStockfishWorker
  - Game analysis orchestration extracted to useGameAnalysis
  - Thin backwards-compatible useStockfish composition hook
affects: [game-view, stockfish, explore-mode, phase-10-wave-2]

tech-stack:
  added: []
  patterns: [focused client hooks for game-view state, thin composition wrapper for browser workers]

key-files:
  created:
    - src/hooks/useGameNavigation.ts
    - src/hooks/useGameNavigation.test.ts
    - src/hooks/useExploreMode.ts
    - src/hooks/useStockfishWorker.ts
    - src/hooks/useGameAnalysis.ts
  modified:
    - src/app/(app)/games/[id]/GameView.tsx
    - src/hooks/useStockfish.ts

key-decisions:
  - "Kept useStockfish() public API and GameView import unchanged while moving implementation into worker and analysis hooks."
  - "Added a focused jsdom hook test for navigation clamping before implementing useGameNavigation."
  - "Preserved queen-only explore promotion behavior with a D-09 comment for the separate Plan 05 UI hint."

patterns-established:
  - "Large client components can delegate route-local state into src/hooks without moving JSX rendering."
  - "Browser worker hooks expose small factory objects while higher-level hooks own queueing and cancellation semantics."

requirements-completed: []

duration: 31 min
completed: 2026-05-14
---

# Phase 10 Plan 04: GameView and Stockfish Hook Refactor Summary

**GameView board/explore state and Stockfish worker protocol split into focused client hooks with the useStockfish API preserved**

## Performance

- **Duration:** 31 min
- **Started:** 2026-05-14T21:23:00Z
- **Completed:** 2026-05-14T21:54:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Extracted `useGameNavigation` for current-move state, clamped navigation handlers, and keyboard-safe callbacks.
- Extracted `useExploreMode` for explore state, speculative analysis race guarding, move replay, and board-drop handling.
- Split `useStockfish.ts` into `useStockfishWorker` for UCI worker communication and `useGameAnalysis` for full-game/explore analysis orchestration.
- Reduced `useStockfish.ts` from 622 lines to 26 lines and `GameView.tsx` from 871 lines to 816 lines.

## Task Commits

1. **Task 1-3: Hook extraction and Stockfish split** - `9ca213c` (refactor)

**Plan metadata:** this summary commit.

## Files Created/Modified

- `src/hooks/useGameNavigation.ts` - Current move state and clamped navigation callbacks.
- `src/hooks/useGameNavigation.test.ts` - RED/GREEN regression coverage for navigation bounds.
- `src/hooks/useExploreMode.ts` - Explore mode state, board-drop handling, replay, and analysis request guard.
- `src/hooks/useStockfishWorker.ts` - Raw Stockfish worker lifecycle, UCI init, position analysis, and MultiPV parsing.
- `src/hooks/useGameAnalysis.ts` - Full-game analysis queue, classification, accuracy, key moments, and explore analysis composition.
- `src/hooks/useStockfish.ts` - Thin composition wrapper preserving the existing public API and type exports.
- `src/app/(app)/games/[id]/GameView.tsx` - Delegates navigation and explore state to hooks while preserving rendering structure.

## Decisions Made

- Preserved the existing `analyzeGame(startFen, positions, playerColor, onProgress)` signature because it is the actual current public API used by `GameView`.
- Kept explore rendering in `GameView` and moved only state/handlers into hooks, avoiding a larger component split outside this plan.
- Kept queen-only promotion unchanged and documented it in `useExploreMode` for Plan 05 to address with visible UI.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial hook test needed jsdom because `renderHook` requires `document`.
- TypeScript caught `exploreMode` being read before the extracted hook declaration; moving `getMainlineFen` and `useExploreMode` above `bestMoveArrow` resolved it.

## Verification

- `npx.cmd vitest run src/hooks/useGameNavigation.test.ts` - passed.
- `npx.cmd tsc --noEmit` - passed.
- `npx.cmd vitest run` - 35 test files passed, 544 tests passed.
- Acceptance grep checks passed for `useGameNavigation`, `useExploreMode`, `useStockfishWorker`, `useGameAnalysis`, and thin `useStockfish.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 05 can build on the extracted `useExploreMode` state and existing `exploreMode` boolean to add the queen-promotion hint without reworking board logic.

---
*Phase: 10-v2-polish-hardening*
*Completed: 2026-05-14*
