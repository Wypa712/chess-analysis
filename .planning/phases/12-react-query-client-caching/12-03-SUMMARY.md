---
phase: 12-react-query-client-caching
plan: "03"
subsystem: client-caching
tags: [react-query, useQuery, game-view, engine-analysis, llm-analysis, caching]
dependency_graph:
  requires: [12-01-PLAN.md]
  provides: [GameView-useQuery-caching]
  affects: [src/app/(app)/games/[id]/GameView.tsx]
tech_stack:
  added: []
  patterns: [useQuery, useQueryClient, setQueryData, staleTime-Infinity]
key_files:
  created: []
  modified:
    - src/app/(app)/games/[id]/GameView.tsx
decisions:
  - "analysis = engineAnalysisData ?? null — const з useQuery data, не окремий useState"
  - "enginePending || llmPending замість initialFetchCount < 2 для guard рендерингу"
  - "queryClient.setQueryData до POST (не після) для engine-analysis — аналіз рендериться миттєво"
  - "Синхронізація analysisState та llmStatus через useEffect на зміни query data"
  - "Залежності queryClient додано до useCallback deps для handleLlmAnalyze та handleStartAnalysis"
metrics:
  duration: "~15 хвилин"
  completed: "2026-05-15"
  tasks_completed: 1
  tasks_total: 1
  files_created: 0
  files_modified: 1
---

# Phase 12 Plan 03: GameView useQuery Migration Summary

**One-liner:** Мігровано два GET useEffect у GameView на useQuery з staleTime Infinity — повторний перехід на сторінку партії більше не робить мережевих запитів до engine-analysis та analyze endpoints.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Замінити GET useEffect на useQuery у GameView | 5077065 | src/app/(app)/games/[id]/GameView.tsx |

---

## Verification

- `useQuery` присутній у GameView.tsx
- `initialFetchCount` видалено повністю
- `queryKey: ['engine-analysis', game.id]` з `staleTime: Infinity, retry: 1`
- `queryKey: ['llm-analysis', game.id]` з `staleTime: Infinity, retry: 0`
- Guard замінено: `if (enginePending || llmPending)`
- `queryClient.setQueryData` після Stockfish POST та LLM POST
- `npx tsc --noEmit` пройшов без помилок

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Запобігання дублікату setQueryData для engine-analysis**
- **Found during:** Task 1
- **Issue:** План вказував `setQueryData` після успішного POST. Але оскільки Stockfish result вже є в пам'яті до POST, встановлення кешу після POST означає затримку рендерингу. Крім того, наявність двох `setQueryData` (до і після POST) було надлишковим.
- **Fix:** `setQueryData(['engine-analysis', game.id], result)` встановлюється одразу після `analyzeGame()` завершується — до POST. Дублікат після POST видалено.
- **Files modified:** src/app/(app)/games/[id]/GameView.tsx
- **Commit:** 5077065

**2. [Rule 2 - Missing functionality] Синхронізація analysisState та llmStatus при отриманні даних з кешу**
- **Found during:** Task 1
- **Issue:** При навігації назад на сторінку партії, useQuery повертає дані з кешу синхронно (isPending=false одразу). Якщо `analysisState` ініціалізується у useState як "idle" (коли engineAnalysisData ще undefined в момент ініціалізації), але кешовані дані вже є — стан не синхронізується.
- **Fix:** Додано два useEffect для синхронізації `analysisState` та `llmStatus` при зміні query data. Також ініціалізація useState використовує поточне значення: `useState(engineAnalysisData ? "done" : "idle")`.
- **Files modified:** src/app/(app)/games/[id]/GameView.tsx
- **Commit:** 5077065

---

## Known Stubs

None.

---

## Threat Mitigation Status

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-12-03-01 | accept | queryKey ['engine-analysis', gameId] — gameId не секрет; API перевіряє авторизацію незалежно |
| T-12-03-02 | accept | setQueryData дані з API response — той самий рівень довіри що і раніше |
| T-12-03-03 | accept | staleTime Infinity — POST + setQueryData контролює оновлення; analysis незмінний після обчислення |

---

## Threat Flags

None — нових мережевих endpoints або auth paths не додано.

---

## Self-Check: PASSED

- [x] `src/app/(app)/games/[id]/GameView.tsx` оновлено — FOUND
- [x] Коміт 5077065 — FOUND
- [x] `useQuery` присутній — VERIFIED
- [x] `initialFetchCount` відсутній — VERIFIED
- [x] `staleTime: Infinity` присутній (двічі) — VERIFIED
- [x] `enginePending || llmPending` guard — VERIFIED
- [x] `queryClient.setQueryData` для обох queries — VERIFIED
- [x] TypeScript без помилок (tsc --noEmit) — VERIFIED
