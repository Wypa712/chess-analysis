# Chess Analysis App

Вебзастосунок для імпорту шахових партій з Chess.com та Lichess, перегляду їх через Stockfish-подібний game review і генерації практичних LLM-порад для покращення гри.

## Основні можливості

- **Імпорт партій** з Chess.com і Lichess (за кількістю або періодом)
- **Stockfish-аналіз** з eval bar, eval graph, accuracy, класифікацією ходів і ключовими моментами
- **Explore mode** для аналізу варіантів з drag-to-explore
- **LLM-аналіз** окремих партій з практичними порадами українською
- **Груповий LLM-аналіз** для виявлення повторюваних помилок і слабкостей
- **Профіль гравця** з метриками результативності, статистикою дебютів і ELO-графіками

## Технології

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript (strict mode)
- **Styling:** CSS Modules
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Auth:** NextAuth.js v5 (GitHub OAuth, JWT strategy)
- **Chess Engine:** Stockfish WASM (depth 15)
- **Chess Logic:** chess.js, react-chessboard
- **LLM:** Groq API (llama-3.3-70b-versatile)

## Prerequisites

- Node.js 20+
- npm або yarn
- Neon PostgreSQL database
- GitHub OAuth App (для авторизації)
- Groq API key (для LLM-аналізу)

## Setup

### 1. Клонування репозиторію

```bash
git clone <repository-url>
cd chess-analysis
```

### 2. Встановлення залежностей

```bash
npm install
```

### 3. Налаштування environment variables

Створіть файл `.env.local` на основі `.env.example`:

```bash
cp .env.example .env.local
```

Заповніть необхідні значення:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# NextAuth
AUTH_SECRET=<generate-with: openssl rand -base64 32>
AUTH_GITHUB_ID=<your-github-oauth-client-id>
AUTH_GITHUB_SECRET=<your-github-oauth-client-secret>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# LLM
GROQ_API_KEY=<your-groq-api-key>
```

#### Отримання GitHub OAuth credentials

1. Перейдіть на https://github.com/settings/developers
2. Створіть новий OAuth App
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Скопіюйте Client ID і Client Secret

#### Отримання Groq API key

1. Зареєструйтесь на https://console.groq.com
2. Створіть новий API key у розділі API Keys

**Примітка:** Застосунок наразі використовує тільки Groq API. Інші LLM-провайдери (OpenAI, Anthropic, Google AI, Perplexity) підтримуються на рівні інфраструктури, але не активні в поточній версії.

### 4. Налаштування бази даних

Застосуйте міграції:

```bash
npm run db:push
```

Для перегляду бази даних через Drizzle Studio:

```bash
npm run db:studio
```

### 5. Запуск development сервера

```bash
npm run dev
```

Застосунок буде доступний на http://localhost:3000

## Development Workflow

### Структура проєкту

```
chess-analysis/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── games/             # Сторінки партій
│   │   ├── profile/           # Профіль гравця
│   │   └── dashboard/         # Дашборд
│   ├── components/            # React компоненти
│   ├── db/                    # Drizzle schema
│   ├── lib/                   # Утиліти
│   │   ├── chess/            # Шахова логіка
│   │   ├── importers/        # Chess.com/Lichess імпортери
│   │   └── llm/              # LLM інтеграція
│   └── hooks/                 # React hooks
├── spec/                      # Документація проєкту
├── design-prototype/          # UI референс
└── public/                    # Статичні файли
```

### Доступні команди

```bash
# Development
npm run dev              # Запуск dev сервера
npm run build            # Production build
npm run start            # Запуск production сервера

# Database
npm run db:generate      # Генерація міграцій
npm run db:migrate       # Застосування міграцій
npm run db:push          # Push schema до БД
npm run db:studio        # Drizzle Studio UI

