# Story 5.4: Navigation State Preservation & Caching

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an end user,
I want my scroll position, filter state, and table sort to be preserved when I switch between modules,
so that returning to a module feels instant and I don't lose my place.

## Acceptance Criteria

1. **AC1 — Cached data renders instantly on return visit.** Given a user is viewing a filtered, sorted table in module A, when the user navigates to module B via the sidebar, then module A's component is unmounted but its projection data remains in the ETag cache (in-memory). When the user returns to module A within the same session and the cached data is less than 5 minutes old, then the page renders instantly from cache — no loading skeleton — and filter and sort state are restored from URL search params.

2. **AC2 — Stale data shows refresh indicator.** Given the user returns to module A with stale data (> 5 minutes old), when the page renders, then cached data is shown immediately with a small inline refresh indicator in the page header area (e.g., a spinning icon or "Refreshing..." text using `--color-text-tertiary`) — not a full-page skeleton. Data revalidates in the background, and when fresh data arrives, the view updates in-place silently.

3. **AC3 — First visit shows content-aware skeleton.** Given a user visits a module for the first time in the session, when the module loads, then a content-aware skeleton is displayed for a minimum 300ms to prevent flicker, content replaces skeleton with a single crossfade transition, and subsequent polling updates render in-place (no skeleton re-entry).

4. **AC4 — Scroll position restored on return.** Given a user scrolled to a specific position in a module, when the user navigates away and returns, then the scroll position is restored to where the user left off.

5. **AC5 — Filter/sort state persisted in URL.** Given a user has applied filters and sort to a table in module A, when the user navigates to module B and returns (or refreshes the browser), then filter and sort state are restored from URL search params (e.g., `?status=overdue&sort=date`), surviving both in-session navigation and browser refresh.

6. **AC6 — App version change clears cache.** Given the deployed shell version changes, when the shell detects a version mismatch (via `<meta>` tag in `index.html`), then the projection cache (ETag cache) is cleared entirely to prevent stale schemas from crashing components.

7. **AC7 — Browser back/forward works correctly.** Given browser back/forward navigation is used, when the user presses the browser back button, then the shell router manages history entries correctly and the previous module's state is restored (cached data + scroll position + filter/sort params).

*FRs covered: FR26*

## Tasks / Subtasks

