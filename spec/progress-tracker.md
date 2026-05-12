# Chess Analysis App — Трекер прогресу (v2)

## 📊 Поточний статус

**Production:** ✅ Живий (Vercel + Neon + GitHub OAuth)  
**Поточна фаза:** Фаза 1 v2 — завершено (потребує ручного тестування)  
**Остання зміна:** 2026-05-12 — згладжено mobile route transitions і закрито mobile overflow на auth screens

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

#### Review fixes (2026-05-11):
- Group LLM analysis cache тепер хешує реальні summaries + model/prompt version, а не тільки `gameIds`, тому оновлений Stockfish/LLM контекст не повертає застарілий cached result.
- Додано `llm_request_locks` TTL-таблицю і міграції для короткого DB-lock навколо game/group LLM-запитів, щоб паралельні POST-и не запускали дубльовані Groq-виклики.
- Individual game LLM analysis тепер зберігає `input_hash` для PGN/game metadata + Stockfish context + prompt version.
- Profile stats більше не ріже 7/30/90-денні метрики прихованим limit 500; агрегації рахуються по всьому вибраному періоду.
- Dashboard DB failure тепер проходить через Next error boundary, замість redirect на неіснуючий `/error`.
- Mobile opening footer на сторінці аналізу більше не накладається absolute-ом на tab content; довга назва дебюту акуратно обрізається в нижньому рядку панелі.
- Прибрано невикористану залежність `@google/generative-ai`, оскільки production LLM provider зараз Groq.
- PWA icon refresh: згенеровано новий SVG/PNG комплект із v2 filename-ами для manifest/apple/favicon, щоб мобільні install flows не тримали старі кешовані іконки.

#### PWA icon update (2026-05-12):
- Favicon/PWA assets оновлено на погоджену прозору crown-іконку без темного квадратного фону; нижня декоративна лінія вирівняна лівіше згідно з референсом.
- Додано cache-busted `v3` SVG/PNG комплект для favicon, Apple touch icon і PWA manifest у `public/`; `src/app/layout.tsx`, `src/app/manifest.ts`, `public/manifest.webmanifest` і `design-prototype/assets/manifest.webmanifest` переведено на `v3`.
- Прибрано старі `src/app/icon.tsx` і `src/app/apple-icon.tsx`, щоб Next metadata не генерувала паралельні іконки зі старим дизайном.

#### Mobile UI fix (2026-05-12):
- Skeleton rows у `GamesList` на mobile тепер використовують ті самі grid columns для side/status зон, що й реальні рядки партій; прибрано криве автопозиціонування заглушок на вузьких екранах.
- AppShell тепер скидає scroll внутрішнього content-контейнера при переході між routes, додає легкий enter-перехід і стабілізує mobile viewport/bottom-nav safe area, щоб навігація між сторінками на телефоні не смикалась.
- Під час mobile UX-аудиту знайдено horizontal overflow на стартовій і login-сторінках; hero/card/text отримали viewport-bound max-width, `min-width: 0` і коректні переноси, а global layout блокує випадковий horizontal scroll.

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
