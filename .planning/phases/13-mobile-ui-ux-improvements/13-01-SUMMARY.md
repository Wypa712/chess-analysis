---
phase: 13-mobile-ui-ux-improvements
plan: "01"
subsystem: mobile-ux / dashboard
tags: [pull-to-refresh, gesture-hook, forwardRef, mobile]
dependency_graph:
  requires: []
  provides: [usePullToRefresh, SyncStatusBarHandle]
  affects: [DashboardClient, SyncStatusBar]
tech_stack:
  added: []
  patterns: [forwardRef+useImperativeHandle, custom gesture hook via addEventListener]
key_files:
  created:
    - src/hooks/usePullToRefresh.ts
  modified:
    - src/components/SyncStatusBar/SyncStatusBar.tsx
    - src/app/(app)/dashboard/DashboardClient.tsx
decisions:
  - "passive: false на touchmove дозволяє preventDefault і запобігає системному scroll під час drag"
  - "syncingRef.current guard в SyncStatusBar запобігає дублюванню запитів навіть при повторному виклику runSync"
  - "forwardRef обраний замість triggerRef prop — чистіший API, ref видимий лише всередині DashboardClient"
metrics:
  duration: "~20 min"
  completed: "2026-05-16"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 13 Plan 01: Pull-to-Refresh on Dashboard — Summary

**One-liner:** Кастомний gesture hook `usePullToRefresh` + `forwardRef` на `SyncStatusBar` дозволяють потягнути /dashboard вниз і запустити повний sync з SVG-спінером.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Створити usePullToRefresh hook | c89ba89 | src/hooks/usePullToRefresh.ts (new) |
| 2 | Expose runSync + інтеграція в DashboardClient | dc6d786 | SyncStatusBar.tsx, DashboardClient.tsx |

---

## What Was Built

### usePullToRefresh (src/hooks/usePullToRefresh.ts)

Новий gesture hook для pull-to-refresh жесту:

- **touchstart**: якщо `window.scrollY === 0` — записує `startY`, входить в DRAGGING
- **touchmove**: обчислює `delta = currentY - startY`; якщо `delta < 0` — виходить з DRAGGING; клампує до 80px; `isReady = delta >= 60`; `preventDefault()` (passive: false)
- **touchend**: якщо `isReady` — викликає `onTrigger()`, знімає drag після 300ms; інакше — reset відразу
- **indicatorStyle**: absolute position, opacity 0→1 за 0..60px, translateY слідує за пальцем
- Повертає: `{ containerRef, indicatorStyle, isReady }`

### SyncStatusBar (з forwardRef)

- Додано `export type SyncStatusBarHandle = { runSync: () => void }`
- Компонент обгорнутий у `forwardRef<SyncStatusBarHandle, SyncStatusBarProps>`
- `useImperativeHandle(ref, () => ({ runSync }), [runSync])` — expose runSync назовні
- `syncingRef.current` guard залишається — запобігає дублюванню навіть при pull-to-refresh

### DashboardClient (інтеграція)

- `syncBarRef = useRef<SyncStatusBarHandle>(null)` — ref на SyncStatusBar
- `triggerSync` callback: `syncBarRef.current?.runSync()`
- `usePullToRefresh(triggerSync)` — повертає `containerRef`, `indicatorStyle`, `isReady`
- Весь контент обгорнутий у `<div ref={containerRef} style={{ position: "relative" }}>`
- SVG-спінер (36×36px, `var(--color-teal-soft)` arc) з `ptr-spin` анімацією при `isReady`
- `<SyncStatusBar ref={syncBarRef} onSynced={handleSynced} />`

---

## Deviations from Plan

None — план виконано точно як написано.

---

## Threat Model Coverage

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-13-01-1 | DoS via rapid pull triggers | Covered — `syncingRef.current` guard в SyncStatusBar відхиляє повторний виклик |
| T-13-01-2 | Tampering via SyncStatusBar ref | Accepted — ref видимий тільки в DashboardClient |

---

## Verification Results

1. `npx.cmd tsc --noEmit` — 0 TS-помилок
2. `src/hooks/usePullToRefresh.ts` існує, містить "onTrigger" (4 входження)
3. `SyncStatusBar.tsx` містить "forwardRef" і "useImperativeHandle" (3 входження)
4. `DashboardClient.tsx` містить "usePullToRefresh" і "syncBarRef" (5 входжень)

---

## Self-Check: PASSED

- [x] src/hooks/usePullToRefresh.ts — FOUND
- [x] src/components/SyncStatusBar/SyncStatusBar.tsx — MODIFIED, FOUND
- [x] src/app/(app)/dashboard/DashboardClient.tsx — MODIFIED, FOUND
- [x] Commit c89ba89 — FOUND
- [x] Commit dc6d786 — FOUND
- [x] TypeScript clean — 0 errors
