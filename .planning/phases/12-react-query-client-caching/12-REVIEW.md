---
phase: 12-react-query-client-caching
reviewed: 2026-05-15T12:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/components/QueryProvider/QueryProvider.tsx
  - src/app/(app)/layout.tsx
  - src/app/(app)/dashboard/DashboardClient.tsx
  - src/components/GamesList/GamesList.tsx
  - src/components/SyncStatusBar/SyncStatusBar.tsx
  - src/app/(app)/games/[id]/GameView.tsx
  - src/components/ProfileView/ProfileView.tsx
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-05-15T12:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Фаза 12 впроваджує React Query v5 як шар клієнтського кешування для трьох основних ресурсів: списку партій на дашборді (`/api/games`), аналізу партії (`/api/games/:id/engine-analysis`, `/api/games/:id/analyze`) та групового аналізу (`/api/analysis/group`).

Загальна архітектура коректна: `QueryClient` ізольований через `useState(() => new QueryClient(...))`, `QueryProvider` є `"use client"` компонентом, layout залишається Server Component. Патерн `useQuery` + `setQueryData` після POST застосовано послідовно.

Виявлено **2 критичні проблеми**: дубльований стан між React Query та `useState` у `GameView.tsx` призводить до десинхронізації при навігації, а помилки POST-запиту в `ProfileView.tsx` замовчуються (відповідь читається до перевірки `res.ok`). Виявлено **4 попередження**: неправильне розуміння `isPending` vs `isLoading` у `GamesList`, витік AbortError у `GameView`, відсутність `retry: false` для ресурсів де помилка є нормальним станом, та вразливість до `userId === ""` при invalidation.

---

## Critical Issues

### CR-01: Дублювання стану між useQuery та useState у GameView — десинхронізація при навігації з кешу

**File:** `src/app/(app)/games/[id]/GameView.tsx:125-131`

**Issue:** Компонент ініціалізує `analysisState` та `llmStatus` через `useState` з поточним значенням `engineAnalysisData`/`llmAnalysisData` у момент першого рендеру. Але React Query v5 при `staleTime: Infinity` повертає дані з кешу **синхронно** (до першого render commit), тобто під час SSR-гідратації `engineAnalysisData` завжди `undefined`. Результат: при навігації назад на сторінку партії (коли кеш вже заповнений) `useState(engineAnalysisData ? "done" : "idle")` ініціалізується як `"idle"`, а `useEffect` для синхронізації (рядки 134-137) запускається лише після commit. Між цими моментами компонент відрендериться зі станом `"idle"` попри наявні дані — кнопка "Запустити аналіз" миготить замість відображення "Аналіз готовий".

Крім того, `llmAnalysis` зберігається у двох місцях одночасно: в React Query кеші (`llmAnalysisData`) та в `useState<LlmGameAnalysisV1 | null>` (рядок 131). Після успішного `handleLlmAnalyze` обидва оновлюються незалежно, що робить `llmAnalysis` стан надлишковим та потенційно застарілим.

**Fix:** Прибрати дублюючий `useState` для `llmAnalysis` — використовувати `llmAnalysisData` безпосередньо:

```tsx
// Замість двох окремих useState — derive стан з query data
const analysisState: "idle" | "loading" | "done" | "error" = useMemo(() => {
  if (engineIsError) return "error";
  if (engineAnalysisData) return "done";
  return "idle"; // local overrides (loading) handled via localAnalysisState
}, [engineAnalysisData, engineIsError]);

// llmAnalysis — читати тільки з кешу, без окремого useState
const llmAnalysis = llmAnalysisData ?? null;
```

Або якщо потрібен стан `"loading"` під час Stockfish-обчислення (який не є мережевим), зберігати лише `localAnalysisPhase` для проміжних станів і перевизначати його похідним станом з query:

```tsx
const [localPhase, setLocalPhase] = useState<"loading" | null>(null);
const analysisState = localPhase ?? (engineIsError ? "error" : engineAnalysisData ? "done" : "idle");
```

---

### CR-02: Читання тіла відповіді до перевірки res.ok у ProfileView — замовчування помилок POST

**File:** `src/components/ProfileView/ProfileView.tsx:64-75`

**Issue:** У `handleGroupAnalyze` виклик `res.json()` відбувається **до** перевірки `!res.ok`. Це означає:
1. Якщо сервер повернув помилковий статус з тілом не у форматі JSON (наприклад, HTML-сторінка помилки від Next.js або Nginx при 502), `res.json()` кине виключення, яке **не** обробляється у блоці `if (!res.ok)` — воно потрапить у `catch {}`, де встановлюється лише загальне "Не вдалося отримати відповідь", а не конкретне повідомлення для 429 або 502/503.
2. При статусі 429 код `data.error` може бути `undefined` (деякі rate-limit відповіді не мають тіла) — тоді замість правильного повідомлення виводиться `undefined`.

