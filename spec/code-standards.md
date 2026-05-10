# Chess Analysis App — Стандарти коду

## Загальні принципи

- Реалізація має бути фазовою і залишати застосунок робочим після кожної фази.
- Надавати перевагу простому явному коду, а не передчасним абстракціям.
- Використовувати стек зі специфікації.
- Не додавати залежності без реальної потреби і явного обґрунтування.
- У v1 продуктовий текст і LLM-відповіді мають бути українською.

## TypeScript

- TypeScript strict mode обов'язковий.
- Уникати `any`, якщо це не справді невідомий зовнішній boundary; після такого boundary тип треба звузити.
- Використовувати доменні типи для platform, result, color, time control, import limits і analysis status.
- Парсити й валідувати дані зовнішніх API перед збереженням.
- Тримати shared types поруч із доменом, який вони описують, якщо вони не використовуються в кількох модулях.

## Next.js

- Використовувати conventions Next.js 15 App Router.
- За замовчуванням надавати перевагу Server Components.
- Client Components використовувати тільки для інтерактивного UI:
  - шахова дошка;
  - навігація по ходах;
  - стан Stockfish worker;
  - фільтри й selection controls, коли це потрібно.
- API routes мають перевіряти session і ownership перед читанням або зміною user data.
- Не використовувати server actions без чіткої причини, якщо API routes краще пасують поточній фазі.

## Стилі

- Використовувати Vanilla CSS із CSS Modules.
- Не використовувати Tailwind.
- Не додавати UI component library.
- Reusable UI primitives тримати маленькими і локальними, доки повторення не доведе потребу винести їх.
- Використовувати responsive layouts зі стабільними розмірами для дошки, таблиць, панелей, фільтрів і графіків.
- Текст не має вилазити за межі buttons, cards, table cells або panels.

## База даних і Drizzle

- Drizzle schema є джерелом правди для database tables.
- Міграції мають бути закомічені і відповідати фазам.
- Ownership перевіряється через зв'язки `users` -> `chess_accounts` -> `games`.
- Використовувати unique constraints там, де вони захищають цілісність даних:
  - auth provider account identity;
  - chess account per user/platform/username;
  - platform game id per chess account.
- LLM і engine outputs зберігати як JSON тільки після валідації очікуваної форми.

## Робота із зовнішніми API

- Нормалізувати Chess.com і Lichess партії в одну внутрішню форму.
- Початковий імпорт виконується chunked після підключення акаунту; dashboard sync автоматично тягне нові партії відносно останньої локально імпортованої партії.
- Не завантажувати повну історію партій у v1.
- Коректно обробляти відсутні opening names, aborted games, нестандартні результати і malformed PGN.
- Ставитися до зовнішніх API як до ненадійних: timeouts, зрозумілі помилки, retry тільки коли це безпечно.

## Шахова логіка й engine-аналіз

- Використовувати `chess.js` для PGN parsing, replay ходів і FEN generation.
- Використовувати `react-chessboard` для рендеру дошки.
- Stockfish WASM запускається в браузері.
- Фінальний результат default-profile engine analysis зберігається в `engine_analyses`.
- Не зберігати кожну проміжну depth або principal variation.
- Класифікація ходів має використовувати дефолтну centipawn / win probability loss модель.
- У v1 не додавати користувацькі thresholds.

## LLM-інтеграція

- Основна модель: `llama-3.3-70b-versatile` через Groq.
- `GROQ_API_KEY` є обов'язковим для LLM-аналізу в поточній версії.
- Усі промпти мають вимагати українську відповідь.
- Усі LLM-відповіді мають бути строгим JSON за очікуваною схемою.
- У v1 не рендерити raw markdown від моделі.
- Зберігати analysis results у кеші/БД.
- Повторний аналіз має бути явною дією користувача, бо він коштує API-виклику.

Базовий system prompt:

```text
You are a chess coach analyzing games for a ~1000 ELO player.
Focus on practical, actionable advice. Avoid grandmaster-level concepts.
Point out concrete mistakes with move numbers. Be direct and constructive.
Respond in Ukrainian.
Return strict JSON matching the requested schema.
```

## Обробка помилок

- Помилки в UI мають пояснювати, що сталося і що користувач може спробувати далі.
- Server-side logs мають містити достатньо деталей для debug імпорту й LLM-помилок.
- Ніколи не показувати в UI API keys, raw provider tokens або internal stack traces.
- Порожні стани потрібні для dashboard, profile, game analysis і import results.

## Тестування і перевірка

- Додавати тести там, де поведінка легко регресує:
  - import normalization;
  - PGN parsing helpers;
  - result/color detection;
  - LLM JSON schema validation;
  - ownership checks.
- Вручну перевіряти кожну фазу в браузері перед позначенням done.
- Для UI-heavy фаз перевіряти desktop і mobile widths.

## Оновлення документації

- Оновлювати `progress-tracker.md` після завершення задачі або фази.
- Оновлювати architecture docs, коли змінюються routes, tables, env vars або major flows.
- Тримати `SPEC.md` як повну базову специфікацію, доки не зміниться продуктовий напрям.
