---
phase: 14-board-interaction-sounds
plan: "02"
subsystem: chess-sounds
tags: [web-audio-api, chess-sounds, useChessSound, navigation, explore-mode]
dependency_graph:
  requires: [14-01-PLAN.md]
  provides: [useChessSound, sound-integration]
  affects: [GameView, useGameNavigation, useExploreMode]
tech_stack:
  added: []
  patterns: [web-audio-api, custom-hook, useCallback-debounce, oscillator-synthesis]
key_files:
  created:
    - src/hooks/useChessSound.ts
  modified:
    - src/hooks/useGameNavigation.ts
    - src/hooks/useExploreMode.ts
    - src/app/(app)/games/[id]/GameView.tsx
decisions:
  - "chess-sounds npm package does not exist — implemented sounds via native Web Audio API (OscillatorNode synthesis) without any external dependency"
  - "Debounce 30ms in useChessSound cancels pending sound on rapid navigation (T-14-03)"
  - "Priority order: gameOver > check > castle > capture > move (D-13)"
  - "onSoundTrigger callback in useGameNavigation receives new move index; GameView decodes SAN to determine sound type"
  - "onExploreMove callback in useExploreMode receives raw move flags from chess.js for accurate capture/castle detection"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-16"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 14 Plan 02: Chess Sounds Summary

## One-liner

Chess.com-style move sounds via synthesised Web Audio API tones: move, capture, check, castle, game-end — integrated into mainline navigation and explore mode.

## What Was Built

### Task 1: useChessSound hook (`src/hooks/useChessSound.ts`)

New hook implementing D-12..D-13 sound requirements:

- **5 sound types** synthesised via Web Audio API OscillatorNode (no external dependency):
  - `soundMove` — two-note ascending click (880 Hz → 660 Hz)
  - `soundCapture` — three-note descending thud (440 → 330 → 220 Hz)
  - `soundCheck` — three-note warning sequence (1046 → 1318 → 1046 Hz)
  - `soundCastle` — two quick clicks (700 → 750 Hz, offset 100ms)
  - `soundGameEnd` — descending cadence (523 → 440 → 349 Hz)
- **Priority order** (D-13): `isGameOver > isCheck > isCastle > isCapture > move`
- **Debounce** (T-14-03): `useRef<ReturnType<typeof setTimeout>>` — cancels pending sound on every new call (30ms delay), preventing accumulation during rapid navigation
- AudioContext auto-closes after tones finish to release OS audio resources
- Returns `{ playMoveSound }` accepting `{ san?, isCapture?, isCheck?, isCastle?, isGameOver? }`

### Task 2: Integration (`useGameNavigation` + `useExploreMode` + `GameView`)

**`useGameNavigation.ts`:**
- Added `onSoundTrigger?: (newMoveIndex: number) => void` to options type
- All navigation functions (`goFirst`, `goPrev`, `goNext`, `goLast`, `goToMove`) compute the final index explicitly and call `onSoundTrigger?.(next)` — avoids async setState race

**`useExploreMode.ts`:**
- Added `onExploreMove?: (san, isCapture, isCheck, isCastle, isGameOver) => void` to options type
- `handleBoardDrop`: after successful `chess.move()`, reads `move.flags` (`c`/`e` = capture, `k`/`q` = castle), reads `chessCopy.isCheck()` and `chessCopy.isGameOver()`, then calls `onExploreMove?.(...)` — uses raw chess.js data for accurate detection

**`GameView.tsx`:**
- `useChessSound()` called before `useGameNavigation`
- `handleSoundTrigger(moveIndex)`: reads `parsed.positions[moveIndex].san`, decodes SAN patterns (`O-O` = castle, `x` = capture, `+`/`#` = check); game-end detection = last position + `game.result !== undefined`
- `handleExploreMove` wraps `playMoveSound` and receives decoded params from `useExploreMode`
- `useGameNavigation` receives `onSoundTrigger: handleSoundTrigger`
- `useExploreMode` receives `onExploreMove: handleExploreMove`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / Rule 3 - Blocking] chess-sounds npm package does not exist**
- **Found during:** Task 1 — `npm install chess-sounds` returned 404 Not Found
- **Issue:** The plan specified `chess-sounds` as the sound library, but no such package exists in the npm registry (also checked `chess-sound`, `chessground-sounds` — all 404)
- **Fix:** Implemented all 5 sound types natively via Web Audio API `OscillatorNode` + `GainNode`. No external dependency needed — approach matches how Chess.com and Lichess actually implement chess sounds internally
- **Files modified:** `src/hooks/useChessSound.ts` (created from scratch with native implementation)
- **Commits:** 381f40f

## Known Stubs

None — all sound types are fully implemented and wired to real move data.

## Threat Flags

None — no new network endpoints. Web Audio API is purely local browser API; AudioContext closes after each sound sequence.

## Self-Check

- [x] `src/hooks/useChessSound.ts` exists and exports `useChessSound`
- [x] `src/hooks/useGameNavigation.ts` has `onSoundTrigger?` in options type
- [x] `src/hooks/useExploreMode.ts` has `onExploreMove?` in options type
- [x] `GameView.tsx` imports `useChessSound`, calls `playMoveSound` in both callbacks
- [x] TypeScript compiles without errors (`tsc --noEmit` produces no output)
- [x] Commit 381f40f — Task 1: useChessSound hook
- [x] Commit d4f8088 — Task 2: sound integration into navigation and explore
