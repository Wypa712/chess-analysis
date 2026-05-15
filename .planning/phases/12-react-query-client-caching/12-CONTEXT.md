# Phase 12: React Query + Client Caching - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Add React Query (@tanstack/react-query) as a client-side caching layer so navigating between pages does not re-fetch already-loaded data. The concrete problems to solve: the dashboard games list reloads on every return visit, and each game view visit re-requests engine and LLM analysis results.

Scope: DashboardClient (games list), GameView (engine-analysis and LLM-analysis GET/POST), and GroupAnalysisPanel (group analysis GET). Profile page is out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### SSR Integration Strategy
- **D-01:** Use `initialData` from RSC props — pass server-fetched data as `initialData` to `useQuery` in each client component. First render uses server data (no spinner on initial load). React Query takes over for subsequent navigations.
- **D-02:** Set `initialDataUpdatedAt: Date.now()` alongside `initialData` to prevent React Query from immediately treating server data as stale and triggering a background refetch on first mount.
- **D-03:** Place `QueryClientProvider` in the `(app)` layout (root layout for protected routes). Single shared QueryClient instance across the entire app — cache is preserved when navigating between dashboard, game view, and profile.
- **D-04:** `staleTime: 5 * 60 * 1000` (5 minutes) for the games list query. Data considered fresh for 5 minutes; background refetch only after staleTime expires.

### Cache Invalidation Design
- **D-05:** Invalidate on sync success — after `POST /api/sync` completes successfully in the sync handler (SyncStatusBar or equivalent), call `queryClient.invalidateQueries({ queryKey: ['games', userId] })` to force games list refresh.
- **D-06:** Query key structure: `['games', userId]` (flat, simple). Invalidating by this key clears the entire games list cache for the current user. Filter state is NOT part of the key — all filter combinations share one cache entry.
- **D-07:** After Stockfish/LLM analysis completes on a game page, invalidate the specific game's analysis query (e.g. `['game-analysis', gameId]`). The analysis completion callback already fires in the existing useStockfish/LLM flow — add an invalidation call there.

### Migration Scope
- **D-08:** Migrate: DashboardClient (games list fetch), GameView (engine-analysis GET + POST, LLM-analysis GET + POST), GroupAnalysisPanel (group analysis GET + POST trigger).
- **D-09:** For GameView: wrap only the GET/POST API calls in useQuery/useMutation. The Stockfish worker logic inside `useStockfish` hook stays unchanged — do not refactor the Web Worker lifecycle or analysis queue.
- **D-10:** GroupAnalysisPanel included in scope. Its `GET /api/analysis/group` fetch becomes a `useQuery` call for consistent caching behavior.

### Claude's Discretion
- staleTime for game-view analysis queries (engine + LLM): planner should pick appropriate values. Since analysis results never change once computed, `staleTime: Infinity` or a very long value (30+ minutes) is reasonable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Goal
- `.planning/ROADMAP.md` §"v2 Phase 4: React Query + Client Caching" — phase goal and success criteria

### Key Source Files to Understand Before Planning
- `src/app/(app)/dashboard/DashboardClient.tsx` — games list client component; primary migration target
- `src/app/(app)/games/[id]/GameView.tsx` — game view client component; engine + LLM fetch logic
- `src/components/SyncStatusBar.tsx` (or equivalent) — sync trigger; where invalidation call goes after sync success
- `src/app/(app)/layout.tsx` — where QueryClientProvider will be added
- `src/app/(app)/games/[id]/page.tsx` — RSC page; shows how initialData will be passed as props

### No External Specs
No external ADRs or specs — requirements fully captured in decisions above and ROADMAP.md success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/(app)/dashboard/DashboardClient.tsx` — existing `useEffect + useState + fetch` pattern that gets converted to `useQuery`. Already receives initial data as props from RSC page.
- `src/app/(app)/games/[id]/GameView.tsx` — same pattern; `summaryLoading` state and `useEffect` fetch for engine/LLM analysis will be replaced with `useQuery`/`useMutation`.
- `src/hooks/useStockfish.ts` — stays unchanged; only the API layer around it gets React Query wrappers.

### Established Patterns
- **Server Components as data fetching layer:** RSC `page.tsx` files call DB directly via Drizzle and pass data as props. This pattern is preserved — RSC provides `initialData` for the first render, React Query caches it for subsequent navigations.
- **Client Components fetch via `fetch('/api/...')`:** All client-side API calls target Next.js route handlers. React Query `queryFn` wraps these existing `fetch` calls — minimal changes to the API layer.
- **No global state library:** App currently uses React context (`AppUserContext`) + local useState. React Query adds server-state management without touching local UI state.

### Integration Points
- `src/app/(app)/layout.tsx` — add `<QueryClientProvider client={queryClient}>` wrapper here
- `DashboardClient` — add `useQuery(['games', userId], fetchGames, { initialData, initialDataUpdatedAt })`
- `SyncStatusBar` (sync completion callback) — call `queryClient.invalidateQueries(['games', userId])`
- `GameView` analysis fetch — add `useQuery(['engine-analysis', gameId], ...)` and `useQuery(['llm-analysis', gameId], ...)`

</code_context>

<specifics>
## Specific Ideas

- `initialDataUpdatedAt: Date.now()` is the key trick for SSR integration — without it, React Query ignores `initialData` staleness and refetches immediately on mount.
- Query keys use `userId` as a scope parameter to ensure users don't share cached data (even though that can't happen in practice with server-side auth, it's good practice).
- Stockfish worker logic is explicitly off-limits for this phase — it's complex and was recently refactored in Phase 10.

</specifics>

<deferred>
## Deferred Ideas

- Profile page stats migration to React Query — out of scope for this phase, could be added in a future polish pass.
- Optimistic updates for sync status — would require more complex mutation config; defer if it comes up.
- React Query DevTools — planner may include as a dev-only dependency; noted here as optional.

</deferred>

---

*Phase: 12-react-query-client-caching*
*Context gathered: 2026-05-15*
