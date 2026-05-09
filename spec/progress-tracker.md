# Chess Analysis App — Трекер прогресу

## 📊 Поточний статус

**Завершено:** Фази 1–6.1, Фаза 7A, Фаза 7.0, Фаза 7B, Фаза 7C  
**Поточна фаза:** Фаза 8 — Тести критичної логіки (1 день)  
**Наступна фаза:** Фаза 9 — Полірування + деплой (2 дні)  
**Останнє ревью:** 2026-05-07 — Загальна оцінка **5.3/10**

---

## 🎯 Timeline до production

```
┌──────────────────────────────────────────────────────┐
│ 7B — Функціонал профілю ✅ ЗАВЕРШЕНО                │
├──────────────────────────────────────────────────────┤
│ • API /api/profile/stats                            │
│ • Підключення реальних даних                        │
│ • Перенесення GroupAnalysisPanel                    │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 7C — Рефакторинг GameView (1-2 дні) ⚠️ КРИТИЧНО    │
├──────────────────────────────────────────────────────┤
│ • Розбити 1432 рядки на 3 компоненти                │
│ • EvalSection, ExplorePanel, LlmTabsPanel           │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 8 — Тести критичної логіки (1 день)                 │
├──────────────────────────────────────────────────────┤
│ • engine-analysis, importers, API routes            │
│ • Component тести для нових компонентів             │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 9 — Полірування + деплой (2 дні)                    │
├──────────────────────────────────────────────────────┤
│ • Retry + Sentry + /api/health                      │
│ • Vercel staging → production                       │
└──────────────────────────────────────────────────────┘

⏱️ Загальний час: 5-7 днів до production
```

---

## ✅ Завершені фази

### Фаза 1 — Фундамент і авторизація
- Next.js 15 + TypeScript strict mode
- NextAuth.js v5 (JWT strategy, GitHub OAuth)
- Neon database + Drizzle ORM
- Зелена палітра, DM Sans/Mono
- Sidebar (desktop) + bottom nav (mobile)

### Фаза 2 — Імпорт і список партій
- Імпорт з Chess.com і Lichess
- Режими: за кількістю (25/50/100) або періодом (7/30/90 днів)
- Пагінований список з фільтрами
- Статус аналізу для кожної партії

### Фаза 3 — Перегляд однієї партії
- Маршрут `/games/[id]`
- react-chessboard з навігацією (клавіатура + кнопки)
- Player badges, opening footer
- Адаптивна верстка (desktop side-by-side, mobile stacked)

### Фаза 4 — Stockfish game review
- Stockfish WASM (depth 15, `stockfish` npm v16)
- Eval bar, eval graph (власний SVG), accuracy strip
- Класифікація ходів (best/good/inaccuracy/mistake/blunder)
- Key moments (втрата ≥ 150cp)
- Best move arrow, іконки якості на дошці
- Кешування в `engine_analyses`

### Фаза 4.5 — Explore mode
- Drag-to-explore (без окремої кнопки)
- Breadcrumb bar з drag-to-scroll
- Stockfish для варіантів (окремий worker)
- Auto-exit при навігації по main line

### Фаза 4.6 — UX-покращення review
- `[` / `]` навігація між key moments
- Phase accuracy (дебют/мідлгейм/ендшпіль)
- MultiPV top-3 (candidates panel)
- Mobile touch-targets для chart dots

### Фаза 5 — LLM-аналіз однієї партії
- Groq API (`llama-3.3-70b-versatile`)
- Таб-система "Ходи / Аналіз / Поради"
- Критичні моменти (клікабельні → seekMainline)
- Кешування в `game_analyses`
- Rate limiting 30s

### Фаза 6 — Груповий LLM-аналіз
- Кнопка "Груповий аналіз" (останні 30 партій)
- `GroupAnalysisPanel` (patterns, weaknesses, openings, action plan)
- POST `/api/analysis/group` з Groq
- Кешування в `group_analyses`
- Rate limiting 60s

