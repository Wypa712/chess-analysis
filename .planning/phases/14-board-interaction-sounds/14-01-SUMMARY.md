---
phase: 14-board-interaction-sounds
plan: "01"
subsystem: board-interaction
tags: [click-to-move, chess-ui, explore-mode, react-hooks]
dependency_graph:
  requires: []
  provides: [useClickToMove, click-to-move-integration]
  affects: [GameView, useExploreMode]
tech_stack:
  added: []
  patterns: [custom-hook, useMemo-styles, useCallback-handlers]
key_files:
  created:
    - src/hooks/useClickToMove.ts
  modified:
    - src/app/(app)/games/[id]/GameView.tsx
decisions:
  - "Mainline mode shows legal move highlights but does not execute moves (D-02) — enforced inside useClickToMove with exploreMode guard"
  - "highlightStyles merged after lastMoveSquares so selected square teal overrides last-move blue"
  - "clearSelection included in exitExploreIfActive (via useCallback dependency) to cover all navigation paths"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-16"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 14 Plan 01: Click-to-Move Summary

## One-liner

Chess.com-style click-to-move with dot/ring highlights via `useClickToMove` hook integrated into GameView.

## What Was Built

### Task 1: useClickToMove hook (`src/hooks/useClickToMove.ts`)

New hook implementing all D-05..D-11 interaction decisions:

- **State**: `selectedSquare: Square | null`, `legalMoves: Move[]`
- **handleSquareClick**: Three-step logic — deselect same square (D-05), execute/preview legal target (D-02/D-03), select new piece (D-06)
- **handlePieceDragBegin**: Clears selection when drag starts (D-08)
- **clearSelection**: Resets both state values
- **highlightStyles** (useMemo):
  - Selected square: `background: "rgba(79, 183, 162, 0.45)"` (D-11)
  - Empty target squares: `radial-gradient(circle, rgba(79, 183, 162, 0.65) 25%, transparent 25%)` dot (D-09)
  - Capture target squares: `boxShadow: "inset 0 0 0 3px rgba(79, 183, 162, 0.75)"` ring (D-10)

**Mainline guard (D-02)**: When `exploreMode === false` and a legal target is clicked, the hook clears selection without calling `onMove`. Highlights are still shown on piece selection.

### Task 2: GameView integration (`src/app/(app)/games/[id]/GameView.tsx`)

- Added `import { useClickToMove }` 
- Added `getActiveFen` callback (returns explore FEN or mainline FEN)
- Wired `useClickToMove({ exploreMode, getActiveFen, onMove: handleBoardDrop })`
- `displaySquareStyles` now spreads `highlightStyles` after existing last-move styles
- Chessboard received `onSquareClick={handleSquareClick}` and `onPieceDragBegin={handlePieceDragBegin}`
- `clearSelection()` called in: `goFirst`, `goNext`, `goLast`, `exitExploreIfActive` (covers `seekMainline`, ArrowRight, "Return to mainline" button), ArrowLeft key handler

## Deviations from Plan

None — plan executed exactly as written.

The plan's note about mainline guard (end of Task 2 action section) was implemented inside `useClickToMove` as specified: step 2 in `handleSquareClick` checks `!exploreMode` and returns early without calling `onMove`.

## Threat Flags

None — no new network endpoints or auth paths introduced. All logic is client-side chess.js validation.

## Known Stubs

None — click-to-move is fully wired to real chess.js move generation and real `handleBoardDrop`.

## Self-Check

- [x] `src/hooks/useClickToMove.ts` exists
- [x] `src/app/(app)/games/[id]/GameView.tsx` modified
- [x] TypeScript compiles without errors (`tsc --noEmit` produces no output)
- [x] Commit f3ebe7b — Task 1 hook
- [x] Commit 9bbb682 — Task 2 integration
