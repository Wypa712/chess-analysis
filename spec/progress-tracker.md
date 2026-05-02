# Chess Analysis App — Трекер прогресу

## Поточний статус

- Статус: Фаза 1 — завершена
- Поточна фаза: Фаза 2 — Імпорт і список партій
- Джерело специфікації: `SPEC.md`

## Журнал рішень (додано)

| Дата | Рішення |
|---|---|
| 2026-05-02 | NextAuth: JWT strategy (без auth_sessions таблиці). |
| 2026-05-02 | LLM-аналіз вимагає Stockfish key moments. |
| 2026-05-02 | Auth роздвоєний на auth.config.ts (edge-safe) і auth.ts (DB adapter) для middleware. |
| 2026-05-02 | Drizzle migrations мають зберігатися в репозиторії; profile nav приховано до реалізації `/profile`. |
| 2026-05-02 | `users.email` зроблено unique, `updatedAt` оновлюється через Drizzle runtime updates. |
| 2026-05-02 | `next build` OOM на Windows — фікс: `cpus: 1` у next.config + `NODE_OPTIONS` у build script. |
| 2026-05-02 | Фаза 1 завершена. Дизайн: зелена палітра, DM Sans/Mono, sidebar + bottom nav. |

## Чекліст фаз

### Фаза 1 — Фундамент і авторизація

- [x] Створити Next.js 15 проєкт із TypeScript strict mode.
- [x] Налаштувати CSS Modules.
- [x] Налаштувати підключення до Neon database (drizzle + neon-http).
- [x] Додати Drizzle ORM.
- [x] Описати початкову database schema (`src/db/schema.ts`).
- [x] Запустити міграції (потрібен DATABASE_URL).
- [x] Налаштувати NextAuth.js v5.
- [x] Налаштувати JWT strategy для NextAuth.js v5.
- [x] Налаштувати GitHub OAuth.
- [x] Додати login page (`/auth/login`).
- [x] Захистити `/dashboard` через middleware.
- [x] Додати базовий authenticated shell (AppShell).
- [x] `next build` без помилок і попереджень.
- [x] Застосувати палітру з дизайн-прототипу (зелена/лісова тема, `#0e1a0e` bg).
- [x] Підключити шрифти DM Sans + DM Mono.
- [x] Замінити top navbar на вузький sidebar з іконками (desktop).
- [x] Додати bottom navigation для mobile.

### Фаза 2 — Імпорт і список партій

- [ ] Додати модель chess account і збереження в БД.
- [ ] Реалізувати імпорт з Lichess.
- [ ] Реалізувати імпорт з Chess.com.
- [ ] Додати опції імпорту: 25 / 50 / 100 партій.
- [ ] Додати опції імпорту: 7 / 30 / 90 днів.
- [ ] Встановити імпорт за замовчуванням: 25 партій і 7 днів.
- [ ] Нормалізувати імпортовані партії у локальну схему.
- [ ] Пропускати вже імпортовані партії.
- [ ] Додати пагінований список партій.
- [ ] Додати фільтри для платформи, контролю часу, результату і діапазону дат.
- [ ] Показувати статус аналізу для кожної партії.

### Фаза 3 — Перегляд однієї партії

- [ ] Додати маршрут `/games/[id]`.
- [ ] Завантажувати партію за id з перевіркою ownership.
- [ ] Парсити PGN через `chess.js`.
- [ ] Рендерити дошку через `react-chessboard`.
- [ ] Додати навігацію по ходах.
- [ ] Додати список ходів.
- [ ] Підсвічувати останній хід.

### Фаза 4 — Stockfish game review

- [ ] Додати Stockfish WASM integration.
- [ ] Запускати аналіз у браузері.
- [ ] Додати eval bar.
- [ ] Додати eval graph.
- [ ] Додати best move arrow або highlight.
- [ ] Додати ключові моменти.
- [ ] Додати accuracy для обох сторін.
- [ ] Додати класифікацію ходів.
- [ ] Зберігати engine-аналіз у `engine_analyses`.
- [ ] Провести performance spike для depth/time defaults.

