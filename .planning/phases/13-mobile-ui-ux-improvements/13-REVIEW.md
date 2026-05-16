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
  critical: 1
  warning: 1
  info: 2
  total: 4
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-05-16T15:20:00Z  
**Depth:** standard  
**Files Reviewed:** 6  
**Status:** issues_found

## Summary

Phase 13's previous critical fixes are mostly present: `touchcancel` cleanup exists, the React hook-order issue is covered by a regression test, mobile `analysisPanel` now uses `70dvh`, and `evalToPawns` now returns `number | null` with guarded `EvalBar` usage.

I found one remaining critical mobile interaction bug and one responsive-state warning.

---

## Critical Issues

### CR-01: Pull-to-refresh still checks the wrong scroll container, breaking normal downward scroll inside AppShell

**File:** `src/hooks/usePullToRefresh.ts:36-68`  
**Related container:** `src/components/AppShell.module.css:9-15`

**Issue:** `usePullToRefresh` now guards with `el.scrollTop > 0`, but `el` is the dashboard wrapper from `DashboardClient`, not the actual scroll container. The app scroll container is `.content` in `AppShell.module.css` (`overflow-y: auto; -webkit-overflow-scrolling: touch`). The dashboard wrapper normally has `scrollTop === 0` even when the page is scrolled down inside AppShell.

That means any downward touch gesture inside the dashboard can enter pull-to-refresh mode and `preventDefault()` at `usePullToRefresh.ts:68`, blocking the user from naturally scrolling back up through the dashboard. It can also trigger sync while the user is not at the top of the actual scroll viewport.

**Fix recommendation:** Make the hook check the real scroll root, or accept a `scrollContainerRef` / predicate:

```ts
const scrollRoot = el.closest("[data-scroll-root]") as HTMLElement | null;
if ((scrollRoot?.scrollTop ?? window.scrollY) > 0) return;
```

Alternatively, attach the gesture ref directly to the AppShell scroll container and only enable it on dashboard routes.

---

## Warnings

### WR-01: Mobile hides the Moves tab button, but `activeTab` can remain `"moves"` after resize

**File:** `src/app/(app)/games/[id]/GameView.tsx:92-100`  
**Related CSS:** `src/app/(app)/games/[id]/GameView.module.css:859-861`

**Issue:** The `"Ходи"` tab button is hidden on mobile with CSS, and `activeTab` is switched to `"analysis"` only once on mount. If the user opens the game on desktop, stays on `"moves"`, then resizes or rotates into a mobile viewport, the `"Ходи"` button disappears but the moves tab content remains active because `activeTab` is still `"moves"`.

This violates the mobile tab contract: the hidden tab can still be the selected content state.

**Fix recommendation:** Reuse the existing breakpoint detection that sets `isMobile` and coerce `activeTab` when mobile becomes true:

```ts
useEffect(() => {
  if (isMobile && activeTab === "moves") setActiveTab("analysis");
}, [isMobile, activeTab]);
```

---

## Info

### IN-01: Inline pull-to-refresh keyframes should move out of DashboardClient

**File:** `src/app/(app)/dashboard/DashboardClient.tsx:73`

The inline `<style>` tag works, but it is re-rendered with the component and mixes animation CSS into the client component body. Prefer moving `@keyframes ptr-spin` into `page.module.css` and applying an animation class to the SVG circle.

### IN-02: Desktop board chrome budget is still approximate

**File:** `src/app/(app)/games/[id]/GameView.tsx:43-47,346`

`DESKTOP_VERTICAL_CHROME = 240` is now documented and covered by a layout expectation test, so this is not blocking. It remains a fixed budget that can drift when player badges, nav controls, or analysis controls change height. A dynamic measurement would be more resilient.

---

## Verification Notes

- Reviewed current code for all 6 files listed in phase summaries.
- Did not modify production code.
- Did not run the full test suite during review; this report is static code review.

_Reviewer: Codex inline code-reviewer_  
_Depth: standard_
