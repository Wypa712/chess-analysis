---
status: partial
phase: 12-react-query-client-caching
source: [12-VERIFICATION.md]
started: 2026-05-15T00:00:00Z
updated: 2026-05-15T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Перевірка відсутності зайвих мережевих запитів (Navigation Caching)

expected: Протягом 5 хвилин після першого завантаження повторний запит до `/api/games` не виконується при поверненні на dashboard. Відкрити /dashboard → перейти на /games/[id] → повернутися на /dashboard. У вкладці Network DevTools перевірити відсутність запиту `/api/games`.
result: [pending]

### 2. Перевірка кешування analysis endpoints

expected: При повторному переході на той самий /games/[id] запити до `/api/games/[id]/engine-analysis` та `/api/games/[id]/analyze` не виконуються (staleTime Infinity).
result: [pending]

### 3. Перевірка cache invalidation після sync

expected: Після завершення SyncStatusBar sync (з `imported > 0`) виконується новий запит до `/api/games` (кеш інвалідований через `invalidateQueries(['games', userId])`).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