### Фаза 6.1 — Ревью-фікси
**P0 (3 задачі):**
- `type="button"` на кнопках
- AbortController для Groq timeout
- Groq client на рівні модуля

**P1 (6 задач):**
- SQL-based rate-limit
- system/user role split у промптах
- GET-валідація group analysis
- DISTINCT ON у buildGameSummaries
- Silent catch фікси

**P2 (4 задачі):**
- endgame.summary тип-чек
- max_tokens для Groq
- useMemo для EvalChart
- Видалення type re-export

### Фаза 7A — Верстка профілю
- Маршрут `/profile`
- Hero (аватар, акаунти, лічильник партій)
- Фільтри (count/period)
- WDL stacked-bar
- Картки за кольором і контролем часу
- Топ-5 дебютів з мінібарами
- ELO-графік placeholder
- Секція групового аналізу (empty state)

### Фаза 7.0 — Документація і базові тести
- `README.md` з повним описом, setup інструкціями, development workflow
- `.env.example` template
- Vitest setup (vitest + @vitest/ui)
- Unit-тести для `isLlmGameAnalysisV1` і `isGroupAnalysisJsonV1` (29 тестів, всі пройшли)
- Test scripts: `npm run test`, `npm run test:ui`, `npm run test:run`

### Фаза 7B — Функціонал профілю
- API endpoint `GET /api/profile/stats` з фільтрами (count/period)
- Підключення реальних даних до всіх секцій ProfileView
- WDL chart, картки за кольором і контролем часу
- Секція дебютів (топ-5 з win rate)
- ELO-графік (Chess.com і Lichess окремо)
- Перенесення GroupAnalysisPanel з GamesList на /profile
- Empty state для профілю (мінімум 5 партій)
- URL search params для фільтрів
- Skeleton states під час завантаження

---

## 🚧 Поточні фази

### Фаза 7C — Рефакторинг GameView ✅ ЗАВЕРШЕНО

- [x] **[7C-1]** `EvalSection` — panelHeader, EvalChart, accuracyStrip (353 рядки)
- [x] **[7C-2]** `ExplorePanel` — breadcrumb, drag-to-scroll (101 рядок)
- [x] **[7C-3]** `LlmTabsPanel` — таб-система, moves list, LlmAnalysis (198 рядків)
- [x] **[7C-4]** `GameView.tsx` скорочено: 1452 → 778 рядків (-46%)
- [x] **[7C-5]** `icons.tsx` — всі 7 SVG іконок винесено окремо
- [x] **[7C-6]** `types.ts` — спільні типи GameData, ExploreMove, MovePair тощо
- TypeScript `tsc --noEmit` — 0 помилок

---

## 🧪 Майбутні фази

### Фаза 8 — Тести критичної логіки (1 день)

- [ ] **[8-1]** Unit-тести `lib/chess/engine-analysis.ts`
- [ ] **[8-2]** Unit-тести `lib/importers/`
- [ ] **[8-3]** Integration тести API routes (MSW для Groq)
- [ ] **[8-4]** Component тести (EvalSection, ExplorePanel, LlmTabsPanel)

### Фаза 9 — Полірування і деплой (2 дні)

- [ ] **[9-1]** Стани завантаження
- [ ] **[9-2]** Empty states
- [ ] **[9-3]** Обробка помилок імпорту
- [ ] **[9-4]** Обробка LLM-помилок + retry UI
- [ ] **[9-5]** Retry з exponential backoff для Groq
- [ ] **[9-6]** `inputHash` для дедуплікації group analyses
- [ ] **[9-7]** Sentry integration
- [ ] **[9-8]** `/api/health` endpoint
- [ ] **[9-9]** Production env vars (Vercel)
- [ ] **[9-10]** Neon production database
- [ ] **[9-11]** Vercel staging deploy
- [ ] **[9-12]** Smoke tests (імпорт → аналіз → профіль)
- [ ] **[9-13]** Production deploy

