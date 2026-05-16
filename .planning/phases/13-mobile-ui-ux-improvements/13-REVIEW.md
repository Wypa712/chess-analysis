---
phase: 13-mobile-ui-ux-improvements
reviewed: 2026-05-16T15:20:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/hooks/usePullToRefresh.ts
  - src/components/SyncStatusBar/SyncStatusBar.tsx
  - src/app/(app)/dashboard/DashboardClient.tsx
  - src/app/(app)/games/[id]/GameView.tsx
  - src/app/(app)/games/[id]/GameView.module.css
  - src/app/(app)/games/[id]/LlmTabsPanel.tsx
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: fixed
fixes_applied:
  - CR-01
  - WR-01
fixes_skipped:
  - IN-01
  - IN-02
fixed_at: 2026-05-16T18:35:00+02:00
---

# Phase 13: Code Review Report

**Reviewed:** 2026-05-16T15:20:00Z  
**Fixed:** 2026-05-16T18:35:00+02:00
**Depth:** standard  
**Files Reviewed:** 6  
**Status:** fixed

## Summary

The Critical and Warning findings from the Phase 13 review are fixed:

- CR-01: pull-to-refresh now checks the AppShell scroll root instead of the dashboard wrapper.
- WR-01: GameView now switches away from the hidden `"moves"` tab when the layout becomes mobile.

Info findings remain as non-blocking cleanup recommendations because `$gsd-code-review 13 --fix` fixes Critical + Warning findings by default. Use `--all` if Info findings should be included in fix scope.

---

## Fixed Issues

### CR-01: Pull-to-refresh checked the wrong scroll container

**Files modified:**

- `src/components/AppShell.tsx`
- `src/components/AppShell.test.tsx`
- `src/hooks/usePullToRefresh.ts`

**Applied fix:** `AppShell` marks the real scroll viewport with `data-scroll-root`, and `usePullToRefresh` resolves the closest `[data-scroll-root]` before allowing a pull gesture. If that scroll root is not at the top, the gesture does not enter pull-to-refresh mode.

### WR-01: Hidden mobile Moves tab could remain active after resize

**Files modified:**

- `src/app/(app)/games/[id]/GameView.tsx`
- `src/app/(app)/games/[id]/components.test.tsx`

**Applied fix:** `GameView` now coerces `activeTab` from `"moves"` to `"analysis"` whenever `isMobile` becomes true.

---

## Remaining Info

### IN-01: Inline pull-to-refresh keyframes should move out of DashboardClient

**File:** `src/app/(app)/dashboard/DashboardClient.tsx:73`

The inline `<style>` tag works, but it is re-rendered with the component and mixes animation CSS into the client component body. Prefer moving `@keyframes ptr-spin` into `page.module.css` and applying an animation class to the SVG circle.

### IN-02: Desktop board chrome budget is still approximate

**File:** `src/app/(app)/games/[id]/GameView.tsx:43-47,346`

`DESKTOP_VERTICAL_CHROME = 240` is documented and covered by a layout expectation test. It remains a fixed budget that can drift when player badges, nav controls, or analysis controls change height. A dynamic measurement would be more resilient.

---

## Verification

- `npm.cmd run test:run -- src/components/AppShell.test.tsx "src/app/(app)/games/[id]/components.test.tsx"` — 20 passed
- `npm.cmd run test:run` — 155 passed
- `npx.cmd tsc --noEmit` — passed

_Reviewer: Codex inline code-reviewer_  
_Fixer: Codex inline code-fixer_
_Depth: standard_
