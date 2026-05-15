---
phase: 12-react-query-client-caching
plan: "02"
subsystem: client-caching
tags: [react-query, useQuery, cache-invalidation, dashboard, games-list]
dependency_graph:
  requires: [12-01-PLAN.md]
  provides: [GamesList-useQuery, DashboardClient-invalidation]
  affects:
    - src/components/GamesList/GamesList.tsx
    - src/app/(app)/dashboard/DashboardClient.tsx
tech_stack:
  added: []
  patterns: [useQuery, useQueryClient, invalidateQueries, staleTime]
key_files:
  created: []
  modified:
    - src/components/GamesList/GamesList.tsx
    - src/app/(app)/dashboard/DashboardClient.tsx
decisions:
  - "queryKey використовує подвійну структуру: ['games', userId, { filters }] для fetching, ['games', userId] для invalidation (prefix match)"
  - "useSession у DashboardClient — userId контролюється next-auth, не передається з RSC щоб мінімізувати зміни в page.tsx"
  - "SyncStatusBar залишається незмінним — invalidation делегується через onSynced callback до DashboardClient"
  - "unused useCallback видалено з GamesList після міграції на useQuery"
metrics:
  duration: "~4 хвилини"
  completed: "2026-05-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 2
---

# Phase 12 Plan 02: GamesList React Query Migration Summary

**One-liner:** Мігровано dashboard games list з useEffect+fetch на useQuery з staleTime 5 хвилин та cache invalidation після sync замість refreshKey.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Мігрувати GamesList на useQuery | 6c51030 | src/components/GamesList/GamesList.tsx |
| 2 | Оновити DashboardClient та SyncStatusBar | deb9b2a | src/app/(app)/dashboard/DashboardClient.tsx |
| - | cleanup: unused import | 8fdce22 | src/components/GamesList/GamesList.tsx |

---

## Verification

- `GamesList.tsx` не містить `refreshKey` — перевірено автоматично
- `GamesList.tsx` містить `useQuery` з `@tanstack/react-query` — перевірено
- `staleTime: 5 * 60 * 1000` присутній — перевірено
- `queryKey: ["games", userId, { page, platform, timeControlCategory, result }]` — правильна структура
- `DashboardClient.tsx` не містить `refreshKey` — перевірено автоматично
- `DashboardClient.tsx` містить `useQueryClient()` та `invalidateQueries` — перевірено
- `npx tsc --noEmit` — пройшов без помилок

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Cleanup] Видалено невикористаний import useCallback з GamesList**
- **Found during:** Task 1 post-commit verification
- **Issue:** GamesList більше не використовує useCallback після заміни useEffect на useQuery, але import залишився
- **Fix:** Видалено `useCallback` з деструктуризації react import
- **Files modified:** src/components/GamesList/GamesList.tsx
- **Commit:** 8fdce22

**2. [Rule 3 - Merge] Worktree не мав коміти плану 01**
- **Found during:** Ініціалізація
- **Issue:** Worktree гілка відставала від main — коміти плану 01 (install, QueryProvider, layout) були в main але не в worktree
- **Fix:** `git merge main --no-edit` — fast-forward merge, конфліктів не було
- **Impact:** Нульовий — всі зміни плану 01 успішно підтягнуто

---

## Threat Mitigation Status

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-12-02-01 | accept | userId в queryKey — лише браузерний кеш, не передається на сервер |
| T-12-02-02 | accept | invalidateQueries лише примушує рефетч; API сам верифікує auth |
| T-12-02-03 | mitigate | userId з useSession — next-auth контролює; /api/games незалежно верифікує сесію |

---

## Known Stubs

None.

---

## Threat Flags

None — нових мережевих endpoints або auth paths не додано.

---

## Self-Check: PASSED

- [x] `src/components/GamesList/GamesList.tsx` — FOUND, містить useQuery, staleTime, userId prop
- [x] `src/app/(app)/dashboard/DashboardClient.tsx` — FOUND, містить useQueryClient, invalidateQueries, useSession
- [x] Коміт 6c51030 (GamesList migration) — FOUND
- [x] Коміт deb9b2a (DashboardClient update) — FOUND
- [x] Коміт 8fdce22 (cleanup unused import) — FOUND
- [x] `npx tsc --noEmit` — PASSED (no output = no errors)
