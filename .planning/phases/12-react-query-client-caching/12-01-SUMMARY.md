---
phase: 12-react-query-client-caching
plan: "01"
subsystem: client-caching
tags: [react-query, provider, infrastructure, caching]
dependency_graph:
  requires: []
  provides: [QueryClientProvider, react-query-infrastructure]
  affects: [src/app/(app)/layout.tsx, src/components/QueryProvider/QueryProvider.tsx]
tech_stack:
  added: ["@tanstack/react-query@^5.100.10"]
  patterns: [QueryClientProvider, useState-QueryClient-isolation]
key_files:
  created:
    - src/components/QueryProvider/QueryProvider.tsx
  modified:
    - package.json
    - package-lock.json
    - src/app/(app)/layout.tsx
decisions:
  - "QueryClient ізольований через useState у компоненті (не модуль-рівнева змінна) — захист від SSR sharing між запитами"
  - "defaultOptions.queries.staleTime: 0 як безпечний дефолт — кожен useQuery встановлює власний staleTime"
  - "QueryProvider > AppShell > children — вкладеність забезпечує доступ до QueryClient у всіх client components"
metrics:
  duration: "~5 хвилин"
  completed: "2026-05-15"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 3
---

# Phase 12 Plan 01: React Query Infrastructure Summary

**One-liner:** Встановлено @tanstack/react-query v5 та створено ізольований QueryProvider як 'use client' компонент для захищеного (app) layout — фундамент для всіх міграцій фази.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Встановити @tanstack/react-query | 261ec54 | package.json, package-lock.json |
| 2 | Створити QueryProvider клієнтський компонент | a70abb8 | src/components/QueryProvider/QueryProvider.tsx |
| 3 | Інтегрувати QueryProvider у (app) layout | c79aba0 | src/app/(app)/layout.tsx |

---

## Verification

- `@tanstack/react-query: ^5.100.10` присутній у `package.json["dependencies"]`
- `src/components/QueryProvider/QueryProvider.tsx` починається з `"use client"`
- `src/app/(app)/layout.tsx` НЕ має `"use client"` (залишається Server Component)
- `npx tsc --noEmit` проходить без помилок
- QueryProvider > AppShell > children вкладеність підтверджена в layout.tsx

---

## Deviations from Plan

None — план виконано точно як написано.

---

## Threat Mitigation Status

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-12-01-01 | accept | Cache лише в браузері поточного користувача; серверна auth збережена |
| T-12-01-02 | mitigate | QueryClient створюється через `useState(() => new QueryClient())` в компоненті — запобігає SSR sharing |

---

## Known Stubs

None.

---

## Threat Flags

None — нових мережевих endpoints або auth paths не додано.

---

## Self-Check: PASSED

- [x] `src/components/QueryProvider/QueryProvider.tsx` — FOUND
- [x] `src/app/(app)/layout.tsx` оновлено з QueryProvider — FOUND
- [x] Коміт 261ec54 (install) — FOUND
- [x] Коміт a70abb8 (QueryProvider) — FOUND
- [x] Коміт c79aba0 (layout integration) — FOUND
