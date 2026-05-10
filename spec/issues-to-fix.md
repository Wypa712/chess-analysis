# Issues to Fix — by Phase

Each phase = one prompt batch. Fix only still-valid issues after verifying against current code.

---

## Phase 1 — Documentation consistency (`spec/progress-tracker_old.md`)

### Issue 2 — line 5
**Phase 9 header says "(всі етапи)" but tasks 9-9–9-12 are unchecked**

The summary header claims all Phase 9 sub-tasks are done, but `[9-9]`, `[9-10]`, `[9-11]`, `[9-12]` are unchecked while only `[9-13]` is checked. Either update the header to reflect partial completion or mark the unchecked tasks as done.

### Issue 3 — lines 325–327
**⏳ used for phases already marked ✅ elsewhere**

"Фаза 7.0", "Фаза 7C", "Фаза 8" appear with ⏳ in the P0 priority list but are marked ✅ completed in their own sections. Replace ⏳ with ✅ for those three entries.

---

## Phase 2 — Auth layout guards (`src/app/dashboard/layout.tsx`, `src/app/settings/layout.tsx`)

### Issue 1 — `dashboard/layout.tsx` lines 19–23
**Non-null assertions `session.user!.id!` used without prior validation**

`session.user!.id!` is passed to the DB query and `session.user!` to `<AppShell>` without checking they exist. Add explicit guards; redirect or return a safe fallback if `session.user` or `session.user.id` is missing.

### Issue 18 — `settings/layout.tsx` lines 11–12
**`session.user` assumed present when only `session` is checked**

`<AppShell user={session.user!}>` renders without verifying `session.user`. If `!session.user`, redirect or render a fallback instead of asserting.

---

## Phase 3 — Chess-accounts API routes (`src/app/api/chess-accounts/`)

### Issue 4 — `reset/route.ts` lines 18–20
**DB delete not wrapped in try/catch**

If `db.delete(chessAccounts)` throws, the error bubbles unhandled. Wrap in try/catch, log the error, return HTTP 500 with a generic message on failure.

### Issue 5 — `route.ts` lines 45–57
**Mixed-language error messages**

"Invalid JSON" is English; all other messages are Ukrainian. Standardize all `NextResponse.json` error strings to Ukrainian.

### Issue 6 — `route.ts` lines 48–50
**No runtime type guard before destructuring `body`**

`body` is cast to `Record<string, unknown>` without checking it is a non-null plain object. Add guard (`typeof body === "object" && body !== null && !Array.isArray(body)`); return HTTP 400 if it fails.

---

## Phase 4 — Sync initial route (`src/app/api/sync/initial/route.ts`)

### Issue 8 — lines 60–63
**`cursorMs` computed without validating the parsed date**

An invalid cursor string produces `NaN`. Validate with `Number.isFinite`; if invalid, set `cursorMs` to `undefined` or return HTTP 400.

### Issue 7 — lines 90–95
**First-chunk detection uses `cursorMs` (falsy on 0/NaN) instead of the raw `cursor` value**

The `lastSyncedAt` update block runs when `!cursorMs`, which is true for both "no cursor" and "epoch 0 cursor". Check the original `cursor` variable for `undefined`/`null` instead.

---

## Phase 5 — Sync route (`src/app/api/sync/route.ts`)

### Issue 9 — line 29
**PostgreSQL-specific `NOW() - INTERVAL '60 seconds'` in SQL fragment**

Replace with a JS-computed cutoff: `new Date(Date.now() - 60_000)` passed as a Drizzle parameter.

### Issue 10 — lines 23–39
**TOCTOU race condition in the rate-limit check**

Two concurrent requests can both pass the check before either updates `lastSyncedAt`. Fix with an atomic DB-side guard: transaction + `SELECT … FOR UPDATE`, or `UPDATE … WHERE lastSyncedAt <= cutoff` checking affected rows.

### Issue 11 — lines 58–95
**`lastSyncedAt` updated per-account immediately even when later accounts fail**

Collect per-account outcomes first, then update `lastSyncedAt` only for accounts that succeeded (or wrap all updates in a transaction). Return per-account results in the response instead of only aggregate totals.

---

## Phase 6 — Onboarding page (`src/app/onboarding/`)

### Issue 13 — `page.module.css` lines 99–112
**Hard-coded `color: #fff` in `.continueBtn`**

Replace with the appropriate CSS variable (e.g., `var(--color-button-text)` or `var(--color-text-inverse)`).

### Issue 12 — `page.module.css` lines 114–117
**Hover `color: var(--color-bg)` on `var(--color-primary-hover)` may fail WCAG AA**

Verify contrast ratio ≥ 4.5:1; if it fails, replace `var(--color-bg)` with an accessible token (e.g., `--color-on-primary-hover`).

### Issue 17 — `page.tsx` line 22
**Shared `stopRef` causes cross-account cancellation**

