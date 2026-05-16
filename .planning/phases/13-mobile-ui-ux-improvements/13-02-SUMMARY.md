---
phase: 13-mobile-ui-ux-improvements
plan: "02"
subsystem: game-view-mobile
tags: [mobile, layout, eval-bar, move-strip, css-modules]
dependency_graph:
  requires: []
  provides: [mobile-horizontal-eval-bar, mobile-move-strip, mobile-board-full-width]
  affects: [GameView.tsx, GameView.module.css]
tech_stack:
  added: []
  patterns: [css-modules-mobile-override, conditional-render-isMobile, useMemo-eval-calc]
key_files:
  created: []
  modified:
    - src/app/(app)/games/[id]/GameView.tsx
    - src/app/(app)/games/[id]/GameView.module.css
decisions:
  - "isMobile set via setIsMobile in ResizeObserver compute — stays in sync with actual viewport"
  - "activeTab default uses typeof window guard for SSR safety (T-13-02-1)"
  - "activeTokenRef uses single ref pattern (last assignment wins) — sufficient for scroll-into-view"
  - "evalWhitePercent clamps to ±10 pawns for percentage display (beyond = mate)"
metrics:
  duration: "~15 min"
  completed: "2026-05-16"
  tasks_completed: 2
  files_modified: 2
---

# Phase 13 Plan 02: Mobile GameView Layout Summary

**One-liner:** Горизонтальний eval bar (12px) над шахівницею, MoveStrip (44px overflow-x scroll) під нею, шахівниця на повну ширину — мобільний лейаут GameView з isMobile state і авто-скролом до активного ходу.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Додати CSS класи для мобільного лейауту | 1b9901d | GameView.module.css |
| 2 | Оновити GameView.tsx — isMobile, boardSize, умовний рендер | 64f6a94 | GameView.tsx |

---

## What Was Built

### Task 1: CSS класи (GameView.module.css)

Додано нові класи:
- `.evalBarHorizontalWrap` — flex column обгортка горизонтального eval bar + label
- `.evalBarHorizontal` — 12px висота, flex row, border + overflow hidden
- `.evalBarHorizontalWhite` / `.evalBarHorizontalBlack` — ліва/права частини з `transition: width 0.45s ease`
- `.evalBarHorizontalLabel` — 10px mono, right-aligned, колір `var(--color-text-muted)`
- `.moveStrip` — flex row, 44px висота, `overflow-x: auto`, `scrollbar-width: none`
- `.moveStripNum` — 11px mono, muted
- `.moveStripToken` — 13px mono, кнопка з прозорим border
- `.moveStripTokenActive` — `color-mix` highlight з `var(--color-info)`
- `.movePairGroup` — inline-flex обгортка пари ходів

Мобільні overrides у `@media (max-width: 768px)`:
- `.evalBarWrap { display: none }` — вертикальний eval bar прихований
- `.navBtn { width: 48px; height: 48px }` — upgrade з 44px

### Task 2: GameView.tsx

- **`isMobile` state**: `useState(false)`, встановлюється через `setIsMobile(mobile)` всередині ResizeObserver `compute()`
- **boardSize calc**: умовний — `availableW` без `EVAL_BAR_WIDTH` на мобайлі (повна ширина шахівниці)
- **`activeTab` default**: `typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches ? "analysis" : "moves"` — SSR-безпечно
- **`activeTokenRef`**: `useRef<HTMLButtonElement>(null)` + `useEffect([currentMove])` → `scrollIntoView({ behavior: "smooth", inline: "center" })`
- **`evalWhitePercent`** / **`evalDisplayStr`**: useMemo для обчислення відсотка заповнення та підпису eval bar
- **Горизонтальний eval bar**: рендериться `{isMobile && ...}` між `PlayerBadge` (чорні) і `.boardRow`
- **MoveStrip**: рендериться `{isMobile && movePairs.length > 0 && ...}` між `PlayerBadge` "Ви" і `.navControls`

---

## Deviations from Plan

None — план виконано точно згідно специфікації.

---

## Known Stubs

None.

---

## Threat Flags

None — нових network endpoints або auth paths не додано. SSR guard для `typeof window` реалізовано (T-13-02-1 mitigated).

---

## Self-Check

Files created/modified:
- [x] `src/app/(app)/games/[id]/GameView.module.css` — FOUND (modified)
- [x] `src/app/(app)/games/[id]/GameView.tsx` — FOUND (modified)

Commits:
- [x] 1b9901d — FOUND
- [x] 64f6a94 — FOUND

TypeScript: 0 errors

## Self-Check: PASSED
