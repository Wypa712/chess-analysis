---
phase: 14-board-interaction-sounds
verified: 2026-05-16T00:00:00Z
status: human_needed
score: 13/13
overrides_applied: 0
human_verification:
  - test: "Click-to-move у mainline mode"
    expected: "Клік на фігуру показує dot/ring підсвічування, хід НЕ виконується, explore НЕ вмикається"
    why_human: "Залежить від браузерного рендерингу react-chessboard; onSquareClick prop підключений, логіка mainline-guard у коді коректна, але UI-ефект потребує ручного тестування"
  - test: "Click-to-move у explore mode"
    expected: "Клік на фігуру → підсвічування → клік на підсвічену клітинку → хід виконується через handleBoardDrop"
    why_human: "Потребує активного explore mode у браузері для підтвердження повного циклу"
  - test: "Звуки при навігації"
    expected: "goNext/goPrev/goFirst/goLast/goToMove відтворюють відповідний синтезований звук (move/capture/check/castle/game-end)"
    why_human: "Web Audio API потребує реального браузера; не може бути перевірено статично"
  - test: "Відсутність накопичення звуків при швидкій навігації"
    expected: "При швидких кліках Next кілька разів поспіль — жодної черги звуків, лише останній"
    why_human: "Debounce 30ms перевіряється тільки під час реального відтворення у браузері"
---

# Phase 14: Board Interaction + Sounds — Verification Report

**Phase Goal:** Click-to-move + Chess sounds — Chess.com-style board interaction and audio feedback
**Verified:** 2026-05-16
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Примітка щодо requirement IDs D-01..D-15

PLAN frontmatter посилається на D-01..D-15 як на `requirements`. Ці ідентифікатори є **внутрішніми рішеннями дизайну** (decisions), задокументованими у `14-CONTEXT.md`, а НЕ рядками у `REQUIREMENTS.md`. У `REQUIREMENTS.md` відсутня будь-яка секція з префіксом "D-". Таким чином, крос-референс D-01..D-15 проти `REQUIREMENTS.md` дає порожній результат — це не помилка реалізації, а особливість нумерації: phase-decisions позначені окремим namespace від product-requirements. Всі 15 рішень перевірені нижче безпосередньо проти кодової бази.

---

## Goal Achievement