- [ ] Task 1: Add timestamp tracking to ETag cache (AC: #1, #2)
  - [ ] 1.1: Update `packages/cqrs-client/src/queries/etagCache.ts`:
    - Extend `CacheEntry` with `timestamp: number` (Date.now() at storage time)
    - Add `getAge(key: string): number | undefined` method to `ETagCache` interface — returns milliseconds since entry was stored, or `undefined` if key not found
    - Update `set()` to record `Date.now()` as `timestamp`
    - Add `isFresh(key: string, maxAgeMs: number): boolean` method — returns `true` if entry exists and age < maxAgeMs
    - Existing `get()` and `clear()` methods unchanged
  - [ ] 1.2: Update `packages/cqrs-client/src/queries/etagCache.test.ts` **(file already exists — ADD tests, do not create)**:
    - **Use `vi.useFakeTimers()` for all timestamp/freshness tests** — real `Date.now()` comparisons are flaky in CI. Call `vi.advanceTimersByTime(ms)` to simulate cache aging. Restore with `vi.useRealTimers()` in `afterEach`
    - Test: `set()` records timestamp
    - Test: `getAge()` returns age in ms for existing entry (advance fake timers by 3000ms, assert age ≈ 3000)
    - Test: `getAge()` returns `undefined` for missing key
    - Test: `isFresh()` returns `true` for entry within maxAge
    - Test: `isFresh()` returns `false` for entry older than maxAge (advance fake timers past threshold)
    - Test: `isFresh()` returns `false` for missing key
    - Test: `clear()` removes all entries (existing test, verify still passes)

- [ ] Task 2: Implement stale-while-revalidate in useQuery (AC: #1, #2, #3)
  - [ ] 2.1: Update `packages/cqrs-client/src/queries/useQuery.ts`:
    - Add `FRESH_THRESHOLD_MS = 5 * 60 * 1000` constant (5 minutes)
    - On mount (initial fetch in `useEffect`): check `etagCache.isFresh(cacheKey, FRESH_THRESHOLD_MS)` BEFORE fetching
      - If **fresh cache hit** → `setData(cached.data)`, `setIsLoading(false)`, do NOT fetch (data is fresh, no skeleton)
      - If **stale cache hit** (cache exists but not fresh) → `setData(cached.data)`, `setIsLoading(false)`, then fetch in background (showing data immediately, no skeleton). Add a new state: `isRefreshing: boolean` to `UseQueryResult<T>` — set to `true` during background revalidation of stale data
      - If **no cache** → current behavior: `setIsLoading(true)`, fetch
    - Extend `UseQueryResult<T>` with `isRefreshing: boolean`:
      - `isLoading` = true only on first-ever load (no cached data available)
      - `isRefreshing` = true when revalidating stale cached data in background
    - Export `FRESH_THRESHOLD_MS` for use in tests and documentation
  - [ ] 2.2: Update `packages/cqrs-client/src/queries/useQuery.test.ts`:
    - **Use `vi.useFakeTimers()` for stale-while-revalidate tests** — control cache aging precisely. Same pattern as etagCache tests
    - ADD test: fresh cache hit → `isLoading` is `false` immediately, `data` is cached value, no network request made
    - ADD test: stale cache hit → `isLoading` is `false`, `data` is cached value, `isRefreshing` is `true`, background fetch occurs
    - ADD test: no cache → `isLoading` is `true`, skeleton behavior unchanged
    - ADD test: background revalidation sets `isRefreshing` to `false` when fresh data arrives
    - ADD test: background revalidation updates data in-place when fresh response received
    - UPDATE existing tests: add `isRefreshing: false` assertion where `UseQueryResult` is checked (non-breaking — isRefreshing is false in all current test scenarios)

- [ ] Task 3: Create scroll position manager (AC: #4, #7)
  - [ ] 3.1: Create `apps/shell/src/navigation/scrollManager.ts`:
    - Export `ScrollManager` interface:
      - `save(routeKey: string): void` — reads `window.scrollY` (read-only property) and stores the value for the given route key
      - `restore(routeKey: string): void` — calls `window.scrollTo(0, savedPosition)` (instant, no smooth scroll) for the given route. Uses `requestAnimationFrame` to defer the scroll until after the next paint. If no saved position, scrolls to top (0)
      - `clear(): void` — clears all saved positions (used on version mismatch)
    - Export `createScrollManager(): ScrollManager` — uses in-memory `Map<string, number>`
    - Route key should be the pathname portion of the URL (not including search params), e.g., `/tenants` or `/orders/123`
    - **CRITICAL scroll timing**: `requestAnimationFrame` defers scroll until the next paint frame. For cached module return visits (data already in ETag cache, no Suspense fallback), one rAF is sufficient because the DOM renders synchronously from cached data. For first visits (lazy-loaded chunks), scroll position is 0 (top) anyway — no timing issue. The edge case where content height changes during background revalidation (AC2) is acceptable — the user was at position X when they left, we restore to X, and if the content reflows slightly during background refresh, the browser handles it naturally
  - [ ] 3.2: Create `apps/shell/src/navigation/scrollManager.test.ts`:
    - **Mock pattern for jsdom (no real layout/scrolling):**
      ```typescript
      // In beforeEach:
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      // To simulate user scroll: (window as any).scrollY = 500;
      ```
    - Test: `save()` captures current `window.scrollY` value
    - Test: `restore()` calls `window.scrollTo(0, savedPosition)` inside `requestAnimationFrame`
    - Test: `restore()` scrolls to top (0) when no saved position exists
    - Test: `clear()` removes all saved positions
    - Test: multiple routes maintain independent positions

- [ ] Task 4: Create ScrollRestoration component and wire into ShellLayout (AC: #4, #7)
  - [ ] 4.1: Create `apps/shell/src/navigation/ScrollRestoration.tsx`:
    - Functional component using `useLocation` from `react-router`
    - On location change (pathname changes):
      - Save scroll position for the PREVIOUS pathname before navigation
      - After render: restore scroll position for the NEW pathname (if saved)
    - Use `useRef` to track previous pathname
    - Use `useLayoutEffect` or `useEffect` + `requestAnimationFrame` for restore timing
    - Import `createScrollManager` — create a module-level singleton (lives for the session lifetime)
  - [ ] 4.2: Create `apps/shell/src/navigation/ScrollRestoration.test.tsx`:
    - **Mock scroll APIs** (same pattern as scrollManager tests): `Object.defineProperty(window, 'scrollY', ...)` and `vi.spyOn(window, 'scrollTo')`
    - **Wrap tests in `MemoryRouter`** (component uses `useLocation` from `react-router`)
    - Test: saves scroll position on pathname change
    - Test: restores scroll position for previously visited route
    - Test: scrolls to top for new routes
    - Test: handles browser back/forward navigation (pathname change triggers save/restore)
  - [ ] 4.3: Update `apps/shell/src/layout/ShellLayout.tsx`:
    - Import `ScrollRestoration` from `../navigation/ScrollRestoration`
    - Add `<ScrollRestoration />` inside the `<main>` element, before `<Outlet />`
    - Do NOT wrap `<Outlet />` — ScrollRestoration is a sibling, not a wrapper

- [ ] Task 5: Implement app version mismatch detection and cache clearing (AC: #6)
  - [ ] 5.1: Update `index.html` (`apps/shell/index.html`):
    - Add `<meta name="hexalith-shell-version" content="%VITE_APP_VERSION%" />` in `<head>`
    - The `%VITE_APP_VERSION%` placeholder is replaced at build time by Vite's `define` or `envPrefix`
  - [ ] 5.2: Update `vite.config.ts` (`apps/shell/vite.config.ts`):
    - Add `define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version ?? 'dev') }` (reads version from shell's package.json)
    - OR use Vite's built-in env replacement: add `VITE_APP_VERSION` to `.env` file with the version value
    - **Preferred approach**: Use `vite-plugin-html` or inline `define` to replace the meta tag content at build time. Simplest: hardcode the replacement in `vite.config.ts` using `process.env.npm_package_version`
  - [ ] 5.3: Create `apps/shell/src/navigation/versionCheck.ts`:
    - Export `getShellVersion(): string` — reads `<meta name="hexalith-shell-version">` content from DOM
    - Export `checkVersionMismatch(): boolean` — compares current version in sessionStorage (`hexalith-shell-version`) against the `<meta>` tag version. Returns `true` if mismatch detected (new deployment)
    - Export `recordCurrentVersion(): void` — stores the meta tag version in sessionStorage
    - On mismatch: caller should clear the ETag cache and scroll manager, then record the new version
  - [ ] 5.4: Create `apps/shell/src/navigation/versionCheck.test.ts`:
    - **Add `beforeEach(() => sessionStorage.clear())` to prevent test pollution** — jsdom's sessionStorage persists across tests in the same file
    - **Mock meta tag in DOM**: create a meta element via `document.createElement('meta')`, set its attributes, and append to `document.head`. Clean up in afterEach by removing it
    - Test: `getShellVersion()` reads from meta tag
    - Test: `checkVersionMismatch()` returns `false` when versions match
    - Test: `checkVersionMismatch()` returns `true` when versions differ
    - Test: `checkVersionMismatch()` returns `true` on first visit (no stored version)
    - Test: `recordCurrentVersion()` stores version in sessionStorage
  - [ ] 5.5: Create `apps/shell/src/navigation/useVersionCheck.ts` hook and wire into provider tree:
    - **Do NOT wire into `App.tsx` directly** — `etagCache.clear()` requires `useQueryClient()` which is only available inside `CqrsProvider`
    - Create a `useVersionCheck(etagCache: ETagCache, scrollManager: ScrollManager)` hook:
      - On mount: if `checkVersionMismatch()` is true, call `etagCache.clear()`, `scrollManager.clear()`, `recordCurrentVersion()`
      - Runs once on mount only (empty dependency array + ref guard)
    - Create `apps/shell/src/navigation/VersionGuard.tsx` — thin component that calls `useVersionCheck` and renders `children`:
      - Import `useQueryClient` from `@hexalith/cqrs-client` queries (internal import, not module-facing)
      - Call `useVersionCheck(etagCache, scrollManager)` in the component body
      - Return `children` (pass-through wrapper)
    - Wire into `apps/shell/src/providers/ShellProviders.tsx` — render `<VersionGuard>` as the **first child inside `CqrsProvider`** in `InnerProviders`, wrapping `ConnectionHealthProvider` and everything below. This placement ensures `useQueryClient()` is available (CqrsProvider is the parent):
      ```
      CqrsProvider
        VersionGuard          <-- NEW: version check runs here
          ConnectionHealthProvider
            FormDirtyProvider
              ThemeProvider
                LocaleProvider
      ```
    - **Note**: This moves `ShellProviders.tsx` from "DO NOT modify" to "Files to MODIFY". Update the file lists accordingly

- [ ] Task 6: Create barrel export for navigation directory (AC: all)
  - [ ] 6.1: Create `apps/shell/src/navigation/index.ts`:
    - Re-export `ScrollRestoration` from `./ScrollRestoration`
    - Re-export `VersionGuard` from `./VersionGuard`
    - Re-export `checkVersionMismatch`, `recordCurrentVersion`, `getShellVersion` from `./versionCheck`
    - Re-export `ScrollManager`, `createScrollManager` from `./scrollManager`
    - Re-export `useVersionCheck` from `./useVersionCheck`

- [ ] **DEFINITION OF DONE GATE — All previous tasks must pass verification:**

- [ ] Task 7: Verification (AC: #1-#7)
  - [ ] 7.1: All tests pass: `pnpm -F shell test` AND `pnpm -F cqrs-client test`
  - [ ] 7.2: Shell builds successfully: `pnpm -F shell build`
  - [ ] 7.3: Return visit with fresh cache (< 5 min) renders instantly — no skeleton, no loading state
  - [ ] 7.4: Return visit with stale cache (> 5 min) renders cached data immediately + shows refresh indicator
  - [ ] 7.5: First visit shows content-aware skeleton (minimum 300ms)
  - [ ] 7.6: Scroll position is saved on navigation away and restored on return
  - [ ] 7.7: Filter/sort state in URL params survives module switch and browser refresh
  - [ ] 7.8: App version mismatch clears ETag cache and scroll positions
  - [ ] 7.9: Browser back/forward restores previous module state
  - [ ] 7.10: Imports use `react-router` (NOT `react-router-dom`)
  - [ ] 7.11: No `enum` types used — union types only
  - [ ] 7.12: No direct `@radix-ui/*` imports in shell code
  - [ ] 7.13: `isRefreshing` field added to `UseQueryResult` is backward-compatible (false for non-stale scenarios)
  - [ ] 7.14: `@hexalith/cqrs-client` package.json version bumped (minor) for public API addition

## Dev Notes

### Dependency Gate

**Stories 5-1 (done), 5-2 (review), and 5-3 (ready-for-dev) should be stable before starting.** This story builds on:
- `ModuleErrorBoundary.tsx` and `ModuleSkeleton.tsx` from 5-1 (unchanged — skeleton behavior for first-visit is already handled by Suspense + ModuleSkeleton)
- `routeBuilder.ts` from 5-1 (wraps modules in ErrorBoundary > Suspense > Component — unchanged)
- `useActiveModule` hook from 5-2 (sidebar and status bar continue working during navigation transitions)
- Error event system from 5-3 (error boundaries remain unchanged, this story focuses on non-error navigation)

### Scope Boundaries — What This Story IS and IS NOT

**This story IS:**
- Adding timestamp tracking to the ETag cache for stale-while-revalidate behavior
- Adding `isRefreshing` to `UseQueryResult` so modules can show inline refresh indicators for stale data
- Creating a scroll position manager that saves/restores scroll per route
- Wiring scroll restoration into `ShellLayout` via a `ScrollRestoration` component
- Implementing app version mismatch detection that clears caches on new deployments
- Ensuring filter/sort state in URL search params survives module switches (React Router already handles this — verification, not implementation)

**This story is NOT:**
- Implementing filter/sort state storage mechanisms in modules — modules own their URL param usage via `useSearchParams` from react-router. The shell preserves the URL; module code manages what's in it
- Adding form-in-progress caching — `FormDirtyProvider` from `@hexalith/shell-api` already handles "unsaved changes" warnings. Form data is NOT cached across navigation (by design — see UX spec)
- Auto-retry with background polling for degraded services (Story 5.6 / Phase 2)
- Toast notifications for service recovery ("Inventory is back online") (Phase 2)
- Connection state indicators in status bar (Story 5.6)
- Build-time manifest validation (Story 5.5)
- Runtime module validation (Story 5.6)
- External monitoring integration (Epic 6 FR51)

### Critical Architecture Insight — No TanStack Query

**The epics reference "TanStack Query cache" but the actual implementation uses a custom ETag cache system.** The `useQuery` hook in `@hexalith/cqrs-client` stores data in component-local `useState` with an ETag-based HTTP cache (`etagCache.ts`) for bandwidth optimization. The ETag cache IS the shared data cache — it stores parsed data alongside ETags.

The architecture doc confirms `@hexalith/cqrs-client` depends on `@tanstack/react-query` but the **actual implementation** (`packages/cqrs-client/src/queries/useQuery.ts`) does NOT import or use TanStack Query — it implements its own caching with `useState` + `ETagCache`. This means:

1. **Cache persistence between module mounts** already works via the ETag cache (shared across components via React Context)
2. **Stale-while-revalidate** must be implemented by checking cache age before triggering the initial fetch
3. **The `isRefreshing` field** is a new addition to distinguish "loading from scratch" from "background revalidating stale data"

### Package Version Bump

**(IMPORTANT) `@hexalith/cqrs-client` requires a minor version bump.** Adding `isRefreshing: boolean` to the `UseQueryResult<T>` interface is a backward-compatible public API change (new field, defaults `false`). Under the project's semver policy, this is a minor version bump. Update `packages/cqrs-client/package.json` version field (e.g., `0.1.0` → `0.2.0` or whatever the current minor is). This ensures downstream consumers know the API surface expanded.

### Package Dependency Notes

**Changes span two packages:**
- `packages/cqrs-client` — ETag cache timestamp, useQuery stale-while-revalidate, isRefreshing field
- `apps/shell` — scroll restoration, version check, ShellLayout wiring

**No new dependencies needed.** All features use built-in browser APIs and existing React patterns:
- `sessionStorage` for version tracking
- `window.scrollY` / `window.scrollTo` for scroll position
- `requestAnimationFrame` for scroll restore timing
- `useLocation` from `react-router` for route tracking

### AC2 Refresh Indicator Responsibility

**The shell provides `isRefreshing`; modules consume it.** The "small inline refresh indicator" in AC2 is rendered by the *module*, not the shell. The shell's role is exposing `isRefreshing: boolean` in the `UseQueryResult<T>` hook return. Module developers use it like:
```typescript
const { data, isLoading, isRefreshing } = useQuery(schema, params);
// Module renders: {isRefreshing && <RefreshIndicator />}
```
The Tenants reference module should demonstrate this pattern when it adopts `isRefreshing` (can be done in this story or as a follow-up). The shell cannot render the indicator because it doesn't know the module's page header structure.

### Architecture Constraints — MUST Follow

1. **(CRITICAL) Import from `react-router`, NOT `react-router-dom`.** The project uses react-router v7 unified package. [Source: architecture.md, Story 5-1/5-2/5-3 constraints]

2. **(CRITICAL) No `enum` types.** Use union types only. [Source: architecture.md#Code Naming]

3. **(CRITICAL) No direct `@radix-ui/*` imports in shell code.** Use `@hexalith/ui` wrappers. [Source: architecture.md#Architectural Boundaries]

4. **(CRITICAL) CSS Modules for shell component styles.** Any visual components (like a refresh indicator) must use CSS Modules, not inline styles. Exception: `ShellErrorBoundary` uses inline styles because it's outside the provider tree. [Source: architecture.md#Format Patterns]

5. **(CRITICAL) File naming: kebab-case for `.ts` utility files, PascalCase for `.tsx` React components.** `scrollManager.ts` (kebab-case util), `ScrollRestoration.tsx` (PascalCase component), `versionCheck.ts` (kebab-case util). [Source: architecture.md#Naming Patterns]

6. **(CRITICAL) UseQueryResult owns its API surface — do NOT leak TanStack Query types.** The `isRefreshing` field is added to the custom `UseQueryResult<T>` interface. Modules consume only this interface. [Source: architecture.md#Third-Party Type Re-Export Policy]

7. **(CRITICAL) Modules own filter/sort state via URL search params.** The shell preserves the URL (including search params) across navigation. The shell does NOT manage or interpret filter/sort params — modules use `useSearchParams` from react-router to read/write their own params. This story verifies the shell's URL preservation, not module-level filter implementation.

8. **(CRITICAL) ETag cache is tenant-scoped.** Cache keys use `{tenantId}:{domain}:{queryType}:{aggregateId}:{entityId}`. Tenant switch already clears the cache (`QueryProvider.tsx` line 40-48). The version check cache clearing is additive — it also clears on version mismatch. [Source: architecture.md#Multi-tenancy, cqrs-client/QueryProvider.tsx]

9. **(IMPORTANT) Minimum 300ms skeleton display for first visit.** `ModuleSkeleton` already handles this via `React.Suspense`. The stale-while-revalidate enhancement ensures the skeleton is ONLY shown on first visit — return visits with cached data skip it entirely. [Source: ux-design-specification.md#Skeleton-to-Content Transition Protocol]

10. **(IMPORTANT) CLS budget = 0 for skeleton-to-content.** Skeleton dimensions must match content dimensions. This is already handled by `ModuleSkeleton` from Story 5-1. No changes needed. [Source: ux-design-specification.md]

### Existing Codebase Context — MUST Reference

**Files to MODIFY:**
- `packages/cqrs-client/src/queries/etagCache.ts` — add timestamp, getAge, isFresh
- `packages/cqrs-client/src/queries/etagCache.test.ts` — add timestamp/freshness tests **(file already exists)**
- `packages/cqrs-client/src/queries/useQuery.ts` — stale-while-revalidate logic, isRefreshing field
- `apps/shell/src/layout/ShellLayout.tsx` — add ScrollRestoration component
- `apps/shell/src/providers/ShellProviders.tsx` — add VersionGuard inside CqrsProvider
- `apps/shell/index.html` — add version meta tag
- `apps/shell/vite.config.ts` — define VITE_APP_VERSION

**Files to CREATE:**
- `apps/shell/src/navigation/scrollManager.ts` — scroll position save/restore
- `apps/shell/src/navigation/scrollManager.test.ts` — tests
- `apps/shell/src/navigation/ScrollRestoration.tsx` — React component for scroll management
- `apps/shell/src/navigation/ScrollRestoration.test.tsx` — tests
- `apps/shell/src/navigation/versionCheck.ts` — version mismatch detection
- `apps/shell/src/navigation/versionCheck.test.ts` — tests
- `apps/shell/src/navigation/useVersionCheck.ts` — version check hook
- `apps/shell/src/navigation/VersionGuard.tsx` — thin wrapper component calling useVersionCheck
- `apps/shell/src/navigation/index.ts` — barrel export

**Files that are source of truth (DO NOT modify):**
- `packages/cqrs-client/src/queries/QueryProvider.tsx` — provides ETag cache via context, already clears cache on tenant switch
- `packages/cqrs-client/src/CqrsProvider.tsx` — wraps ConnectionStateProvider > SignalRProvider > QueryProvider
- `apps/shell/src/modules/routeBuilder.ts` — module wrapping: ModuleErrorBoundary > Suspense > Component
- `apps/shell/src/errors/ModuleSkeleton.tsx` — content-aware loading skeleton (unchanged)
- `apps/shell/src/errors/ModuleErrorBoundary.tsx` — error boundary (unchanged)

### Key Existing Code Patterns

**Current ETag cache (to be enhanced with timestamps):**
```typescript
// packages/cqrs-client/src/queries/etagCache.ts — CURRENT
export interface CacheEntry<T = unknown> {
  data: T;
  etag: string;
}
// ENHANCED — add:
//   timestamp: number;
// Plus new methods: getAge(key), isFresh(key, maxAgeMs)
```

**Current useQuery initial fetch (to be enhanced with stale-while-revalidate):**
```typescript
// packages/cqrs-client/src/queries/useQuery.ts — CURRENT behavior:
// On mount: setIsLoading(true) → fetch → setData → setIsLoading(false)
// ALWAYS shows loading state, even if cache has fresh data

// TARGET behavior:
// On mount:
//   Fresh cache hit → setData(cached) immediately, NO fetch, isLoading=false
//   Stale cache hit → setData(cached) immediately, fetch in background, isRefreshing=true
//   No cache → setIsLoading(true), fetch (current behavior)
```

**Current UseQueryResult (to be extended):**
```typescript
export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: HexalithError | null;
  refetch: () => void;
}
// ENHANCED — add:
//   isRefreshing: boolean;
```

**ShellLayout main content area (ScrollRestoration goes here):**
```tsx
// apps/shell/src/layout/ShellLayout.tsx — CURRENT
<main className={styles.main} id="main-content" tabIndex={-1} aria-label="Content">
  <Outlet />
</main>

// TARGET — add ScrollRestoration as sibling before Outlet:
<main className={styles.main} id="main-content" tabIndex={-1} aria-label="Content">
  <ScrollRestoration />
  <Outlet />
</main>
```

**URL search params for filter/sort (module responsibility, not shell):**
```typescript
// Modules use react-router's useSearchParams:
import { useSearchParams } from "react-router";
const [searchParams, setSearchParams] = useSearchParams();
// The shell preserves the full URL including ?status=overdue&sort=date
// Shell does NOT need to manage or interpret these params
```

### Critical Anti-Patterns to Prevent

1. **Do NOT import `@radix-ui/*` directly in shell code.** Use `@hexalith/ui` wrappers only.
2. **Do NOT import from `react-router-dom`.** Use `react-router` v7 unified package.
3. **Do NOT use `enum` types.** Use union types.
4. **Do NOT add TanStack Query as a dependency.** The custom ETag cache system is the caching layer. The epics reference "TanStack Query cache" but the implementation uses a custom solution — work with what exists.
5. **Do NOT cache form-in-progress data.** The UX spec says forms are NOT cached across navigation — the existing `FormDirtyProvider` handles "unsaved changes" warnings. If a user navigates away from a dirty form, they get a warning (already implemented).
6. **Do NOT use `localStorage` for scroll positions or cached data.** Use in-memory stores (Map). These are session-scoped — they're lost on page refresh, which is correct behavior (a full refresh should start fresh). Only the version check uses `sessionStorage` (survives refresh, clears on tab close).
7. **Do NOT block navigation for scroll save.** The scroll save must be synchronous and fast — just read `window.scrollY` and store in a Map. Never async.
8. **Do NOT use `window.scrollTo({ behavior: 'smooth' })` for scroll restoration.** Use instant scrolling (`behavior: 'instant'` or omit the behavior option) — the user expects to return to their exact position, not watch the page scroll.
9. **Do NOT change the existing provider nesting ORDER in ShellProviders.** `VersionGuard` is inserted as a new child inside `CqrsProvider`, wrapping `ConnectionHealthProvider` and below. The existing order (Auth > Tenant > CQRS > ConnectionHealth > FormDirty > Theme > Locale) remains unchanged — `VersionGuard` is an addition between CQRS and ConnectionHealth, not a reordering.
10. **Do NOT make `isRefreshing` default to `undefined`.** It must be `boolean` — always `true` or `false`. Default is `false`. This prevents modules from needing `isRefreshing ?? false` checks.
11. **Do NOT add auto-retry or background polling for degraded states.** That is Story 5.6 / Phase 2 scope. This story handles only stale-while-revalidate for successful past queries.
12. **Do NOT modify `ModuleSkeleton.tsx` or `routeBuilder.ts`.** The skeleton behavior for first-visit is already correct. This story changes the caching layer so the skeleton is bypassed on return visits.
13. **Do NOT use `window.addEventListener('beforeunload')` for scroll save.** Save on route change (via `useLocation` change), not on page unload. The user's scroll position within a module is saved when they navigate to another module.

### Previous Story Intelligence (Stories 5-1, 5-2, 5-3)

**Story 5-1 (done):** Created module infrastructure:
- `ModuleErrorBoundary.tsx`, `ModuleSkeleton.tsx`, `routeBuilder.ts`, `registry.ts`
- Key: ModuleSkeleton provides content-aware loading for first visit — this story ensures it's NOT shown on return visits

**Story 5-2 (review):** Created navigation:
- `useActiveModule` hook, sidebar with module navigation, status bar with active module display
- Key: Sidebar navigation triggers route changes. This story manages the state preservation around those route changes
- Debug note: Tests required `MemoryRouter` wrapper for hooks using `useLocation`. ScrollRestoration tests will also need `MemoryRouter`

**Story 5-3 (ready-for-dev):** Created error isolation:
- Enhanced `ModuleErrorBoundary` with error classification, `ShellErrorBoundary`, structured error events
- Key: Error boundaries are independent of navigation caching. A module that errored and then retried successfully should have its data cached normally

### Git Intelligence — Recent Commits

```
53ac916 chore: update subproject commit reference for Hexalith.Tenants
0771d18 feat: implement ModuleErrorBoundary and ModuleSkeleton components with tests
7d131d3 feat: add comprehensive documentation for Hexalith module development
99d51c1 feat: add manifest validation and tests, enhance module developer documentation
e28db39 chore: update subproject commit reference for Hexalith.Tenants
```

### Project Structure Notes

**Files to create:**
```
apps/shell/src/
├── navigation/
│   ├── index.ts                    # Barrel export for navigation directory
│   ├── scrollManager.ts            # Scroll position save/restore
│   ├── scrollManager.test.ts       # Tests for scroll manager
│   ├── ScrollRestoration.tsx       # React component for scroll management
│   ├── ScrollRestoration.test.tsx  # Tests for scroll restoration
│   ├── versionCheck.ts             # App version mismatch detection
│   ├── versionCheck.test.ts        # Tests for version check
│   ├── useVersionCheck.ts          # Version check hook
│   └── VersionGuard.tsx            # Thin wrapper calling useVersionCheck
```

**Files to modify:**
```
packages/cqrs-client/
├── package.json                    # Minor version bump (isRefreshing API addition)
└── src/queries/
    ├── etagCache.ts                # Add timestamp, getAge, isFresh
    ├── etagCache.test.ts           # Add timestamp/freshness tests (file exists)
    └── useQuery.ts                 # Stale-while-revalidate, isRefreshing

apps/shell/
├── index.html                      # Add version meta tag
├── vite.config.ts                  # Define VITE_APP_VERSION
└── src/
    ├── layout/
    │   └── ShellLayout.tsx         # Add ScrollRestoration component
    └── providers/
        └── ShellProviders.tsx      # Add VersionGuard inside CqrsProvider
```

### Commit Strategy

Recommended commit order:
1. Enhance ETag cache with timestamp tracking + tests — foundational change, no consumers yet
2. Add stale-while-revalidate to useQuery + isRefreshing + tests — builds on timestamp cache
3. Create scroll manager + ScrollRestoration + tests — standalone shell feature
4. Create version check + wire into App + update index.html/vite.config — standalone feature
5. Wire ScrollRestoration into ShellLayout + create barrel export — integration
6. Verification pass

All can be committed together as one cohesive commit — they form one logical feature: "navigation state preservation and caching."

### References

- [Source: epics.md#Story 5.4] — Full acceptance criteria and BDD scenarios
- [Source: prd.md#FR26] — End user can switch between modules without losing navigation and filter state
- [Source: architecture.md#Module lifecycle] — React.lazy() for MVP. Stale-while-revalidate navigation cache. Scroll position and filter state preserved on return visits
- [Source: architecture.md#Cross-Cutting Concerns: Multi-tenancy] — Tenant switching clears projection caches. Projection cache keys must be tenant-scoped
- [Source: architecture.md#State Management Summary] — Server/projection data: ETag-cached queries via useQuery
- [Source: architecture.md#Third-Party Type Re-Export Policy] — Foundation packages define their own return types, do NOT re-export third-party types
- [Source: ux-design-specification.md#Navigation Cache Strategy] — First visit skeleton, return visit instant, stale refresh indicator, version mismatch cache clear
- [Source: ux-design-specification.md#Cross-Module Navigation Flow] — Navigation cache behavior: module bundle, projection data, scroll position, filter/sort state, form in progress
- [Source: ux-design-specification.md#Skeleton-to-Content Transition Protocol] — Minimum 300ms skeleton, single crossfade, no skeleton re-entry on subsequent updates
- [Source: ux-design-specification.md#Shell router scroll preservation] — When Elena returns to a cached table view, scroll position and selected row are restored. This is a shell-level concern implemented in the router
- [Source: packages/cqrs-client/src/queries/etagCache.ts] — CacheEntry, ETagCache interface, createETagCache, buildCacheKey
- [Source: packages/cqrs-client/src/queries/useQuery.ts] — UseQueryResult, UseQuery hook with ETag caching, polling, retry
- [Source: packages/cqrs-client/src/queries/QueryProvider.tsx] — QueryContextValue, etagCache via context, tenant switch cache clear
- [Source: apps/shell/src/layout/ShellLayout.tsx] — Shell layout with Outlet
- [Source: apps/shell/src/providers/ShellProviders.tsx] — Provider nesting: Auth > Tenant > CQRS > ConnectionHealth > FormDirty > Theme > Locale

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
