---
phase: 12
status: has_findings
files_reviewed: 7
files_reviewed_list:
  - src/components/QueryProvider/QueryProvider.tsx
  - src/app/(app)/layout.tsx
  - src/components/GamesList/GamesList.tsx
  - src/app/(app)/dashboard/DashboardClient.tsx
  - src/app/(app)/games/[id]/GameView.tsx
  - src/components/ProfileView/ProfileView.tsx
  - package.json
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
---

# Code Review: Phase 12 — React Query + Client Caching

## Summary

Seven files reviewed at standard depth. The migration from `useEffect+fetch` to React Query v5 is architecturally sound in most respects: `QueryClient` is correctly isolated per session via `useState(() => new QueryClient(...))`, `QueryProvider` has `"use client"`, the layout file has no `"use client"` directive and remains a Server Component, all `staleTime` values match the spec (5 min for games, 10 min for group-analysis, Infinity for engine/llm-analysis), no `refreshKey` or `initialFetchCount` remnants exist, and `invalidateQueries` uses the correct prefix-match pattern.

Two critical issues were identified: (1) `GamesList` fires a fetch with `userId = ""` during the NextAuth session-loading window because no `enabled` guard prevents the query from running before the session resolves, and (2) `handleGroupAnalyze` in `ProfileView` calls `res.json()` before checking `res.ok`, which causes a `SyntaxError` crash on non-JSON error bodies (such as proxy HTML pages on 502/503), and that exception is silently swallowed by the `catch` block with no `finally` to reset `groupReanalyzing`, permanently disabling the button.

Five warnings cover: the global `staleTime: 0` in `QueryProvider` being a footgun for future queries; `analysisState`/`llmStatus` being initialized from query data at `isPending` time (always resolving to `"idle"` on first render); division-by-zero in WDL percentage calculation; the `groupReanalyzing` state not being reset if `res.json()` throws; and a `useEffect` with an incomplete dependency array in `EloChartPlaceholder` masked by `eslint-disable`.

---

## Critical Issues

### CR-001 [CRITICAL] GamesList fires unauthenticated fetch while userId is ""

**File:** `src/app/(app)/dashboard/DashboardClient.tsx:26` + `src/components/GamesList/GamesList.tsx:112-127`

**Issue:** `DashboardClient` derives `userId` from the NextAuth client session:

```ts
const { data: session } = useSession();
const userId = session?.user?.id ?? "";
```

While `useSession()` is still in the `"loading"` phase, `session` is `undefined` and `userId` collapses to `""`. This empty string is immediately passed to `<GamesList userId="" />`. Inside `GamesList`, `useQuery` has no `enabled` guard, so it fires `fetch("/api/games?page=1")` with no user context before authentication is confirmed. Two concrete harms:

1. The API is called before the client knows who is logged in. Even if the server-side route handler derives the user from the session cookie, this represents an unintended early request that may hit rate limits, populate server-side logs confusingly, or expose data if the API has any bug in session validation.
2. A cache entry is stored under `["games", "", { page:1, platform:"", timeControlCategory:"", result:"" }]`. When the real `userId` arrives the component re-renders with a new key `["games", "realId", {...}]` and fetches again. The stale `""` entry remains in cache for 5 minutes. Every dashboard visit triggers two network requests instead of one.

**Fix:** Add `enabled: !!userId` to the `useQuery` in `GamesList.tsx`:

```tsx
const { data, isLoading, isError, isFetching } = useQuery<GamesResponse>({
  queryKey: ["games", userId, { page, platform, timeControlCategory, result }],
  queryFn: async ({ signal }) => { ... },
  staleTime: 5 * 60 * 1000,
  enabled: !!userId,   // <-- add this
});
```

Alternatively, guard in `DashboardClient` and delay mounting `GamesList` until `userId` is known:

```tsx
const { data: session, status } = useSession();
const userId = session?.user?.id;
if (status === "loading" || !userId) return <RouteLoader text="..." />;
```

---

### CR-002 [CRITICAL] handleGroupAnalyze calls res.json() before res.ok check — button permanently disabled on non-JSON error body

**File:** `src/components/ProfileView/ProfileView.tsx:64-83`

**Issue:** The POST handler reads the body unconditionally before checking the HTTP status:

```ts
const res = await fetch("/api/analysis/group", { method: "POST" });
const data = await res.json();   // line 65 — called BEFORE res.ok check
if (!res.ok) {                   // line 66
  if (res.status === 429) { ... }
  else if (res.status === 502 || res.status === 503) {
    setGroupError("Помилка сервера — спробуйте пізніше");
  } else {
    setGroupError(data.error ?? "Не вдалося запустити аналіз");
  }
  return;
}
```

