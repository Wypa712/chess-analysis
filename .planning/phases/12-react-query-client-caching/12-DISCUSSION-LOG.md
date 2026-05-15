# Phase 12: React Query + Client Caching - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 12-react-query-client-caching
**Areas discussed:** SSR integration strategy, Cache invalidation design, Migration scope

---

## SSR Integration Strategy

### Q1: How should React Query integrate with RSC initial data?

| Option | Description | Selected |
|--------|-------------|----------|
| initialData from RSC props | Pass RSC data as initialData to useQuery. No double-fetch. | ✓ |
| Keep RSC, add useQuery only for re-fetches | RSC handles first load; React Query only for manual triggers. | |
| Full client-only with useQuery | Remove RSC fetching, let useQuery handle everything. Spinner on first load. | |

**User's choice:** initialData from RSC props

---

### Q2: How to control freshness of initialData?

| Option | Description | Selected |
|--------|-------------|----------|
| initialDataUpdatedAt = Date.now() | Marks data as just-fetched; combined with staleTime prevents background refetch. | ✓ |
| staleTime: Infinity for SSR data | Data never stale; only refetches on explicit invalidation. | |
| Accept immediate background refetch | Default behavior — refetches right after mount. | |

**User's choice:** initialDataUpdatedAt = Date.now()

---

### Q3: Where should QueryClientProvider live?

| Option | Description | Selected |
|--------|-------------|----------|
| Root (app) layout | Single QueryClient for whole app — cache shared across all pages. | ✓ |
| Per-page wrapper | Isolated cache per section — loses cross-page cache benefit. | |

**User's choice:** Root (app) layout

---

### Q4: staleTime for games list?

| Option | Description | Selected |
|--------|-------------|----------|
| 60 seconds | Good balance of freshness and performance. | |
| 5 minutes | Fewer refetches; best for frequent page bouncing. | ✓ |
| You decide | Let planner choose. | |

**User's choice:** 5 minutes

---

## Cache Invalidation Design

### Q1: When to trigger cache invalidation?

| Option | Description | Selected |
|--------|-------------|----------|
| Invalidate on sync success | Call invalidateQueries after POST /api/sync completes. Explicit, immediate. | ✓ |
| staleTime: 30s + window focus | Implicit, simpler but may show stale data briefly. | |
| Manual refresh button | User-controlled. Extra UI, less automatic. | |

**User's choice:** Invalidate on sync success

---

### Q2: Query key structure?

| Option | Description | Selected |
|--------|-------------|----------|
| ['games', userId] | Simple flat key — easy to invalidate all game queries for user. | ✓ |
| ['games', userId, { filters }] | Per-filter-combination caching. More precise, more complex. | |
| You decide | Let planner pick. | |

**User's choice:** ['games', userId]

---

### Q3: Invalidate after analysis completes?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — invalidate specific game's analysis query | Invalidation call added to analysis completion callback. | ✓ |
| No — analysis results update UI directly | Leave existing state update flow as-is. | |
| You decide | Depends on migration scope. | |

**User's choice:** Yes — invalidate the specific game's analysis query

---

## Migration Scope

### Q1: Which parts to migrate?

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard + Game view API calls | Covers all 3 success criteria. Includes DashboardClient, GameView, GroupAnalysisPanel. | ✓ |
| Dashboard only | SC#1 + SC#3 covered. SC#2 not addressed. Lower risk. | |
| Dashboard + Game view + Profile | Full app migration. Higher scope/risk. | |

**User's choice:** Dashboard + Game view API calls

---

### Q2: GameView integration depth?

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap GET/POST API calls only, keep Stockfish worker as-is | Minimal diff, lower risk. | ✓ |
| Full refactor: React Query manages entire analysis lifecycle | Cleaner but major refactor. | |
| Skip game view analysis, only cache game metadata | Partial but safe. | |

**User's choice:** Wrap GET/POST API calls only, keep Stockfish worker logic as-is

---

### Q3: Include GroupAnalysisPanel?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — include it | Consistent caching behavior across all major client fetches. | ✓ |
| No — defer to later | Less frequently used. Lower risk. | |
| You decide | Planner assesses complexity. | |

**User's choice:** Yes — include it

---

## Claude's Discretion

- `staleTime` for game-view analysis queries (engine + LLM): planner should pick an appropriate long value. Since analysis results are immutable once computed, `staleTime: Infinity` or 30+ minutes is reasonable.

## Deferred Ideas

- Profile page stats migration to React Query — explicitly out of scope; could be a future polish item.
- Optimistic updates for sync status — more complex mutation config; deferred.
- React Query DevTools — dev-only optional dependency; planner discretion.