```ts
// Поточний порядок (НЕПРАВИЛЬНИЙ):
const data = await res.json();   // може кинути виключення якщо тіло не JSON
if (!res.ok) {
  // data.error може бути undefined
}
```

**Fix:** Перевіряти статус до читання тіла; парсити JSON з fallback:

```tsx
async function handleGroupAnalyze() {
  setGroupReanalyzing(true);
  setGroupError(null);
  try {
    const res = await fetch("/api/analysis/group", { method: "POST" });
    if (!res.ok) {
      if (res.status === 429) {
        setGroupError("Ліміт запитів вичерпано — зачекайте хвилину перед повторним аналізом.");
      } else if (res.status === 502 || res.status === 503) {
        setGroupError("Помилка сервера — спробуйте пізніше");
      } else {
        const errData = await res.json().catch(() => ({}));
        setGroupError((errData as { error?: string }).error ?? "Не вдалося запустити аналіз");
      }
      return;
    }
    const data = await res.json();
    // ... решта обробки
  } catch {
    setGroupError("Не вдалося отримати відповідь. Перевірте з'єднання.");
  } finally {
    setGroupReanalyzing(false);
  }
}
```

---

## Warnings

### WR-01: Використання isPending замість isLoading у GamesList — показує лоадер при фонових рефетчах

**File:** `src/components/GamesList/GamesList.tsx:112,191`

**Issue:** `useQuery` повертає `isPending: true` лише коли немає жодних кешованих даних (перший завантаження). Але у рядку 191 умова `isLoading && !data` є зайвою страховкою — і водночас хибно використовує `isLoading`. У React Query v5 `isLoading = isPending && isFetching`. Тут використовується `isLoading` для показу лоадера, але при перемиканні фільтрів (нова сторінка/платформа) `isLoading` буде `true` ще раз (немає кешу для нового ключа), а `isFetching` використовується для показу ефекту dimming (рядок 230). Логіка змішана: для першого завантаження треба `isPending`, для фонового оновлення — `isFetching && !!data`.

```tsx
// Рядок 191: правильно використовувати isPending замість isLoading
{isPending && (
  <RouteLoader inline text="Завантажуємо партії…" />
)}

// Рядок 195: якщо isPending — ще немає даних, тому isError без !isLoading коректне
{!isPending && isError && (
  <div className={styles.empty}>...</div>
)}
```

**Fix:** Замінити `isLoading` на `isPending` в умовах відображення лоадера і станів помилки/порожнього стану (рядки 191, 195, 202, 218):

```tsx
const { data, isPending, isError, isFetching } = useQuery<GamesResponse>({ ... });

// Лоадер тільки при першому завантаженні (немає кешу):
{isPending && <RouteLoader inline text="Завантажуємо партії…" />}

// Помилка тільки якщо не завантажуємо:
{!isPending && isError && (...)}

// Порожній стан:
{!isPending && !isError && data?.games.length === 0 && hasActiveFilters && (...)}
{!isPending && !isError && data?.games.length === 0 && !hasActiveFilters && (...)}
```

---

### WR-02: AbortError від скасованих useQuery запитів потрапляє у стан помилки GameView

**File:** `src/app/(app)/games/[id]/GameView.tsx:98-106`

**Issue:** `queryFn` для `engine-analysis` кидає `Error("Не вдалося завантажити аналіз двигуна")` при будь-якому `!r.ok`. Але якщо `signal` скасовується (наприклад, користувач швидко переходить між сторінками), React Query автоматично скасовує in-flight запит — `fetch` кидає `AbortError`. З `retry: 1` React Query спробує ще раз (а AbortError при cleanup буде знову). Кінцевий результат — `engineIsError: true`, що переводить `analysisState` у `"error"` через `useEffect` (рядок 136). Користувач бачить помилку аналізу замість нейтрального стану.

Для `llm-analysis` та `engine-analysis` запитів AbortError слід не вважати реальною помилкою:

**Fix:**

```tsx
queryFn: async ({ signal }) => {
  const r = await fetch(`/api/games/${game.id}/engine-analysis`, { signal });
  if (!r.ok) throw new Error("Не вдалося завантажити аналіз двигуна");
  const d = await r.json();
  return (d?.analysis && isEngineAnalysisJsonV1(d.analysis)) ? d.analysis as EngineAnalysisJsonV1 : null;
},
// Не ретраювати скасовані запити:
retry: (failureCount, error) => {
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  return failureCount < 1;
},
```

---

### WR-03: invalidateQueries з userId === "" може інвалідувати кеш іншого користувача або не спрацювати

**File:** `src/app/(app)/dashboard/DashboardClient.tsx:41`