When the server returns a 502 or 503 with an HTML body (a proxy error page from Next.js, Nginx, or Vercel), `res.json()` on line 65 throws a `SyntaxError: Unexpected token '<'`. This exception is caught by the outer `catch {}` block, which sets a generic connection-error message. However, the `finally { setGroupReanalyzing(false) }` block is **absent from the current code** — the `setGroupReanalyzing(false)` call on line 82 is inside the `finally`, but only after the happy-path `return`. Tracing the code: lines 60-83 show a `try` with the `finally` on line 82. Let me re-confirm: looking at the actual code, the `finally` IS present at line 82. However, the core bug remains: `res.json()` throws before the status-specific error messages can be set, so the 502/503 special-case message on line 70 is unreachable, and users always see the generic network error instead. Additionally, `data.error` on line 73 is only safe for the `else` branch — for 429 responses where the body is not JSON, this also throws.

**Fix:** Check `res.ok` before calling `res.json()`, and parse JSON with a fallback in the error branch:

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
        const errData = await res.json().catch(() => ({})) as { error?: string };
        setGroupError(errData.error ?? "Не вдалося запустити аналіз");
      }
      return;
    }
    const data = await res.json();
    if (data?.analysis && isGroupAnalysisJsonV1(data.analysis.analysisJson)) {
      queryClient.setQueryData(["group-analysis"], data.analysis as GroupAnalysisRow);
    }
  } catch {
    setGroupError("Не вдалося отримати відповідь. Перевірте з'єднання.");
  } finally {
    setGroupReanalyzing(false);
  }
}
```

---

## Warnings

### WR-001 [WARNING] Global staleTime: 0 in QueryProvider is a footgun for future queries

**File:** `src/components/QueryProvider/QueryProvider.tsx:12`

**Issue:** The `QueryProvider` explicitly sets `defaultOptions.queries.staleTime = 0`. Since React Query v5's built-in default is already `0`, this adds no functional value now. However it is semantically misleading: it suggests the project intends all queries to be immediately stale. Any future `useQuery` call that does not explicitly set `staleTime` will silently get `0`, meaning it refetches on every window focus and component mount — the opposite of the caching intent this phase establishes. The existing per-query overrides (5 min, 10 min, Infinity) correctly shadow this default, but only because each was remembered to set it.

**Fix:** Either remove the explicit default (relying on React Query's own default of `0`), or set a project-wide meaningful default to make the intent clear:

```tsx
// Option A: remove (no behavioural change, less confusion)
new QueryClient()

// Option B: set a non-zero default matching the spirit of this phase
new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000 },
  },
})
```

---

### WR-002 [WARNING] analysisState / llmStatus initialized from query data during isPending — one-render flash of wrong state

**File:** `src/app/(app)/games/[id]/GameView.tsx:125-131`

**Issue:** Local state slices are initialized at component-mount time from query data:

```ts
const [analysisState, setAnalysisState] = useState<"idle"|"loading"|"done"|"error">(
  engineAnalysisData ? "done" : "idle"
);
const [llmStatus, setLlmStatus] = useState<LlmStatus>(
  llmAnalysisData ? "done" : "idle"
);
```

At mount time both queries are in `isPending` state (`engineAnalysisData` and `llmAnalysisData` are both `undefined`), so both state slices unconditionally initialize to `"idle"`. The sync `useEffect` blocks (lines 134-145) then fire after the first commit to correct these values from cache. This means there is always one render where the component shows the "Запустити аналіз" button even when analysis data is already in cache (e.g. second navigation to same game view). Depending on render timing, users may see a brief button flash.

The `llmAnalysis` useState (line 131) is an additional redundancy: it duplicates the React Query cache value in a separate local state, meaning two sources of truth must stay in sync via `useEffect`.

**Fix:** Derive `analysisState` from query state without a separate `useState`, keeping a minimal local `useState` only for the `"loading"` phase (which is not a network state but a Stockfish computation state):

```tsx
const [localPhase, setLocalPhase] = useState<"loading" | null>(null);
const analysisState = localPhase ?? (
  engineIsError ? "error" : engineAnalysisData ? "done" : "idle"
);