Replace with a `Map<string, { stop: boolean }>` keyed by account id. `handleRemoveAccount` sets only the relevant entry; `runInitialImport` creates and cleans up its own entry.

### Issue 14 — `page.tsx` line 39
**Silent `break` on failed fetch — no user feedback**

Add an `error` field to `AccountProgress`, set it on non-OK responses (include `response.status`/text) and in the catch block; surface the message in the UI.

### Issue 16 — `page.tsx` lines 56–58
**Catch block silently swallows errors (`catch { break; }`)**

Log the error (`console.error`) and surface user-facing feedback (set error state) before breaking.

### Issue 15 — `page.tsx` lines 97–99
**`importPercent` uses only `activeProgress` — jumps when switching accounts**

Aggregate progress: `Math.min(Math.round((totalImported / (importingCount * MAX_INITIAL_GAMES)) * 100), 99)`.

---

## Phase 7 — Settings page (`src/app/settings/page.tsx`)

### Issue 19 — lines 15–23
**`useEffect` fetch can update state after unmount**

Add an `AbortController`, pass `signal` to fetch, call `controller.abort()` in cleanup. Guard state updates against abort errors.

### Issue 20 — lines 15–23
**Fetch errors silently swallowed; non-OK responses not checked**

Check `response.ok`; handle non-OK and network errors; set an error state for UI display. Ensure `setLoading(false)` runs in `finally`.

### Issue 21 — lines 36–48
**`handleDevReset` ignores failed DELETE responses**

Check `res.ok`, surface a user-visible error (alert or error state) with the response message or `statusText`. Ensure `setResetting(false)` runs in `finally`.

---

## Phase 8 — AccountForm component (`src/components/AccountForm/`)

### Issue 22 — `AccountForm.module.css` lines 112–115
**`.submitBtn:hover:not(:disabled)` sets `color: var(--color-bg)` — may be unreadable**

Replace with a contrasting token (e.g., `var(--color-on-primary)`) or `color: inherit`.

### Issue 26 — `AccountForm.tsx` lines 45–49
**No timeout on `fetch` — UI can hang indefinitely**

Add `AbortController` + timeout (5–10 s), pass `signal` to fetch, clear timer in finally, handle abort error with `setLoading(false)` and a message.

### Issue 25 — `AccountForm.tsx` lines 51–57
**`await res.json()` called before checking `res.ok`**

Check `res.ok` first. For non-OK responses read body safely (`res.text()` in try/catch) and call `setError`. Parse JSON only on success.

### Issue 23 — `AccountForm.tsx` line 60
**API response cast to `LinkedAccount` without runtime validation**

Add a runtime shape check before `onSuccess(data as LinkedAccount)`; show an error and skip the call if validation fails.

### Issue 24 — `AccountForm.tsx` lines 43–66
**Sequential per-platform POSTs; first failure aborts remaining platforms**

Use `Promise.allSettled` to post all platforms concurrently. Call `onSuccess` for each success; surface a summarized error listing failed platforms.

---

## Phase 9 — LinkedAccountCard component (`src/components/LinkedAccountCard/`)

### Issue 27 — `LinkedAccountCard.module.css` lines 45–66
**`.removeBtn` has no `:focus-visible` style**

Add `.removeBtn:focus-visible { outline: 2px solid var(--color-danger); outline-offset: 2px; }` after the existing hover/disabled rules.

### Issue 28 — `LinkedAccountCard.tsx` lines 36–44
**`handleRemove` swallows errors — no user feedback on failure**

On non-OK response or network error, surface a user-facing message (toast or error state) with status/text. Only call `onRemove(id)` when `res.ok`. Ensure `setRemoving(false)` runs in all paths.

---

## Phase 10 — SyncStatusBar component (`src/components/SyncStatusBar/SyncStatusBar.tsx`)

### Issue 32 — lines 53–61
**`useEffect` omits `runSync` from deps — stale closure over `onSynced`**

Store `onSynced` in a ref (update it in a `useEffect`). Make `runSync` read `onSyncedRef.current`. Include `runSync` in the outer effect's dependency array.

### Issue 30 — line 51
**`syncing` in `useCallback` deps causes unnecessary re-creation**

Remove `syncing` from the `useCallback` deps. Read the latest value from a ref if needed at runtime. Deps should be `[onSynced]` only.

### Issue 29 — lines 34–38
**HTTP 429 response skips `setError` — user sees no feedback**

Call `setError("Забагато запитів — спробуйте пізніше")` when `res.status === 429`; keep the existing message for other non-OK statuses.

### Issue 31 — line 31
**No timeout on `fetch("/api/sync", { method: "POST" })` — can hang indefinitely**

Add `AbortController` + timeout (10 s), pass `signal` to fetch, clear timer in finally, handle abort error with a user-facing message.
