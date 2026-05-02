# Chess Analysis App — Правила AI-workflow

## Призначення

Ці правила керують AI-assisted реалізацією проєкту. Мета — тримати роботу фазовою, узгодженою зі специфікацією і зручною для review.

## Канонічні документи

- `SPEC.md` — повна базова специфікація.
- `project-overview.md` — продуктовий scope і рішення v1.
- `architecture.md` — стек, маршрути, модель даних і flows.
- `database-schema.md` — таблиці, обмеження, індекси і JSON-схеми.
- `design-prototype.md` — правила використання Claude design prototype.
- `code-standards.md` — constraints для реалізації.
- `ui-context.md` — очікування щодо UI.
- `progress-tracker.md` — поточний прогрес і відкриті питання.

## Робочі правила

1. Перед змінами читати релевантні spec-файли.
2. Працювати малими фазами і залишати застосунок runnable після кожної фази.
3. Не реалізовувати весь продукт одразу.
4. Не змінювати продуктові рішення зі спеки мовчки.
5. Питати перед зміною архітектури, стеку, auth model, import limits, LLM format або out-of-scope меж.
6. Оновлювати `progress-tracker.md` після meaningful progress.
7. Надавати перевагу простій явній реалізації, а не clever abstractions.
8. Тримати зміни близько до поточної фази.

## Жорсткі продуктові рішення

- Спочатку auth.
- GitHub OAuth — auth method для v1.
- NextAuth.js v5 використовує JWT strategy; не створювати таблицю `auth_sessions`.
- Без анонімного імпорту або аналізу у v1.
- Chess.com і Lichess входять у v1.
- Import options: 25 / 50 / 100 партій і 7 / 30 / 90 днів.
- Defaults: 25 партій і 7 днів.
- Без full lifetime import у v1.
- UI і LLM-аналіз українською для v1.
- LLM responses мають бути strict JSON.
- Stockfish analysis results зберігаються.
- User-configurable engine thresholds не входять у v1.

## Правила залежностей

- Використовувати тільки стек з `architecture.md`.
- Дизайн-прототип використовувати як референс, а не як production-код.
- Не додавати Tailwind.
- Не додавати UI component library.
- Не додавати animation libraries.
- Не додавати query clients без чіткої погодженої причини.
- Надавати перевагу platform APIs і малим local utilities.

## Запобіжники реалізації

- Захищати продуктові routes і APIs перевірками сесії.
- Перевіряти ownership для user data.
- Нормалізувати Chess.com і Lichess data в одну внутрішню форму.
- Валідувати LLM JSON перед збереженням.
- Валідувати external API data перед збереженням.
- Тримати Stockfish browser-side.
- Кешувати LLM-аналіз і вимагати явний повторний запуск.
- Зберігати engine-аналіз в `engine_analyses`.

## Коли ставити питання

Питати перед продовженням, якщо робота вимагає вирішити:

- чи profile metrics об'єднують платформи, чи мають platform switcher;
- чи LLM analysis вимагає completed Stockfish analysis;
- точні Stockfish depth/time defaults після performance testing;
- нові database tables поза поточною моделлю;
- нові third-party dependencies;
- paid APIs або provider changes;
- зміни import limits;
- зміни authentication.

## Дисципліна фаз

Поточна фаза має керувати реалізацією. Код для пізніших фаз можна stub-ити тільки тоді, коли це потрібно для цілісності поточної фази.

Порядок фаз:

1. Фундамент і авторизація.
2. Імпорт і список партій.
3. Перегляд однієї партії.
4. Stockfish game review.
5. LLM-аналіз однієї партії.
6. Груповий LLM-аналіз.
7. Профіль і дашборд.
8. Полірування і деплой.