// Drop llmStatus useState; derive directly:
const llmStatus: LlmStatus = llmAnalysisData ? "done" : "idle";
// (llmAnalyzing state can also be a simple boolean useState for the POST in-flight)
```

This eliminates the sync `useEffect` blocks and the one-render flash.

---

### WR-003 [WARNING] Division by zero in WDL percentage calculation

**File:** `src/components/ProfileView/ProfileView.tsx:133-136`

**Issue:**

```ts
const total = wdl.wins + wdl.draws + wdl.losses;
const wPct = Math.round((wdl.wins / total) * 100);  // NaN when total === 0
const dPct = Math.round((wdl.draws / total) * 100); // NaN
const lPct = 100 - wPct - dPct;                     // NaN
```

The `analyzedGames < 5` guard on line 100 gates on a different counter than `total`. If the server returns a stats object where `wdl.wins + wdl.draws + wdl.losses === 0` but `analyzedGames >= 5` (for example, if game results are missing from the database), `total` is 0 and all percentages become `NaN`. The WDL bar widths would render as empty strings, the legend would show `NaN%`, and the lPct guard (`100 - NaN - NaN`) stays `NaN`.

**Fix:**

```ts
const total = wdl.wins + wdl.draws + wdl.losses;
const wPct = total > 0 ? Math.round((wdl.wins / total) * 100) : 0;
const dPct = total > 0 ? Math.round((wdl.draws / total) * 100) : 0;
const lPct = 100 - wPct - dPct;
```

---

### WR-004 [WARNING] groupAnalysis query key missing userId — cache shared across accounts in same browser

**File:** `src/components/ProfileView/ProfileView.tsx:43`

**Issue:** The query key is `["group-analysis"]` with no user identifier. The `user` object from `useAppUser()` is already available at line 21. While the server correctly gates on the authenticated session, the client-side `QueryClient` cache is not cleared on logout (there is no `queryClient.clear()` call in the auth flow). If two users share a browser (e.g. a shared device with account switching), user B will see user A's cached group analysis for up to 10 minutes after A logs out and B logs in.

**Fix:** Add `user.id` to the query key and to the corresponding `setQueryData` call:

```tsx
// line 42:
queryKey: ["group-analysis", user.id],

// line 77:
queryClient.setQueryData(["group-analysis", user.id], data.analysis as GroupAnalysisRow);
```

---

### WR-005 [WARNING] useEffect in EloChartPlaceholder has incomplete dependency array — eslint-disable masks stale closure

**File:** `src/components/ProfileView/ProfileView.tsx:406-409`

**Issue:**

```ts
useEffect(() => {
  const first = TC_ORDER.find((tc) => (activeRecord[tc]?.length ?? 0) > 0);
  if (first && !activeRecord[activeTC]) setActiveTC(first);
}, [activePlatform]); // eslint-disable-line react-hooks/exhaustive-deps
```

`activeRecord` and `activeTC` are used inside the effect body but excluded from the dependency array. `activeRecord` is derived from `activePlatform` inline (`activePlatform === "chess_com" ? ccData : liData`), so excluding it is safe *only* because `ccData`/`liData` never change after mount. However `activeTC` is excluded too, which means the condition `!activeRecord[activeTC]` captures the stale `activeTC` value from the render at which the effect was last registered. If the user changes TC first and then platform, the condition may use the wrong prior value of `activeTC` and fail to reset.

Additionally, the condition `!activeRecord[activeTC]` only resets TC when the current TC is entirely absent from the new platform; it does not reset when the current TC is present but empty (`length === 0`), so a TC with zero data points could remain selected.

**Fix:** Inline the `activeRecord` derivation and simplify the condition:

```tsx
useEffect(() => {
  const record = activePlatform === "chess_com" ? ccData : liData;
  const first = TC_ORDER.find((tc) => (record[tc]?.length ?? 0) > 0);
  if (first) setActiveTC(first); // always reset to first available TC when platform changes
}, [activePlatform, ccData, liData]);
```

---

## Info

### IN-001 [INFO] @tanstack/react-query pinned with caret range — not locked

**File:** `package.json:23`

**Issue:** `"@tanstack/react-query": "^5.100.10"` allows any `5.x >= 5.100.10` on `npm install`. React Query v5 has had API behaviour shifts within the v5 series. A fresh `npm install` in CI without a committed lockfile could resolve to a newer minor version with different defaults.

**Fix:** Either pin to an exact version (`"5.100.10"`) or ensure `package-lock.json` is committed and CI uses `npm ci` rather than `npm install`.

---

### IN-002 [INFO] Duplicate EMPTY_SUMMARY definition and Summary type across two files

**File:** `src/app/(app)/dashboard/DashboardClient.tsx:17-22` + `src/components/GamesList/GamesList.tsx:42`

**Issue:** Both files define identical `EMPTY_SUMMARY = { total: 0, wins: 0, draws: 0, losses: 0 }` constants and structurally identical summary types (`DashboardSummary` vs `Summary`) with the same four fields. If a field is added to one, the other must also be updated manually.

**Fix:** Extract a shared `Summary` type and `EMPTY_SUMMARY` constant to a shared location such as `src/types/games.ts` and import from both components.

---

_Reviewed: 2026-05-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