---

## 🎯 Топ-10 пріоритетів перед production

### P0 — Блокери
1. ✅ Фаза 6.1 — всі P0/P1/P2 виправлено
2. ⏳ Фаза 7.0 — README + тести (1.5 год)
3. ⏳ Фаза 7C — розбити GameView.tsx
4. ⏳ Фаза 8 — тести критичної логіки

### P1 — Важливі
5. ⏳ Фаза 9 — Sentry
6. ⏳ Фаза 9 — `/api/health`
7. ⏳ Фаза 9 — Retry для Groq
8. ⏳ Фаза 9 — `inputHash` дедуплікація

### P2 — Після production
9. 🔮 React Query для кешування
10. 🔮 LLM client абстракція

---

## ⚠️ Ризики для моніторингу

- [ ] **Chess.com rate limits** — можливі 429 при масовому імпорті
- [ ] **Stockfish WASM performance** — depth 15 може зависати на слабких пристроях
- [ ] **Vercel hobby timeout 10s** — ризик для Groq на 30 партій (потрібен retry)
- [ ] **Обмежене тестове покриття** — unit тести реалізовані для isLlmGameAnalysisV1 і isGroupAnalysisJsonV1, але інші модулі потребують додаткового покриття (GameView.tsx, engine-analysis.ts, importers)
- [ ] **GameView.tsx 1432 рядки** — ризик регресій при змінах

**Закрито:**
- ✅ Lichess NDJSON streaming — працює
- ✅ Gemini limits — замінено на Groq
- ✅ NextAuth v5 setup — налаштовано

---

## 📝 Ключові архітектурні рішення

| Дата | Рішення |
|------|---------|
| 2026-05-02 | NextAuth JWT strategy (без `auth_sessions`) |
| 2026-05-02 | Stockfish depth 15, без time limit, profile `default-v1` |
| 2026-05-02 | Імпорт: за кількістю (25/50/100) або періодом (7/30/90), default 25 |
| 2026-05-03 | Move list без badges якості — іконки тільки на дошці |
| 2026-05-03 | Eval graph — власний SVG (без recharts) |
| 2026-05-04 | Explore mode — drag-to-explore без окремої кнопки |
| 2026-05-05 | LLM-секція у таб-системі (відхилення від spec, UX-зручніше) |
| 2026-05-06 | Groq API замість Gemini (`llama-3.3-70b-versatile`) |
| 2026-05-06 | Груповий аналіз — останні 30 партій автоматично (без чекбоксів) |
| 2026-05-07 | **Гібридний підхід до фіксів:** README + тести зараз, решта після 7C |
| 2026-05-07 | **Фаза 7C обов'язкова перед Фазою 8** — розбити GameView на компоненти |
| 2026-05-07 | **Фаза 7B завершена** — API /api/profile/stats, реальні дані, GroupAnalysisPanel на /profile |

---

## 📊 Результати ревью (2026-05-07)

**Загальна оцінка: 5.3/10**

| Категорія | Оцінка | Коментар |
|-----------|--------|----------|
| Архітектура | 7/10 | Чітка структура, але GameView.tsx 1432 рядки |
| Безпека | 6/10 | Ownership checks є, але немає CSRF і input validation |
| Продуктивність | 5/10 | Groq client на модулі ✅, але немає кешування |
| Якість коду | 6/10 | TypeScript strict, але magic numbers і дублювання |
| Тестування | 0/10 | **КРИТИЧНО** — нульове покриття |
| Документація | 4/10 | Spec є, але немає README |
| Готовність до деплою | 4/10 | Потрібні тести, Sentry, retry |

---

## 📚 Відкриті питання

- [ ] LLM-аналіз має вимагати Stockfish analysis, чи дозволяти PGN-only?

**Закрито:**
- ✅ Профіль об'єднує платформи, ELO-графіки роздвоєні
- ✅ Stockfish depth 15, без time limit
