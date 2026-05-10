# Chess Analysis App — Трекер прогресу (v2)

## 📊 Поточний статус

**Production:** ✅ Живий (Vercel + Neon + GitHub OAuth)  
**Поточна фаза:** Фаза 1 v2 — завершено (потребує ручного тестування)  
**Остання зміна:** 2026-05-10 — Фаза 1 v2: онбординг + авто-синк

---

## 🐛 Відомі баги

| Баг | Статус | Примітки |
|-----|--------|----------|
| Sticky footer (назва дебюту) не стікі на мобайлі | ✅ Виправлено | `position: absolute; bottom: 0` в mobile CSS |

---

## 🗺️ Плани v2

### Фаза 1 — Онбординг і авто-синхронізація ✅

**Мета:** Новий користувач одразу підключає свої акаунти і отримує партії автоматично.

**Реалізовано (2026-05-10):**
- `/onboarding` сторінка: форма підключення Chess.com/Lichess + chunked initial import progress bar
- `/settings` сторінка: управління акаунтами + dev-only reset
- `AccountForm`, `LinkedAccountCard`, `SyncStatusBar` компоненти
- `GET/POST /api/chess-accounts` — список і додавання акаунтів (з валідацією на платформі)
- `DELETE /api/chess-accounts/[id]` — видалення акаунту
- `DELETE /api/chess-accounts/reset` — dev-only повне скидання
- `POST /api/sync` — delta sync (нові партії з lastSyncedAt, rate limit 60s)
- `POST /api/sync/initial` — chunked initial import (50/chunk, cursor-based, до 1000 партій)
- DashboardLayout: redirect до /onboarding якщо нема chess_accounts
- SyncStatusBar: авто-синк при вході (sessionStorage, 1 раз/год) + кнопка "Оновити"
- Lichess importer: додано `until` cursor + `oldestPlayedAt` в response
- Chess.com importer: додано `until` filter + `oldestPlayedAt` в response
- Dashboard: ImportForm замінено на SyncStatusBar
- SidebarNav: додано пункт "Налаштування"
- Middleware: /onboarding і /settings додано до protected paths

#### Функціонал:

**Онбординг (перший вхід):**
- Сторінка налаштування профілю: вказати нік на Chess.com і/або Lichess
- Відразу після — автоматичний початковий імпорт (до **1000 партій**, chunked, не блокує UI)
- Прибрати ручний вибір діапазону/кількості — замість цього кнопка "Оновити" як єдиний ручний тригер

**Авто-синхронізація:**
- При кожному вході: автоматично тягнути нові партії (нові відносно останньої імпортованої)
- Виконується фоново після логіну (не блокує redirect)
- Кнопка "Оновити" в UI — fallback якщо щось не підтягнулося або є нові партії поки апка відкрита
- **Без cron** (Vercel Hobby обмежує до 1 раз/день — не підходить для hourly)

#### Технічні рішення:
- `linked_accounts` таблиця: `userId`, `platform`, `username`
- Порівняння по даті останньої партії для delta-sync
- Chunked import: порціями по ~50 партій щоб не впертись в 30s timeout
- Rate limit захист на `/api/sync` endpoint
- Dev-only reset: `DELETE FROM linked_accounts WHERE user_id = ?` або кнопка в `/settings` (тільки `NODE_ENV=development`) для тестування онбордингу повторно

---

### Фаза 2 — Авторизація (не горить)

**Мета:** Додати email+пароль і Google OAuth поряд з існуючим GitHub.

#### Функціонал:
- Email + пароль (credentials provider в NextAuth)
- Google OAuth (Google Cloud Console App)
- GitHub OAuth — залишається
- Username (нік) зберігається окремо в профілі, не є частиною auth

#### Безпека:
- bcrypt для хешування паролів
- Rate limiting на login endpoint (brute force захист)
- Однакова помилка для "email не існує" і "невірний пароль" (проти email enumeration)
- Account linking policy: один email = один акаунт; якщо Google і credentials мають однаковий email — лінкуємо, не дублюємо
- Мінімальна довжина пароля: 8 символів (валідація клієнт + сервер)

---

## 📋 Backlog (P2, необов'язково)

- React Query для кешування запитів
- LLM client abstraction (легко міняти Groq → інший провайдер)
- Share партії по посиланню
- PGN export
- Порівняння прогресу по часу (accuracy trend)