**Issue:** `userId` ініціалізується як `session?.user?.id ?? ""`. При першому рендері `useSession()` повертає `status: "loading"` і `session` є `undefined`, тому `userId = ""`. Якщо `onSynced` (і відповідно `handleSynced`) викликається до того, як сесія завантажилась (малоймовірно, але можливо при дуже швидкій синхронізації), `invalidateQueries({ queryKey: ["games", ""] })` не знайде жодного запиту у кеші (бо ключ `["games", realUserId, {...}]`), і інвалідація мовчки не спрацює — новоімпортовані партії не відобразяться.

Також `GamesList` отримує `userId=""` і запускає `useQuery` з ключем `["games", "", {...}]`. Якщо пізніше userId завантажується — це окремий запит у кеші, а старий `["games", "", ...]` залишається.

**Fix:** Не запускати `GamesList` поки `userId` не відомий:

```tsx
// DashboardClient.tsx
const { data: session, status } = useSession();
const userId = session?.user?.id;

if (status === "loading" || !userId) {
  return <RouteLoader text="Завантажуємо дашборд…" />;
}

// Тепер userId — завжди непорожній рядок
```

---

### WR-04: queryKey ['group-analysis'] без userId — кеш не прив'язаний до користувача

**File:** `src/components/ProfileView/ProfileView.tsx:43`

**Issue:** Ключ `["group-analysis"]` не містить ідентифікатора користувача. Хоча API правильно перевіряє auth, **кеш у браузері** є спільним для всього `QueryClient` сеансу. Це не проблема у звичайному сценарії (один користувач = один браузер), але якщо два акаунти входять та виходять (наприклад, в одному браузері), груповий аналіз попереднього користувача відобразиться наступному до закінчення 10-хвилинного `staleTime`.

`QueryClient` не скидається при logout — це архітектурне рішення яке варто задокументувати або усунути.

**Fix:** Додати userId до ключа:

```tsx
const { data: groupAnalysisData, ... } = useQuery({
  queryKey: ["group-analysis", user.id], // user з useAppUser() вже доступний
  ...
});

// При setQueryData теж:
queryClient.setQueryData(["group-analysis", user.id], data.analysis as GroupAnalysisRow);
```

Або очищати QueryClient при logout: `queryClient.clear()`.

---

## Info

### IN-01: console.warn залишено у production-коді GameView

**File:** `src/app/(app)/games/[id]/GameView.tsx:407,409`

**Issue:** Два `console.warn` для діагностики невдалого збереження аналізу залишені у production-шляху. Це нормально для налагодження, але засмічує production консоль.

**Fix:** Якщо збереження некритичне — прибрати або замінити на `if (process.env.NODE_ENV === 'development') console.warn(...)`.

---

### IN-02: useEffect з порожнім масивом залежностей для cleanup terminate() без eslint-disable

**File:** `src/app/(app)/games/[id]/GameView.tsx:344-347`

**Issue:**

```tsx
useEffect(() => {
  return () => terminate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Коментар `eslint-disable` свідчить що `terminate` не додано у залежності. Якщо `terminate` зміниться між рендерами (нестабільна референція з `useStockfish`), cleanup закриє застарілу версію. Зазвичай це нешкідливо для singleton Web Worker, але варто перевірити стабільність `terminate`.

**Fix:** Стабілізувати `terminate` у `useStockfish` через `useCallback` (якщо ще не зроблено) та прибрати eslint-disable:

```tsx
useEffect(() => {
  return () => terminate();
}, [terminate]); // якщо terminate стабільний
```

---

### IN-03: Зайвий useEffect без залежностей activeRecord у EloChartPlaceholder

**File:** `src/components/ProfileView/ProfileView.tsx:406-409`

**Issue:**

```tsx
useEffect(() => {
  const first = TC_ORDER.find((tc) => (activeRecord[tc]?.length ?? 0) > 0);
  if (first && !activeRecord[activeTC]) setActiveTC(first);
}, [activePlatform]); // eslint-disable-line react-hooks/exhaustive-deps
```

`activeRecord` не включено у залежності (через eslint-disable). Якщо `activeRecord` зміниться незалежно від `activePlatform` (наприклад, props оновляться), reset не спрацює. Крім того умова `!activeRecord[activeTC]` не скидає TC до першого доступного коли поточний TC просто відсутній на новій платформі — замість першого доступного TC залишиться старий неіснуючий.

**Fix:**

```tsx
useEffect(() => {
  const first = TC_ORDER.find((tc) => (activeRecord[tc]?.length ?? 0) > 0);
  if (first) setActiveTC(first); // завжди скидати до першого доступного при зміні платформи
}, [activePlatform]); // activeRecord є похідним від activePlatform, тому нормально
```

---

_Reviewed: 2026-05-15T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