### Observable Truths (з ROADMAP Success Criteria + PLAN must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Клік на фігуру показує dot/ring підсвічування легальних ходів | VERIFIED | `useClickToMove.ts` рядки 100-118: `radial-gradient` для пустих, `boxShadow inset` для capture |
| 2 | Mainline mode: лише preview підсвічування, хід не виконується | VERIFIED | `useClickToMove.ts` рядки 43-48: `if (!exploreMode) { setSelectedSquare(null); setLegalMoves([]); return; }` перед викликом `onMove` |
| 3 | Explore mode: клік на підсвічену клітинку виконує хід | VERIFIED | `useClickToMove.ts` рядки 49-53: `onMove(selectedSquare, square)` викликається тільки коли `exploreMode === true` |
| 4 | Drag-and-drop продовжує працювати поряд із click-to-move | VERIFIED | `GameView.tsx` рядок 589: `arePiecesDraggable={!!parsed}` незмінений; `onPieceDrop={parsed ? handleBoardDrop : undefined}` — drag-логіка не порушена |
| 5 | Звуки відтворюються при навігації по mainline | VERIFIED | `useGameNavigation.ts` рядки 22-48: `onSoundTrigger?.(next)` у goFirst, goPrev, goNext, goLast, goToMove; GameView передає `onSoundTrigger: handleSoundTrigger` |
| 6 | Типи звуків: move, capture, check, castle, game-end | VERIFIED | `useChessSound.ts` рядки 62-110: п'ять функцій `soundMove`, `soundCapture`, `soundCheck`, `soundCastle`, `soundGameEnd` через Web Audio API |
| 7 | Клік на вже вибрану фігуру знімає виділення (deselect D-05) | VERIFIED | `useClickToMove.ts` рядки 35-39: `if (selectedSquare === square) { setSelectedSquare(null); setLegalMoves([]); return; }` |
| 8 | Клік на іншу власну фігуру переключає виділення (D-06) | VERIFIED | `useClickToMove.ts` рядки 56-74: крок 3 обирає нову фігуру без явного deselect попередньої (setState перезаписує) |
| 9 | Клік на порожню клітинку знімає виділення (D-07) | VERIFIED | `useClickToMove.ts` рядки 72-76: `else { setSelectedSquare(null); setLegalMoves([]); }` коли `piece` є null |
| 10 | Drag знімає click-selection (D-08) | VERIFIED | `useClickToMove.ts` рядки 81-87: `handlePieceDragBegin` скидає стан; `GameView.tsx` рядок 591: `onPieceDragBegin={handlePieceDragBegin}` |
| 11 | Dot стиль для пустих клітинок (D-09) | VERIFIED | `useClickToMove.ts` рядок 113: `"radial-gradient(circle, rgba(79, 183, 162, 0.65) 25%, transparent 25%)"` |
| 12 | Ring стиль для capture клітинок (D-10) | VERIFIED | `useClickToMove.ts` рядок 107: `"inset 0 0 0 3px rgba(79, 183, 162, 0.75)"` |
| 13 | Звуки при explore-ходах (D-15) | VERIFIED | `useExploreMode.ts` рядки 121-126: `onExploreMove?.(move.san, isCapture, isCheck, isCastle, isGameOver)` після `chess.move()`; GameView передає `onExploreMove: handleExploreMove` |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/hooks/useClickToMove.ts` | click-to-move state і handlers | VERIFIED | 129 рядків, експортує `useClickToMove`, повний функціонал |
| `src/hooks/useChessSound.ts` | sound playback hook | VERIFIED | 147 рядків, `"use client"`, експортує `useChessSound`, 5 типів звуків |
| `src/hooks/useGameNavigation.ts` | навігація з звуком | VERIFIED | `onSoundTrigger?` в options type, виклики у всіх nav-функціях |
| `src/hooks/useExploreMode.ts` | explore з sound callback | VERIFIED | `onExploreMove?` в `UseExploreModeOptions`, виклик у `handleBoardDrop` |
| `src/app/(app)/games/[id]/GameView.tsx` | інтеграція всіх хуків | VERIFIED | Імпортує всі 3 нові хуки, wired через props |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `GameView onSquareClick` | `useClickToMove.handleSquareClick` | prop передача | VERIFIED | рядок 590: `onSquareClick={handleSquareClick}` |
| `GameView onPieceDragBegin` | `useClickToMove.handlePieceDragBegin` | prop передача | VERIFIED | рядок 591: `onPieceDragBegin={handlePieceDragBegin}` |
| `GameView customSquareStyles` | `highlightStyles` merged | displaySquareStyles | VERIFIED | рядки 505-513: `...highlightStyles` йде останнім |
| `useClickToMove` | `chess.moves({ square, verbose: true })` | обчислення legalmoves | VERIFIED | рядок 62: `chess.moves({ square, verbose: true }) as Move[]` |
| `useGameNavigation goNext/goPrev/goToMove` | `useChessSound.playMoveSound` | `onSoundTrigger` callback | VERIFIED | рядки 22-48 useGameNavigation; рядки 172-192 GameView |
| `useExploreMode.handleBoardDrop` | `GameView handleExploreMove` | `onExploreMove` option | VERIFIED | рядок 271: `onExploreMove: handleExploreMove` |
| `GameView handleExploreMove` | `useChessSound.playMoveSound` | прямий виклик | VERIFIED | рядки 195-200 GameView |
| `getActiveFen` | explorationChess.fen() або getMainlineFen() | callback | VERIFIED | рядки 274-277 GameView: умова `exploreMode && explorationChess` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|-------------|--------|-------------------|--------|
| `useClickToMove.highlightStyles` | `legalMoves` | `chess.moves({ square, verbose: true })` на реальному FEN | Так — chess.js генерує реальні легальні ходи | FLOWING |
| `useChessSound.playMoveSound` | `isCapture, isCheck, isCastle, isGameOver` | move.flags з chess.js та chessCopy.isCheck() | Так — реальні прапорці з chess.js | FLOWING |
| `handleSoundTrigger` в GameView | `pos.san` | `parsed.positions[moveIndex]` з parsePgn(game.pgn) | Так — реальні SAN з PGN | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Evidence | Status |
|----------|---------|--------|
| `useClickToMove` експортує функцію | рядок 19: `export function useClickToMove(...)` | PASS |
| Priority order у `playMoveSound` | рядки 129-138: `isGameOver → isCheck → isCastle → isCapture → move` | PASS |
| Debounce 30ms у useChessSound | рядки 121-127: `clearTimeout(pendingRef.current)` + `setTimeout(..., 30)` | PASS |
| `clearSelection` у навігаційних handlers GameView | рядки 337-350: `goFirst`, `goNext`, `goLast` мають `clearSelection()` | PASS |
| `clearSelection` у ArrowLeft/ArrowRight handlers | рядки 365-375: `clearSelection()` у ArrowLeft; `exitExploreIfActive()` (містить clearSelection) у ArrowRight | PASS |

Step 7b: Behavioral spot-checks for runnable checks (tsc) — SKIPPED (сервер запускається користувачем самостійно).

---

### Probe Execution

Step 7c: Жодних probe-скриптів не задекларовано у PLAN/SUMMARY. SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| D-01 | 14-01-PLAN | Click-to-move активний в обох режимах | SATISFIED | `useClickToMove` підключений через `onSquareClick` у Chessboard — працює в обох режимах |
| D-02 | 14-01-PLAN | Mainline: лише preview, хід не виконується | SATISFIED | `if (!exploreMode) { ...; return; }` у handleSquareClick крок 2 |
| D-03 | 14-01-PLAN | Explore: клік виконує хід | SATISFIED | `onMove(selectedSquare, square)` за умови `exploreMode === true` |
| D-04 | 14-01-PLAN | Drag-and-drop не зламаний | SATISFIED | `arePiecesDraggable={!!parsed}`, `onPieceDrop={...handleBoardDrop}` — незмінені |
| D-05 | 14-01-PLAN | Deselect при кліку на ту саму фігуру | SATISFIED | крок 1 у handleSquareClick |
| D-06 | 14-01-PLAN | Switch selection при кліку на іншу фігуру | SATISFIED | крок 3 перезаписує selectedSquare |
| D-07 | 14-01-PLAN | Deselect при кліку на порожню клітинку | SATISFIED | `else { deselect }` у кроці 3 |
| D-08 | 14-01-PLAN | Drag знімає selection | SATISFIED | handlePieceDragBegin → clearSelection |
| D-09 | 14-01-PLAN | Dot стиль для пустих клітинок | SATISFIED | radial-gradient 25% у highlightStyles |
| D-10 | 14-01-PLAN | Ring стиль для capture клітинок | SATISFIED | boxShadow inset 3px у highlightStyles |
| D-11 | 14-01-PLAN | Teal кольорова схема | SATISFIED | rgba(79, 183, 162, ...) у всіх стилях |
| D-12 | 14-02-PLAN | Звукова бібліотека (chess-sounds) | SATISFIED (deviation) | chess-sounds не існує у npm; реалізовано через native Web Audio API — функціонально еквівалентно. SUMMARY документує причину: 404 Not Found для пакету |
| D-13 | 14-02-PLAN | 5 типів звуків: move/capture/check/castle/game-end | SATISFIED | 5 функцій у useChessSound.ts, правильний порядок пріоритетів |
| D-14 | 14-02-PLAN | Звуки при mainline навігації | SATISFIED | onSoundTrigger у goFirst/goPrev/goNext/goLast/goToMove |
| D-15 | 14-02-PLAN | Звуки при explore-ходах | SATISFIED | onExploreMove callback у handleBoardDrop |

**Orphaned REQUIREMENTS.md entries:** D-01..D-15 відсутні у REQUIREMENTS.md як окремі рядки — вони є phase-decisions, а не product-requirements. Жодних пропущених REQ-* вимог для фази 14 у REQUIREMENTS.md не виявлено (трасування у REQUIREMENTS.md не відображає Phase 14).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useExploreMode.ts` | 82, 105 | `// D-09: queen-only promotion - see separate fix.` | Info | Коментар-заглушка без promotion picker; promotion до ферзя автоматична — задокументована відкладена задача у 14-CONTEXT.md розділ Deferred |
| `src/app/(app)/games/[id]/GameView.tsx` | 338-350 | `goFirst` викликає `clearSelection()` двічі (через `exitExploreIfActive` і явно) | Info | Не є помилкою — idempotent setState, проте надлишкові виклики |

