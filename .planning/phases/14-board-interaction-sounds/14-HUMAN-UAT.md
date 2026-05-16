---
status: partial
phase: 14-board-interaction-sounds
source: [14-VERIFICATION.md]
started: 2026-05-16T00:00:00Z
updated: 2026-05-16T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Click-to-move у mainline mode — підсвічування без ходу
expected: Клік на фігуру підсвічує доступні ходи (dot на пустих клітинках, ring на клітинках з ворожою фігурою). Explore mode НЕ вмикається. Хід НЕ виконується.
result: [pending]

### 2. Click-to-move у explore mode — виконання ходу
expected: Клік на фігуру → підсвічування → клік на підсвічену клітинку → хід виконується. Drag-and-drop продовжує працювати.
result: [pending]

### 3. Звуки при навігації — різні тони для різних типів ходів
expected: При goNext/goPrev/goToMove чутно звук. Звук взяття відрізняється від звичайного ходу. Explore-ходи також відтворюють звук.
result: [pending]

### 4. Відсутність накопичення звуків при швидкій навігації
expected: При швидкому кліканні "Наступний хід" кілька разів поспіль звуки не накопичуються у черзі — грає лише один звук за раз (debounce 30ms).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
