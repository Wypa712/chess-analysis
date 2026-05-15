# Phase 10: v2 Polish & Hardening — Discussion Log

**Date:** 2026-05-14
**Duration:** ~15 min
**Areas discussed:** Security, Code cleanup, Performance, UI/UX

---

## Area 1: Security

| Question | Options presented | User selected |
|---|---|---|
| RLS на продуктових таблицях | Додати RLS на всі / Лише auth tables / Пропустити | Додати RLS на всі |
| Token hashing | Підключити token-hash.ts / Відкласти до Phase 2 | Відкласти до Phase 2 |
| Misc security fixes | Content-Length guard / Username regex / Groq 429 Retry-After | Всі три |

**Notes:** Token hashing відкладено бо verification tokens використовуються лише в email-флоу, якого ще немає.

---

## Area 2: Code Cleanup

| Question | Options presented | User selected |
|---|---|---|
| Дублі LLM lock + Groq client | Extract в lib / Залишити | Extract (Recommended) |
| Великі компоненти (GameView 871, ProfileView 664, useStockfish 622) | Рефакторити всі / Лише duplicate code / Пропустити | Рефакторити всі |
| Known bugs | Queen promotion hint / Rename totalGames / Пропустити | Обидва |

---

## Area 3: Performance

| Question | Options presented | User selected |
|---|---|---|
| Profile/stats 5 sequential queries | Promise.all / Залишити | Promise.all |
| Group analysis cache + sync concurrency | Cache lookup до buildGameSummaries / Sync concurrency 2 / Пропустити | Обидва |

---

## Area 4: UI/UX

| Question | Options presented | User selected |
|---|---|---|
| Що покращуємо | Error states / Loading states / Mobile / Візуальні | Всі чотири |
| Візуальні поліпшення — що конкретно | Загальний audit / Dashboard + game view / Лише критичні | Загальний audit по всіх сторінках |
| Mobile — що пріоритет | Game view / Navigation / Будь-яка сторінка | Будь-яка сторінка |
| Error states — де найгірше | Onboarding / SyncStatusBar 429 / game/profile API errors | Всі три |
| Loading states | UI audit вирішить / Уточнити зараз | UI audit вирішить |

---

## Deferred Ideas

- `auth_verification_tokens.token` HMAC-SHA256 → v2 Phase 3 (Email Auth)
- OAuth tokens at-rest encryption → backlog
- CI pipeline → окрема ініціатива
- BroadcastChannel для multi-tab sync → backlog

---

## Claude's Discretion Items

- Specific RLS policy implementation approach (service-role vs user-scoped)
- Concurrency limiter pattern for sync
- Exact refactoring split points for large components
