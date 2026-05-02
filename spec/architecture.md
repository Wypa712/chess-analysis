# Chess Analysis App — Архітектура

## Технологічний стек

| Шар | Технологія | Примітки |
|---|---|---|
| Фреймворк | Next.js 15 App Router | Frontend і API routes в одному проєкті |
| Мова | TypeScript | Strict mode |
| Стилі | Vanilla CSS + CSS Modules | Без Tailwind і без UI-бібліотек |
| База даних | Neon PostgreSQL | Serverless Postgres |
| ORM | Drizzle ORM | TypeScript-native схема і запити |
| Auth | NextAuth.js v5 | GitHub OAuth для v1 |
| Шахова логіка | chess.js | Парсинг PGN і валідація ходів |
| Шахова дошка | react-chessboard | UI дошки |
| Engine | stockfish.js WASM | Аналіз у браузері |
| LLM | Gemini Flash 2.0 | Groq llama-3.3-70b-versatile як fallback |
| Деплой | Vercel | Нативна підтримка Next.js |

## Правило залежностей

Використовувати лише технології зі стеку вище, якщо немає чіткої технічної потреби і погодженого рішення. За замовчуванням не додавати UI-бібліотеки, animation-бібліотеки або query-клієнти.

## Архітектура авторизації

- Auth provider: GitHub OAuth.
- Auth library: NextAuth.js v5.
- Session strategy: JWT.
- Таблиця `auth_sessions` не створюється у v1.
- Усі продуктові маршрути захищені.
- Усі API для імпорту й аналізу вимагають валідну сесію.
- Анонімний режим не входить у v1.

## Зовнішні інтеграції

### Chess.com

Endpoint:

```text
https://api.chess.com/pub/player/{user}/games/{year}/{month}
```

Нотатки реалізації:

- Імпортувати тільки вибраний період і вибрану кількість найновіших партій.
- Перша версія має підтримувати 25 / 50 / 100 партій.
- Потрібно перевірити throttling і поведінку API при повторних імпортах.

### Lichess

Endpoint:

```text
https://lichess.org/api/games/user/{user}
```

Нотатки реалізації:

- Відповідь приходить як NDJSON-стрим.
- Імпортувати тільки вибраний період і вибрану кількість партій.
- Next.js API route має акуратно обробляти streaming.

### LLM

Основна модель:

```text
gemini-2.0-flash
```

Fallback:

```text
llama-3.3-70b-versatile
```

Усі LLM-відповіді у v1 мають бути українським строгим JSON.

## Маршрути

```text
/                              стартова сторінка; авторизованих веде в dashboard
/auth/login                    GitHub login
/dashboard                     список партій, фільтри, імпорт
/games/[id]                    дошка, engine review, LLM-аналіз однієї партії
/profile                       метрики гравця і накопичувальне LLM-зведення
/api/auth/[...nextauth]        NextAuth.js routes
/api/games/import              POST імпорт партій з Chess.com або Lichess
/api/games/[id]/engine-analysis POST збереження Stockfish-аналізу
/api/games/[id]/analyze        POST запуск LLM-аналізу однієї партії
/api/analysis/group            POST запуск групового LLM-аналізу
/api/profile/summary           POST повторна генерація зведення профілю
```

## Модель даних

Детальна схема таблиць, обмежень, індексів і JSON-структур описана в `database-schema.md`.

```text
users
  id, email, name, image, created_at

auth_accounts
  id, user_id, provider, provider_account_id, access_token, expires_at

chess_accounts
  id, user_id, platform (chess.com|lichess), username, last_synced_at

games
  id, chess_account_id, platform_game_id, pgn, result, color,
  opponent, opening_name, time_control, played_at, move_count

engine_analyses
  id, game_id, engine_name, engine_version, depth, created_at, analysis_json

game_analyses
  id, game_id, llm_model, prompt_tokens, created_at, analysis_json

group_analyses
  id, user_id, game_ids (int[]), llm_model, created_at, analysis_json

player_summaries
  id, user_id, generated_at, games_count, analysis_json
```

## Основні потоки даних

### Потік імпорту

1. Користувач входить у систему.
2. Користувач вибирає платформу, нікнейм, кількість партій і період.
3. API завантажує партії з Chess.com або Lichess.
4. API нормалізує партії у локальну схему.
5. Наявні партії пропускаються через `platform_game_id`.
6. Нові партії зберігаються під chess account користувача.

### Потік перегляду однієї партії

1. Користувач відкриває `/games/[id]`.
2. App завантажує PGN і метадані.
3. `chess.js` парсить партію і керує replay ходів.
4. `react-chessboard` рендерить поточну позицію.
5. Stockfish WASM запускає client-side game review.
6. Результат аналізу зберігається в `engine_analyses`.

### Потік LLM-аналізу однієї партії

1. Користувач вручну запускає LLM-аналіз.
2. API перевіряє сесію і ownership.
3. API надсилає PGN, колір гравця, результат, контроль часу і ключові моменти Stockfish, якщо вони є.
4. LLM повертає строгий український JSON.
5. Результат зберігається в `game_analyses`.

### Потік групового аналізу

1. Користувач вибирає 5-30 партій.
2. API формує стислі зведення.
3. API додає engine-класифікації і попередні LLM-нотатки, якщо вони є.
4. LLM повертає строгий український JSON.
5. Результат зберігається в `group_analyses`.

## Змінні середовища

```text
DATABASE_URL
AUTH_SECRET
AUTH_GITHUB_ID
AUTH_GITHUB_SECRET
GOOGLE_GENERATIVE_AI_API_KEY
GROQ_API_KEY
NEXT_PUBLIC_APP_URL
```

`GROQ_API_KEY` є опціональним, доки не реалізовано fallback.

## Архітектурні ризики

- Потрібно перевірити rate limits Chess.com.
- Lichess NDJSON streaming потребує акуратної обробки в API routes.
- Stockfish WASM performance треба перевірити коротким spike перед фіксацією depth/time defaults.
- Розмір engine analysis JSON у Neon потрібно перевірити після першої реалізації.
- NextAuth v5 + Neon може потребувати уважного boilerplate.
