---
phase: 13
plan: "03"
subsystem: mobile-ux
tags: [mobile, css, tabs, LlmTabsPanel]
dependency_graph:
  requires: [13-02]
  provides: [mobile-tabs-hide-moves]
  affects: [LlmTabsPanel, GameView.module.css]
tech_stack:
  added: []
  patterns: [CSS attribute selector, data-* attribute]
key_files:
  created: []
  modified:
    - src/app/(app)/games/[id]/LlmTabsPanel.tsx
    - src/app/(app)/games/[id]/GameView.module.css
decisions:
  - "CSS-only підхід через data-tab атрибут і CSS selector — без JS умов (window.matchMedia або isMobile prop)"
metrics:
  duration: "5 minutes"
  completed_date: "2026-05-16"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 2
---

# Phase 13 Plan 03: Hide Moves Tab on Mobile Summary

## One-liner

CSS-only приховування вкладки "Ходи" у LlmTabsPanel на мобайлі через `data-tab` атрибут + CSS attribute selector в `@media (max-width: 768px)`.

---

## What Was Built

### Task 1: Додати data-tab атрибут до tab buttons і CSS hide rule (c319048)

**LlmTabsPanel.tsx:** Додано атрибут `data-tab={tab}` до кожного `<button>` у tab bar map. Не потрібних JS умов — атрибут просто є на всіх кнопках.

**GameView.module.css:** Всередині `@media (max-width: 768px)` блоку додано:
```css
.tabItem[data-tab="moves"] {
  display: none;
}
```

Існуючий `display: flex` у `.tabBar` автоматично розподіляє дві вкладки ("Аналіз" і "Поради") по 50% ширини кожна.

---

## Deviations from Plan

None — план виконано точно як написано.

---

## Decisions Made

- **CSS-only підхід** обраний відповідно до плану і UI-SPEC: `data-tab` атрибут на кожному button + CSS attribute selector. Жодного JS (`typeof isMobile`, `window.matchMedia`) у компоненті немає.
- CSS rule розміщено всередині існуючого `@media (max-width: 768px)` блоку у `GameView.module.css` — після правил для `.navBtn`, перед закриваючою дужкою блоку.

---

## Known Stubs

None.

---

## Threat Flags

None — план не вводить нових мережевих endpoints, auth paths, або схем БД.

---

## Self-Check

- [x] `src/app/(app)/games/[id]/LlmTabsPanel.tsx` — змінено, data-tab атрибут присутній (рядок 92)
- [x] `src/app/(app)/games/[id]/GameView.module.css` — CSS rule присутній (рядок 842), всередині @media блоку
- [x] Коміт c319048 існує
- [x] TypeScript: `npx.cmd tsc --noEmit` — нуль помилок

## Self-Check: PASSED