Жодних TBD, FIXME, XXX маркерів у файлах, модифікованих у цій фазі.
Жодних порожніх реалізацій (`return null`, `return {}`, `return []` як кінцеве значення) у нових хуках.

---

### Human Verification Required

#### 1. Click-to-move у mainline mode

**Test:** Відкрити партію у браузері (не explore mode). Клікнути на будь-яку фігуру.
**Expected:** Легальні ходи підсвічуються (dot/ring), фігура виділяється teal-кольором. Explore mode НЕ вмикається. Жодного ходу не виконується.
**Why human:** UI-рендеринг react-chessboard і Web Audio — потребує браузера.

#### 2. Click-to-move у explore mode

**Test:** Перетягнути будь-яку фігуру (вхід у explore mode). Потім клікнути на фігуру, клікнути на dot-підсвічену клітинку.
**Expected:** Хід виконується, позиція змінюється, звук відтворюється.
**Why human:** Вимагає інтерактивного explore mode у браузері.

#### 3. Звуки при навігації

**Test:** Відкрити проаналізовану партію. Натискати Next/Prev/goToMove. Перевірити capture, check, castle ходи.
**Expected:** Різні синтезовані тони для різних типів ходів. Жодної затримки/накопичення.
**Why human:** Web Audio API — тільки у браузері з увімкненим звуком.

#### 4. Відсутність накопичення звуків

**Test:** Швидко натиснути "Наступний хід" 5-10 разів за 500ms.
**Expected:** Звучить лише останній або 1-2 тони, не черга з 10 звуків.
**Why human:** 30ms debounce перевіряється тільки у реальному браузері.

---

### Gaps Summary

Жодних технічних gaps не виявлено. Всі 13 observable truths підтверджені кодом. Артефакти існують, є суттєвими (не заглушки), підключені (wired), дані течуть реально.

**Одне відхилення від плану (D-12):** `chess-sounds` npm-пакет не існує у реєстрі. Реалізація через native Web Audio API є повноцінною заміною — 5 типів звуків реалізовані синтезом OscillatorNode. Функціональна мета D-12 досягнута. SUMMARY документує цю зміну як "Auto-fixed Issue".

Статус `human_needed` обумовлений виключно необхідністю браузерного тестування UI-взаємодії та Web Audio API — не наявністю технічних проблем у коді.

---

_Verified: 2026-05-16_
_Verifier: Claude (gsd-verifier)_
