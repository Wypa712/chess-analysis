# Chess Analysis App — Трекер прогресу (v2)

## 📊 Поточний статус

**Production:** ✅ Живий (Vercel + Neon + GitHub OAuth)  
**Поточна фаза:** Фаза 1 v2 — завершено (потребує ручного тестування)  
**Остання зміна:** 2026-05-11 — вирівняно кольори сторінки партії та scrollbar під оновлену палітру

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
- `POST /api/sync` — delta sync при вході/оновленні dashboard; watermark береться з останньої імпортованої партії
- `POST /api/sync/initial` — chunked initial import (50/chunk, cursor-based, до 1000 партій)
- DashboardLayout: redirect до /onboarding якщо нема chess_accounts
- SyncStatusBar: фоновий авто-синк при вході або оновленні dashboard без ручної кнопки
- Lichess importer: додано `until` cursor + `oldestPlayedAt` в response
- Chess.com importer: додано `until` filter + `oldestPlayedAt` в response
- Dashboard: ImportForm замінено на SyncStatusBar
- SidebarNav: додано пункт "Налаштування"
- Middleware: /onboarding і /settings додано до protected paths

#### Функціонал:

**Онбординг (перший вхід):**
- Сторінка налаштування профілю: вказати нік на Chess.com і/або Lichess
- Відразу після — автоматичний початковий імпорт (до **1000 партій**, chunked, не блокує UI)
- Прибрати ручний вибір діапазону/кількості; після онбордингу синхронізація йде фоново через dashboard

**Авто-синхронізація:**
- При кожному вході або оновленні dashboard: автоматично тягнути нові партії з підключених сервісів
- Виконується фоново після логіну / mount dashboard (не блокує redirect)
- Ручної кнопки "Оновити" в dashboard немає; користувач бачить лише статус фонового sync
- **Без cron** (Vercel Hobby обмежує до 1 раз/день — не підходить для hourly)

#### Технічні рішення:
- `chess_accounts` таблиця: `userId`, `platform`, `username`
- Порівняння по даті останньої партії для delta-sync
- Chunked import: порціями по ~50 партій щоб не впертись в 30s timeout
- Dev-only reset: `DELETE FROM chess_accounts WHERE user_id = ?` або кнопка в `/settings` (тільки `NODE_ENV=development`) для тестування онбордингу повторно

#### Узгоджені ревʼю-рішення (2026-05-10):
- Groq `llama-3.3-70b-versatile` є поточним primary LLM provider; spec оновлено під фактичну production-реалізацію.
- Профіль використовує фільтр періоду 7 / 30 / 90 днів або всі партії; фільтр 25 / 50 / 100 партій більше не є вимогою.
- Dashboard sync запускається автоматично при вході/оновленні dashboard; ручна кнопка "Оновити" прибрана з UX.

#### UI-поліровка (2026-05-10):
- Глобальна палітра стала менш монотонно-зеленою: додано teal/info/copper accents і трохи холодніші dark surfaces.
- Dashboard stat cards, sync bar, sidebar, games list і profile отримали різні акцентні кольори для кращої scanability.
- Favicon/PWA assets оновлено: SVG + PNG розміри для `public/` і `design-prototype/assets/`, manifests і head snippet синхронізовано під темний клітчастий фон з пішкою.
- UX-review fixes: список ходів знову лишається чистою PGN/SAN-навігацією без badges якості; dashboard лишає одну компактну позначку статусу аналізу без окремих Stockfish/LLM бейджів; аналіз партії запускається однією основною кнопкою, яка виконує Stockfish і LLM-поради в одному flow; оновлено застарілі empty/error тексти для sync, games list і group analysis.
- Dashboard sync status перенесено в компактний inline-pill у header, щоб не займати окремий вертикальний блок на desktop і mobile.
- Group analysis block приведено до загальної темної dashboard/profile естетики: прибрано теплий gold-фон, пом'якшено CTA, зменшено кількість явних borders у результатах аналізу.
- У group analysis result прибрано дублюючу кнопку "Повторити"; секції всередині результату отримали легкі divider-и для кращого читання без важких рамок.
- Верхній header group analysis відділено тонкою лінією від вмісту результату.
- Mobile profile ELO controls тепер переносяться в компактні рядки, щоб кнопки платформи й контролю часу не створювали горизонтальний overflow.
- Game review screen отримав м'якші teal/info акценти для дошки, active move, CTA, eval chart і best-move arrows; глобальний scrollbar приглушено, щоб він не виглядав надто зеленим.

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