# Testing
npm run test             # Запуск тестів у watch mode
npm run test:ui          # Запуск тестів з UI
npm run test:run         # Одноразовий запуск тестів
```

### Робота з базою даних

Schema знаходиться в `src/db/schema.ts`. Після змін:

1. Оновіть schema
2. Запустіть `npm run db:push` для синхронізації з БД
3. Для production використовуйте `npm run db:generate` + `npm run db:migrate`

### Додавання нових features

Перед реалізацією або архітектурним рішенням читайте файли в `spec/` у такому порядку:

1. `project-overview.md` — продукт, цілі, функції і scope
2. `architecture.md` — системна структура, межі, маршрути й інтеграції
3. `database-schema.md` — таблиці, обмеження, індекси і JSON-схеми
4. `ui-context.md` — UI-напрям, макети, компоненти і стани
5. `design-prototype.md` — як використовувати Claude design prototype
6. `code-standards.md` — правила реалізації і conventions
7. `ai-workflow-rules.md` — workflow, scoping rules і delivery approach
8. `progress-tracker.md` — поточна фаза, прогрес, відкриті питання і наступні кроки

**Важливо:** Папка `design-prototype/` містить UI-референс. Не копіювати її напряму в production-код. Використовуйте як вдохновення для верстки, але адаптуйте до поточної архітектури та стилів проекту.

Оновлюйте `progress-tracker.md` після кожної meaningful implementation change.

Якщо реалізація змінює архітектуру, scope або стандарти, спочатку оновіть відповідний файл у `spec/`.

### Тестування

Unit-тести використовують Vitest. Тести знаходяться поруч з файлами, які вони тестують (`.test.ts`).

Приклад запуску тестів:

```bash
npm run test              # Watch mode — автоматично перезапускає тести при змінах
npm run test:ui           # UI mode — інтерактивний інтерфейс для перегляду тестів
npm run test:run          # Single run — одноразовий запуск для CI/CD
```

**Поточне покриття:**
- Validators: `src/lib/llm/types.test.ts` (29 тестів)
- Integration тести та component тести будуть додані у Фазі 8

### Code Style

- TypeScript strict mode обов'язковий
- Використовуйте CSS Modules для стилів
- Server Components за замовчуванням, Client Components тільки для інтерактивності
- Валідуйте зовнішні дані перед збереженням
- Перевіряйте ownership для user data в API routes

## Імпорт партій

Застосунок підтримує два режими імпорту:

**За кількістю:**
- 25 / 50 / 100 найновіших партій

**За періодом:**
- Останні 7 / 30 / 90 днів

Повторний імпорт додає тільки нові партії (дедуплікація по platform game ID).

## Stockfish Analysis

- Запускається в браузері через WASM
- Depth 15, profile `default-v1`
- Результати кешуються в `engine_analyses`
- Класифікація ходів: best / good / inaccuracy / mistake / blunder
- Key moments: втрата ≥ 150cp

## LLM Analysis

- Модель: `llama-3.3-70b-versatile` (Groq)
- Мова відповідей: українська
- Формат: strict JSON
- Кешування в `game_analyses` і `group_analyses`
- Rate limiting: 30s для однієї партії, 60s для групового аналізу

## Production Deployment

### Vercel

1. Підключіть репозиторій до Vercel
2. Налаштуйте environment variables (як у `.env.local`)
3. Встановіть `DATABASE_URL` на production Neon database
4. Deploy

### Environment Variables для Production

Обов'язкові змінні для Vercel:
- `DATABASE_URL` — Neon production connection string
- `AUTH_SECRET` — новий secret для production (згенеруйте через `openssl rand -base64 32`)
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — production OAuth app
- `NEXT_PUBLIC_APP_URL` — production URL (наприклад, https://your-app.vercel.app)
- `GROQ_API_KEY` — Groq API key для LLM-аналізу

## Troubleshooting

### Stockfish не завантажується

Переконайтесь, що `postinstall` script виконався:

```bash
npm run postinstall
```

### Database connection errors

Перевірте `DATABASE_URL` і доступність Neon database.

### GitHub OAuth не працює

Перевірте:
1. `AUTH_GITHUB_ID` і `AUTH_GITHUB_SECRET` правильні
2. Callback URL в GitHub OAuth App: `<NEXT_PUBLIC_APP_URL>/api/auth/callback/github`
3. `AUTH_SECRET` згенеровано

### LLM аналіз не працює

Перевірте:
1. `GROQ_API_KEY` валідний
2. Rate limiting (30s між запитами для однієї партії)
3. Логи в консолі браузера і server logs

## Документація

Повна документація проєкту знаходиться в `spec/`:

- `project-overview.md` — огляд продукту і scope v1
- `architecture.md` — технічна архітектура
- `database-schema.md` — схема БД
- `ui-context.md` — UI-напрям і макети
- `code-standards.md` — стандарти коду
- `progress-tracker.md` — поточний прогрес

## License

Private project.