### Фаза 5 — LLM-аналіз однієї партії

- [ ] Додати Gemini Flash integration.
- [ ] Визначити strict JSON schema для single-game analysis.
- [ ] Передавати PGN, колір гравця, результат, контроль часу і Stockfish key moments, якщо вони є.
- [ ] Генерувати український аналіз.
- [ ] Валідувати LLM JSON перед збереженням.
- [ ] Зберігати аналіз у `game_analyses`.
- [ ] Показувати кешований аналіз.
- [ ] Додати явну опцію повторного запуску.

### Фаза 6 — Груповий LLM-аналіз

- [ ] Додати multi-select для партій.
- [ ] Обмежити вибір до 5-30 партій.
- [ ] Формувати стислі зведення партій.
- [ ] Додавати engine-дані і попередні LLM-нотатки, якщо вони є.
- [ ] Визначити strict JSON schema для group analysis.
- [ ] Генерувати український груповий аналіз.
- [ ] Зберігати аналіз у `group_analyses`.

### Фаза 7 — Профіль і дашборд

- [ ] Додати маршрут `/profile`.
- [ ] Додати фільтри: 25 / 50 / 100 партій.
- [ ] Додати фільтри: 7 / 30 / 90 днів.
- [ ] Додати chart перемог / нічиїх / поразок.
- [ ] Додати результативність за контролем часу.
- [ ] Додати результативність за кольором.
- [ ] Додати найчастіші дебюти.
- [ ] Додати win rate за дебютом.
- [ ] Додати накопичувальне LLM-зведення.
- [ ] Ховати або пояснювати зведення, коли є менше ніж 5 партій.

### Фаза 8 — Полірування і деплой

- [ ] Додати стани завантаження.
- [ ] Додати порожні стани.
- [ ] Додати обробку помилок імпорту.
- [ ] Додати обробку LLM-помилок.
- [ ] Додати базове rate limiting.
- [ ] Налаштувати production env vars.
- [ ] Налаштувати Neon production database.
- [ ] Задеплоїти на Vercel.
- [ ] Провести smoke test production.

## Відкриті питання

- [ ] Профіль має об'єднувати Chess.com і Lichess за замовчуванням, чи потрібен platform switcher?
- [ ] LLM-аналіз однієї партії має вимагати готовий Stockfish analysis, чи дозволяти PGN-only analysis?
- [ ] Які точні Stockfish depth/time defaults використати після performance spike?

## Ризики для моніторингу

- [ ] Chess.com rate limits.
- [ ] Lichess NDJSON streaming у Next.js API routes.
- [ ] Stockfish WASM performance для full-game analysis.
- [ ] Розмір `engine_analyses.analysis_json` у Neon.
- [ ] Gemini free-tier limits.
- [ ] Складність NextAuth v5 + Neon setup.

## Журнал рішень

| Дата | Рішення |
|---|---|
| 2026-05-02 | Проєкт реалізується маленькими робочими фазами. |
| 2026-05-02 | v1 auth-first через GitHub OAuth. |
| 2026-05-02 | Анонімний режим не входить у v1. |
| 2026-05-02 | v1 підтримує Chess.com і Lichess. |
| 2026-05-02 | Імпорт обмежений 25/50/100 партій і 7/30/90 днями. |
| 2026-05-02 | Default import: 25 партій і 7 днів. |
| 2026-05-02 | LLM output: український strict JSON. |
| 2026-05-02 | Engine analysis зберігається в database. |
| 2026-05-02 | Детальна схема БД винесена в `database-schema.md`. |
| 2026-05-02 | Claude design prototype додано як UI-референс, не як production-код. |
| 2026-05-02 | Для NextAuth.js v5 використовується JWT strategy; `auth_sessions` не створюється. |
