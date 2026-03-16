# Story 2.4: Query Hook — Projection Data with Zod Validation

Status: ready-for-dev

## Story

As a module developer,
I want to query projection data with automatic ETag caching, type safety, and runtime validation,
so that I get typed, validated data without writing transport or caching code.

## Acceptance Criteria

1. **Given** `useQuery<T>` hook is created in `src/queries/useQuery.ts`
   **When** a module developer calls `const { data, isLoading, error, refetch } = useQuery(schema, queryParams)`
   **Then** a `POST /api/v1/queries` request is made with the query payload
   **And** the response `payload` is validated against the provided Zod schema at runtime
   **And** if validation fails, a `ValidationError` is thrown with the Zod issues
   **And** `data` is typed as `T | undefined` inferred from the Zod schema

2. **Given** ETag caching is implemented in `src/queries/etagCache.ts`
   **When** a query receives a `200` response with an `ETag` header
   **Then** the ETag and response data are stored in an in-memory Map keyed by `{tenantId}:{domain}:{queryType}:{aggregateId}:{entityId?}`
   **And** subsequent requests for the same key send `If-None-Match: "{etag}"` header
   **And** a `304 Not Modified` response returns the cached data without re-downloading
   **And** a `200` response updates both the cached data and ETag

3. **Given** the `useQuery` hook accepts an optional `options` parameter
   **When** a module developer provides options
   **Then** `refetchInterval` enables background polling at the specified interval (ms)
   **And** `enabled` controls whether the query is active (default: `true`)
   **And** `refetchOnWindowFocus` triggers re-query on tab return (default: `true`)

4. **Given** the user switches tenants via `TenantProvider`
   **When** the tenant context changes
   **Then** the entire ETag cache is cleared (all entries are tenant-scoped)
   **And** active queries re-fetch with no `If-None-Match` (cold start for new tenant)

5. **Given** the backend returns a payload that doesn't match the Zod schema
   **When** `useQuery` processes the response
   **Then** a clear `ValidationError` is surfaced via the `error` return value (not a runtime crash)

## Tasks / Subtasks

- [ ] Task 1: Extend `FetchClient` with query-aware method (AC: #2)
  - [ ] Add `postForQuery<T>` to `FetchClient` interface in `src/core/fetchClient.ts`:
    ```typescript
    // Discriminated union for type safety — no unsafe null casts
    type QueryResponse<T> =
      | { status: 200; data: T; etag: string | null }
      | { status: 304; data: null; etag: null };

    interface FetchClient {
      post<T>(path: string, options?: FetchRequestOptions): Promise<T>;
      get<T>(path: string, options?: FetchRequestOptions): Promise<T>;
      postForQuery<T>(path: string, options?: FetchRequestOptions): Promise<QueryResponse<T>>;
    }
    ```
  - [ ] `postForQuery` behavior:
    1. Sends POST with same auth/correlation logic as `post`
    2. On `200`: parse body as JSON, extract `ETag` header, return `{ data, status: 200, etag }`
    3. On `304`: return `{ data: null, status: 304, etag: null }` — caller checks `status` before accessing `data`
    4. On any other non-OK status (4xx/5xx): delegate to `parseProblemDetails` (existing behavior)
    5. On unexpected OK status (e.g., 202, 201): throw `ApiError(response.status)` — only 200 and 304 are expected from the query endpoint
  - [ ] Update `createFetchClient` implementation to include `postForQuery`
  - [ ] Add tests for `postForQuery` in `src/core/fetchClient.test.ts`:
    - 200 response returns data + etag
    - 304 response returns null data + status 304
    - Error responses still throw via parseProblemDetails
    - Unexpected OK status (e.g., 202) throws ApiError
  - [ ] Existing `post` and `get` methods remain unchanged — zero regression risk

- [ ] Task 2: Create `ETagCache` (AC: #2, #4)
  - [ ] Create `src/queries/etagCache.ts`:
    ```typescript
    interface CacheEntry<T = unknown> {
      data: T;
      etag: string;
    }

    interface ETagCache {
      get(key: string): CacheEntry | undefined;
      set(key: string, entry: CacheEntry): void;
      clear(): void;
    }

    function buildCacheKey(tenantId: string, params: QueryParams): string;
    function createETagCache(): ETagCache;
    ```
  - [ ] Cache key format: `{tenantId}:{domain}:{queryType}:{aggregateId}:{entityId}` — empty segments produce empty strings between colons (e.g., `tenant-1:Orders:GetOrderList::` for list queries with no aggregateId/entityId)
  - [ ] `get(key)` returns `CacheEntry | undefined`
  - [ ] `set(key, entry)` stores/overwrites
  - [ ] `clear()` removes all entries (used on tenant switch)
  - [ ] In-memory `Map<string, CacheEntry>` — no persistence (resets on page refresh)
  - [ ] Export `ETagCache`, `CacheEntry`, `buildCacheKey`, `createETagCache` for internal use
  - [ ] Create `src/queries/etagCache.test.ts`

- [ ] Task 3: Create `QueryProvider` and `useQueryClient` context hook (AC: #4)
  - [ ] Create `src/queries/QueryProvider.tsx`:
    ```typescript
    interface QueryContextValue {
      fetchClient: FetchClient;
      etagCache: ETagCache;
    }

    function QueryProvider({ fetchClient, children }: { fetchClient: FetchClient; children: ReactNode }): JSX.Element;
    function useQueryClient(): QueryContextValue;
    ```
  - [ ] `QueryProvider` creates `ETagCache` in `useMemo` (stable instance, scoped to provider)
  - [ ] `QueryProvider` receives `fetchClient` as prop (from CqrsProvider — see Task 7)
  - [ ] `useQueryClient()` throws descriptive error if context is null: `"useQueryClient must be used within QueryProvider"`
  - [ ] Subscribe to tenant changes via `useTenant()` — on tenant change, call `etagCache.clear()`:
    ```typescript
    const { activeTenant } = useTenant();
    const prevTenantRef = useRef(activeTenant);

    useEffect(() => {
      if (prevTenantRef.current && prevTenantRef.current !== activeTenant) {
        etagCache.clear();
      }
      prevTenantRef.current = activeTenant;
    }, [activeTenant, etagCache]);
    ```
  - [ ] Export `QueryProvider` and `useQueryClient` from `src/index.ts`
  - [ ] Create `src/queries/QueryProvider.test.tsx`

- [ ] Task 4: Create `useQuery<T>` hook (AC: #1, #2, #3, #5)
  - [ ] Create `src/queries/useQuery.ts`:
    ```typescript
    interface QueryParams {
      domain: string;
      queryType: string;
      aggregateId?: string;
      entityId?: string;
    }

    interface QueryOptions {
      enabled?: boolean;           // default: true
      refetchInterval?: number;    // ms, undefined = no polling
      refetchOnWindowFocus?: boolean; // default: true
    }

    interface UseQueryResult<T> {
      data: T | undefined;
      isLoading: boolean;
      error: HexalithError | null;
      refetch: () => void;
    }

    function useQuery<T>(
      schema: z.ZodType<T>,
      queryParams: QueryParams,
      options?: QueryOptions,
    ): UseQueryResult<T>;
    ```
  - [ ] Core fetch logic:
    1. Get `fetchClient` and `etagCache` from `useQueryClient()`
    2. Get `activeTenant` from `useTenant()` — it's `string | null`. Abort if null (set error: "No active tenant")
    3. Build cache key: `buildCacheKey(activeTenant, queryParams)`
    4. Build request body: `{ tenant: activeTenant, domain, queryType, aggregateId: aggregateId ?? '', entityId }` (matches `SubmitQueryRequest` from `src/core/types.ts` — note: `aggregateId` is required in the type, default to empty string when not provided by caller)
    5. Check ETag cache → if hit, add `If-None-Match` header to request options
    6. Call `fetchClient.postForQuery<SubmitQueryResponse>('/api/v1/queries', { body, headers })`
    7. On 304: return cached data (already validated)
    8. On 200: validate `response.data.payload` with `schema.safeParse()`
       - success → store in ETag cache, set `data`
       - failure → set `error` to `new ValidationError(result.error.issues)`
    9. On fetch error → set `error` (infrastructure errors propagate to error boundary)
  - [ ] State management: `useState` for `data`, `isLoading`, `error`
  - [ ] Initial fetch on mount (when `enabled !== false` and `activeTenant` exists)
  - [ ] `refetch()` function: manually trigger a re-fetch (exposed to consumer)
  - [ ] `refetchInterval` option: `setInterval` that calls internal fetch, cleaned up on unmount
  - [ ] `refetchOnWindowFocus` option: `window.addEventListener('visibilitychange', ...)` → refetch when `document.visibilityState === 'visible'`; cleaned up on unmount
  - [ ] `enabled` option: when `false`, skip initial fetch and polling; when toggled to `true`, trigger fetch. **Interaction with `refetchInterval`:** when `enabled` transitions from `false` to `true` and `refetchInterval` is set, the interval starts immediately (effect re-runs due to `enabled` dependency change).
  - [ ] `isLoading` is `true` during initial fetch only (not during refetches — `data` stays stale during refetch)
  - [ ] Use `useRef` for interval IDs and abort controllers to avoid stale closures
  - [ ] Use `AbortController` to cancel in-flight requests on unmount or param change. **Add request timeout:** combine the controller's signal with a timeout signal to prevent hanging requests on slow backends:
    ```typescript
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
    // Pass signal to fetchClient.postForQuery options
    ```
    On timeout, `AbortSignal.timeout` throws a `TimeoutError` (DOMException with name `'TimeoutError'`). Catch it alongside `AbortError` — set a user-facing error: `"Query timed out after 30 seconds"`.
  - [ ] **Stabilize `queryParams` reference** — `queryParams` is an object, so a new literal on every render creates a new reference, which re-creates `fetchData` via `useCallback`, which re-fires every `useEffect`. Fix: serialize params into the dependency array instead of using the object reference:
    ```typescript
    const paramsKey = `${queryParams.domain}:${queryParams.queryType}:${queryParams.aggregateId ?? ''}:${queryParams.entityId ?? ''}`;
    // Use paramsKey (string) in useCallback deps instead of queryParams (object)
    const fetchData = useCallback(async (isInitial: boolean) => { ... }, [activeTenant, paramsKey, fetchClient, etagCache, schema]);
    ```
    Also add a JSDoc warning on the exported `useQuery` function:
    ```typescript
    /**
     * ...
     * @remarks queryParams should be a stable reference (useMemo) or a static object.
     * Passing an inline object literal will cause unnecessary re-fetches on every render.
     */
    ```
  - [ ] Create `src/queries/useQuery.test.ts`

- [ ] Task 5: Wire `QueryProvider` into `CqrsProvider` (AC: all)
  - [ ] **BLOCKER: Story 2.3 must be completed first** — `src/commands/CqrsProvider.tsx` does not exist yet (created by Story 2.3). Tasks 1-4 and 7-8 can proceed without 2.3, but this task requires CqrsProvider to exist.
  - [ ] Update `src/commands/CqrsProvider.tsx` (created in Story 2.3):
    ```tsx
    import { QueryProvider } from '../queries/QueryProvider';

    export function CqrsProvider({ commandApiBaseUrl, tokenGetter, children }: CqrsProviderProps) {
      const fetchClient = useMemo(...);
      const commandEventBus = useMemo(...);

      return (
        <CqrsContext.Provider value={{ fetchClient, commandEventBus }}>
          <QueryProvider fetchClient={fetchClient}>
            {children}
          </QueryProvider>
        </CqrsContext.Provider>
      );
    }
    ```
  - [ ] This keeps a single `CqrsProvider` in the shell's provider tree — no extra provider needed
  - [ ] Module developers get both command and query hooks from the same provider
  - [ ] Update CqrsProvider tests to verify QueryProvider is nested

- [ ] Task 6: Export public API from `src/index.ts` (AC: all)
  - [ ] Add to `packages/cqrs-client/src/index.ts`:
    ```typescript
    // Queries
    export { useQuery } from './queries/useQuery';
    export { QueryProvider } from './queries/QueryProvider';
    export type { QueryParams, QueryOptions, UseQueryResult } from './queries/useQuery';
    ```
  - [ ] Do NOT export `ETagCache`, `createETagCache`, `buildCacheKey` — internal implementation
  - [ ] Do NOT export `useQueryClient` — internal hook for query infrastructure
  - [ ] Export `QueryProvider` for shell integration (nested inside CqrsProvider)
  - [ ] Verify `pnpm build` succeeds

- [ ] Task 7: Write comprehensive tests (AC: all)
  - [ ] **etagCache.test.ts**:
    - set + get returns entry
    - get missing key returns undefined
    - set overwrites existing entry
    - clear removes all entries
    - buildCacheKey with entityId
    - buildCacheKey without entityId
  - [ ] **QueryProvider.test.tsx**:
    - Context guard throws outside provider
    - Children render with valid context
    - Cache clears on tenant change (mock useTenant to change activeTenant)
    - Cache does NOT clear on initial mount
  - [ ] **useQuery.test.ts**:
    - Successful query returns validated data
    - Zod validation failure sets ValidationError in error
    - ETag cache stores on 200 response
    - Subsequent request sends If-None-Match header
    - 304 response returns cached data
    - Null activeTenant sets error
    - Tenant auto-injected in request body (NOT from caller)
    - `enabled: false` prevents fetch
    - `enabled` toggled to true triggers fetch
    - `refetchInterval` triggers periodic fetch
    - `refetchOnWindowFocus` triggers on visibilitychange
    - `refetch()` triggers manual re-fetch
    - `isLoading` true during initial fetch, false during refetch
    - Fetch error sets error state
    - Unmount cancels in-flight request (AbortController)
    - Unmount clears interval
    - Param change mid-flight aborts old request and starts new fetch
    - Return shape is object (not tuple)
  - [ ] **fetchClient.test.ts** (additions):
    - `postForQuery` returns data + etag on 200
    - `postForQuery` handles 304 (null data, status 304)
    - `postForQuery` throws on 4xx/5xx via parseProblemDetails
  - [ ] All hook tests use `@testing-library/react` `renderHook` + `act`
  - [ ] All tests mock `fetchClient` and `useTenant` — do NOT call real APIs
  - [ ] Vitest environment: `jsdom` for hook tests (React hooks need DOM)
  - [ ] Polling tests: `vi.useFakeTimers()` + `vi.advanceTimersByTime()`
  - [ ] Window focus tests: spy on `addEventListener`/`removeEventListener` + dispatch `visibilitychange`
  - [ ] Wrapper pattern for hook tests:
    ```typescript
    const wrapper = ({ children }) => (
      <QueryProvider fetchClient={mockFetchClient}>
        {children}
      </QueryProvider>
    );
    ```
    Note: must also mock `useTenant()` via `vi.mock('@hexalith/shell-api')`

- [ ] Task 8: Add test infrastructure (prerequisite for Task 7)
  - [ ] Run `pnpm --filter @hexalith/cqrs-client add -D @testing-library/react` (if not already added by Story 2.3)
  - [ ] Update `packages/cqrs-client/vitest.config.ts` to add `environment: 'jsdom'`:
    ```typescript
    import { defineConfig } from "vitest/config";

    export default defineConfig({
      test: {
        include: ["**/*.test.ts", "**/*.test.tsx"],
        environment: "jsdom",
        passWithNoTests: true,
      },
    });
    ```
  - [ ] Verify: `pnpm --filter @hexalith/cqrs-client test` runs without environment errors

- [ ] Task 9: Verify package integrity
  - [ ] `pnpm --filter @hexalith/cqrs-client build` succeeds (ESM + .d.ts)
  - [ ] `pnpm --filter @hexalith/cqrs-client test` passes all tests
  - [ ] `pnpm --filter @hexalith/cqrs-client lint` passes
  - [ ] `pnpm build` (full monorepo) succeeds
  - [ ] Verify useQuery returns typed data when Zod schema is provided (TS compile check)

## Dev Notes

### Architecture Compliance

- **Native `fetch` via `createFetchClient`** — Story 2.2's utility. NOT ky (removed per sprint change 2026-03-15). The `postForQuery` method extends the same fetch client — NOT a separate HTTP abstraction.
- **No TanStack Query** — Removed per sprint change proposal. Projection caching uses a custom ETag cache (this story). Do NOT add `@tanstack/react-query` as a dependency.
- **Object destructuring return shapes** — `const { data, isLoading, error, refetch } = useQuery(...)`. Never tuples.
- **Errors via return value** — `useQuery` surfaces business errors (`ValidationError` for Zod failures) via the `error` return property. Infrastructure errors (`AuthError`, `ForbiddenError`, `RateLimitError`, network errors) propagate to `ModuleErrorBoundary`. Never `try/catch` around `useQuery` at the module level.
- **Tenant from context, NOT from caller** — `SubmitQueryRequest.tenant` is auto-injected from `useTenant().activeTenant` (which is `string | null`) inside `useQuery`. Module developers pass `{ domain, queryType, aggregateId?, entityId? }` — NOT `tenant`.
- **Zod validates response payload** — The `useQuery` hook calls `schema.safeParse(response.payload)`. Use `safeParse` (not `parse`) to avoid uncontrolled throws. On failure, create `new ValidationError(result.error.issues)` from `src/errors.ts`.
- **React Context provider pattern** — `QueryProvider` follows the same pattern as `AuthProvider`, `TenantProvider`, `CqrsProvider`: named context, named Provider export, named hook export, hook throws if outside provider. [Source: architecture.md § React Context Provider Pattern, lines 993-1017]
- **No SignalR in this story** — SignalR push invalidation is Story 2.7. The ETag cache is designed to work WITH SignalR later (re-queries triggered by SignalR will use `If-None-Match`), but this story implements only polling-based and manual refetch.
- **No command-complete invalidation in this story** — That integration (commandEventBus → useQuery re-fetch) is Story 2.5. The ETag cache is ready for it, but the wiring is not part of this story.
- **Story 2.8 scope boundary** — Story 2.8 ("ETag Query Cache Integration") handles SignalR-triggered ETag revalidation (`ProjectionChanged` → re-query with `If-None-Match`). This story (2.4) implements the foundational ETag cache and `useQuery` hook. Story 2.8 will wire SignalR signals into the cache invalidation flow. The ETag cache implementation in this story is designed to be extended by 2.8 without modification.

### Critical Constraints

- **DO NOT add `@tanstack/react-query`** — Removed per sprint change. ETag cache replaces it.
- **DO NOT add SignalR** — Story 2.7. The ETag cache will be used by SignalR-triggered re-fetches, but SignalR itself is not in scope.
- **DO NOT create command hooks** — Story 2.3. This story assumes CqrsProvider exists.
- **DO NOT create mock implementations** — Story 2.6.
- **DO NOT wire commandCompleted → useQuery re-fetch** — Story 2.5.
- **DEPENDS ON Stories 2.1 + 2.2 + 2.3** — This story imports from `./core/fetchClient` (FetchClient, FetchRequestOptions, createFetchClient), `./core/types` (SubmitQueryRequest, SubmitQueryResponse), `./errors` (HexalithError, ValidationError). It also depends on `CqrsProvider` from Story 2.3 for the provider tree integration.
- **`useTenant` import path** — `import { useTenant } from '@hexalith/shell-api'`. Returns `{ activeTenant: string | null, availableTenants: string[], switchTenant: (id: string) => void }`. Note: `activeTenant` is a plain string (the tenant ID), NOT an object.
- **Zod schemas MUST be defined at module scope** — If a module developer defines `const Schema = z.object({...})` inside a component body, the `schema` reference changes every render, causing `useQuery`'s `fetchData` callback to re-create and effects to re-fire (infinite fetch loop). The `paramsKey` stabilization only covers `queryParams`, not `schema`. Add a JSDoc `@remarks` warning on the exported `useQuery` function: "The `schema` parameter must be a stable reference — define Zod schemas at module scope, not inside component bodies."
- **Zod is already a dependency** — `"zod": "^3.25.76"` in package.json. Do NOT re-add it.
- **Add `@testing-library/react` as devDependency** — It is NOT currently in `packages/cqrs-client/package.json`. Run `pnpm --filter @hexalith/cqrs-client add -D @testing-library/react`. With React 19, `renderHook` is available directly from `@testing-library/react` (no need for `@testing-library/react-hooks`).
- **Update `vitest.config.ts` for jsdom** — The current config does NOT specify `environment: 'jsdom'`. Add `environment: 'jsdom'` to the test config for `.test.tsx` files (React hooks need DOM simulation). Recommended: set globally in vitest.config.ts since all hook tests need it.

### Critical: fetchClient Extension for ETag Support

The current `FetchClient` interface (from Story 2.2) only returns parsed JSON (`Promise<T>`). It cannot:
1. Return response headers (needed to read `ETag`)
2. Handle `304 Not Modified` responses (treated as errors by `!response.ok`)

**Required extension** — Add `postForQuery<T>` to the `FetchClient` interface:

```typescript
// Discriminated union — check status before accessing data
type QueryResponse<T> =
  | { status: 200; data: T; etag: string | null }
  | { status: 304; data: null; etag: null };

// In createFetchClient, add:
async function postForQuery<T>(path: string, options?: FetchRequestOptions): Promise<QueryResponse<T>> {
  // Same header setup as existing request()
  const headers = { ...options?.headers };
  headers['Content-Type'] = 'application/json';
  headers['X-Correlation-ID'] = options?.correlationId ?? generateCorrelationId();
  const token = await tokenGetter();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${normalizedBaseUrl}${path}`, {
    method: 'POST',
    headers,
    body: options?.body != null ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
  });

  // 304 — data unchanged, caller uses cache
  if (response.status === 304) {
    return { status: 304, data: null, etag: null };
  }

  // Non-OK (except 304) — delegate to error parsing
  if (!response.ok) {
    throw await parseProblemDetails(response);
  }

  // Only 200 is expected — guard against unexpected OK statuses (202, 201, etc.)
  if (response.status !== 200) {
    throw new ApiError(response.status, `Unexpected status from query endpoint: ${response.status}`);
  }

  // 200 — parse body, extract ETag
  const data = await response.json() as T;
  const etag = response.headers.get('ETag');
  return { status: 200, data, etag };
}
```

This keeps the existing `post` and `get` methods unchanged (zero regression). The `postForQuery` method is only used by `useQuery` internally.

### ETag Cache Design

```
Cache Key: "{tenantId}:{domain}:{queryType}:{aggregateId}:{entityId?}"

Example keys:
  "tenant-1:Orders:GetOrderList::"        (list query, no aggregateId/entityId)
  "tenant-1:Orders:GetOrderDetail:ord-123:" (single aggregate, no entityId)
  "tenant-1:Inventory:GetStock:wh-1:sku-42" (aggregate + entity)

Storage: in-memory Map<string, { data: unknown; etag: string }>
Lifecycle: created per QueryProvider instance, cleared on tenant switch, garbage-collected on page refresh
```

The cache is intentionally simple — no TTL, no LRU eviction, no persistence. Projections are small and the cache resets on page refresh. Story 2.7 (SignalR) and Story 2.5 (command-complete invalidation) will add more sophisticated invalidation triggers.

**Known MVP limitations:**
- **No eviction policy** — a power user navigating many projections accumulates entries until page refresh. Acceptable for MVP; add LRU/TTL eviction in Story 2.8 if needed.
- **Stale tenant entries after switch** — if a request is in-flight when tenant changes, the response may store an entry keyed to the old tenant after `clear()`. These entries are harmless (cache key includes tenant ID, so they never match new-tenant queries) and are garbage-collected on page refresh.
- **No in-flight request deduplication** — two components mounting simultaneously with the same `queryParams` make two independent requests. After the first caches its ETag, the second's refetch gets a 304. Acceptable for MVP; true deduplication would require a pending-request registry.
- **High-density query pages** — for pages with many active `useQuery` hooks (10+), use `refetchInterval` sparingly and consider `enabled: false` for off-screen queries. Window-focus refetch fires all hooks simultaneously; prefer `refetchOnWindowFocus: false` for dashboards and rely on `refetchInterval` instead.

### useQuery Hook Lifecycle

```
Mount (enabled=true)
  │
  ├─ Initial fetch → isLoading=true
  │   ├─ 200 + ETag → validate Zod → cache → data=T, isLoading=false
  │   ├─ 200 no ETag → validate Zod → data=T, isLoading=false (no caching)
  │   ├─ Zod failure → error=ValidationError, isLoading=false
  │   └─ Fetch error → error propagates to ErrorBoundary
  │
  ├─ Subsequent fetches (refetch/interval/focus) → isLoading stays false
  │   ├─ If-None-Match sent (if cached ETag exists)
  │   ├─ 304 → return cached data (no re-validation needed)
  │   ├─ 200 → validate Zod → update cache → update data
  │   └─ Error → set error (data stays — stale-but-valid, see note below)
  │
  ├─ Tenant change → cache cleared → re-fetch (cold start)
  │
  └─ Unmount → abort in-flight, clear intervals, remove event listeners
```

**Dual-state: `error` + `data` both set (stale-but-valid):** When a refetch fails but previous data exists, the hook sets `error` without clearing `data`. Module developers should handle this: `error` means "latest fetch failed" while `data` means "last known good value." Display both — show data with an error indicator, not a blank error screen. This prevents content flash on transient network errors.

**Window-focus burst risk:** With `refetchOnWindowFocus: true` (the default), alt-tabbing back triggers a re-fetch for every active `useQuery` instance simultaneously. With ETag caching, most return 304 (cheap), but the burst still hits the server. For dashboards with many queries, module developers should consider `refetchOnWindowFocus: false` and rely on `refetchInterval` instead. Debouncing window-focus refetches across multiple hooks is deferred to Story 2.5/2.8.

### Design Decision: `safeParse` over `parse`

Use `schema.safeParse(payload)` — NOT `schema.parse(payload)`:
- `parse` throws `ZodError` which would need try/catch
- `safeParse` returns `{ success: boolean, data?, error? }` — no throw
- On failure: `new ValidationError(result.error.issues)` set on `error` return value
- Consistent with "errors via return value" architecture rule

### Design Decision: QueryProvider Nested Inside CqrsProvider

`QueryProvider` is nested inside `CqrsProvider` (not a sibling in the shell provider tree) because:
1. It needs `fetchClient` from CqrsProvider
2. Module developers only add one provider (`CqrsProvider`) — simpler DX
3. Future Story 2.5 will wire `commandEventBus` → query re-fetch inside this nesting

The shell's `ShellProviders.tsx` does NOT need changes for this story (CqrsProvider was already added in Story 2.3).

### File Structure (Target)

```
packages/cqrs-client/
├── src/
│   ├── index.ts                        # Add query hook exports
│   ├── errors.ts                       # (Story 2.1) — ValidationError used by useQuery
│   ├── core/
│   │   ├── fetchClient.ts              # MODIFIED — add postForQuery method
│   │   ├── fetchClient.test.ts         # MODIFIED — add postForQuery tests
│   │   ├── types.ts                    # (Story 2.1) — SubmitQueryRequest, SubmitQueryResponse
│   │   ├── correlationId.ts            # (Story 2.1) — used by fetchClient
│   │   ├── problemDetails.ts           # (Story 2.1) — used by fetchClient
│   │   ├── ICommandBus.ts             # (Story 2.1) — NOT used
│   │   └── IQueryBus.ts              # (Story 2.1) — NOT used by hooks directly
│   ├── commands/                       # (Story 2.3) — NOT modified
│   │   ├── CqrsProvider.tsx            # MODIFIED — nest QueryProvider inside
│   │   ├── CqrsProvider.test.tsx       # MODIFIED — verify QueryProvider nesting
│   │   ├── commandEventBus.ts          # (Story 2.3) — NOT modified
│   │   ├── useSubmitCommand.ts         # (Story 2.3) — NOT modified
│   │   ├── useCommandStatus.ts         # (Story 2.3) — NOT modified
│   │   └── useCommandPipeline.ts       # (Story 2.3) — NOT modified
│   └── queries/                        # THIS STORY — new directory
│       ├── etagCache.ts                # ETagCache factory + types + buildCacheKey
│       ├── etagCache.test.ts           # Cache tests
│       ├── QueryProvider.tsx           # QueryProvider + useQueryClient context
│       ├── QueryProvider.test.tsx       # Provider tests
│       ├── useQuery.ts                 # Query hook
│       └── useQuery.test.ts            # Query hook tests
```

### Naming Conventions

| Element             | Convention          | Example                                                |
| ------------------- | ------------------- | ------------------------------------------------------ |
| Hook                | camelCase with `use` | `useQuery`                                            |
| Provider component  | PascalCase           | `QueryProvider`                                        |
| Context hook        | camelCase with `use` | `useQueryClient`                                      |
| Type params         | PascalCase           | `QueryParams`, `QueryOptions`, `UseQueryResult<T>`     |
| Cache key builder   | camelCase            | `buildCacheKey`                                        |
| Cache type          | PascalCase           | `ETagCache`, `CacheEntry`                              |
| Zod schemas         | PascalCase + Schema  | `OrderViewSchema` (defined by module dev, not us)      |
| Inferred types      | PascalCase           | `type OrderView = z.infer<typeof OrderViewSchema>`     |

### Implementation Sketches

**etagCache.ts:**
```typescript
export interface CacheEntry<T = unknown> {
  data: T;
  etag: string;
}

export interface ETagCache {
  get(key: string): CacheEntry | undefined;
  set(key: string, entry: CacheEntry): void;
  clear(): void;
}

export function buildCacheKey(tenantId: string, params: { domain: string; queryType: string; aggregateId?: string; entityId?: string }): string {
  return `${tenantId}:${params.domain}:${params.queryType}:${params.aggregateId ?? ''}:${params.entityId ?? ''}`;
}

export function createETagCache(): ETagCache {
  const store = new Map<string, CacheEntry>();
  return {
    get: (key) => store.get(key),
    set: (key, entry) => store.set(key, entry),
    clear: () => store.clear(),
  };
}
```

**useQuery.ts (core fetch logic):**
```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTenant } from '@hexalith/shell-api';
import type { z } from 'zod';
import { useQueryClient } from './QueryProvider';
import { buildCacheKey } from './etagCache';
import { ValidationError } from '../errors';
import type { SubmitQueryResponse } from '../core/types';
import type { HexalithError } from '../errors';

export interface QueryParams {
  domain: string;
  queryType: string;
  aggregateId?: string;
  entityId?: string;
}

export interface QueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: HexalithError | null;
  refetch: () => void;
}

export function useQuery<T>(
  schema: z.ZodType<T>,
  queryParams: QueryParams,
  options?: QueryOptions,
): UseQueryResult<T> {
  const { fetchClient, etagCache } = useQueryClient();
  // activeTenant is string | null (plain tenant ID, NOT an object)
  const { activeTenant } = useTenant();
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<HexalithError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialFetchRef = useRef(true);

  const enabled = options?.enabled ?? true;
  const refetchInterval = options?.refetchInterval;
  const refetchOnWindowFocus = options?.refetchOnWindowFocus ?? true;

  // Stabilize queryParams into a string key to avoid infinite useCallback re-creation
  // (object literals create new references every render)
  const paramsKey = `${queryParams.domain}:${queryParams.queryType}:${queryParams.aggregateId ?? ''}:${queryParams.entityId ?? ''}`;

  const fetchData = useCallback(async (isInitial: boolean) => {
    if (!activeTenant) {
      setError(new Error('No active tenant') as unknown as HexalithError);
      return;
    }

    // Only set isLoading on initial fetch
    if (isInitial) setIsLoading(true);

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // Combine manual abort with 30s timeout to prevent hanging on slow backends
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);

    // activeTenant IS the tenant ID string — no .id needed
    const cacheKey = buildCacheKey(activeTenant, queryParams);
    const cached = etagCache.get(cacheKey);
    const headers: Record<string, string> = {};
    if (cached) {
      headers['If-None-Match'] = `"${cached.etag}"`;
    }

    const body = {
      tenant: activeTenant,  // string, not activeTenant.id
      domain: queryParams.domain,
      queryType: queryParams.queryType,
      aggregateId: queryParams.aggregateId ?? '',  // required in SubmitQueryRequest, default empty
      entityId: queryParams.entityId,
    };

    try {
      const response = await fetchClient.postForQuery<SubmitQueryResponse>(
        '/api/v1/queries',
        { body, headers, signal },
      );

      // Ignore response if this request was aborted (stale)
      if (controller.signal.aborted) return;

      if (response.status === 304 && cached) {
        // Data unchanged — use cache
        setData(cached.data as T);
      } else if (response.status === 200) {
        // Validate payload with Zod
        const result = schema.safeParse(response.data.payload);
        if (!result.success) {
          setError(new ValidationError(result.error.issues));
          if (isInitial) setIsLoading(false);
          return;
        }

        // Update cache
        if (response.etag) {
          etagCache.set(cacheKey, { data: result.data, etag: response.etag });
        }
        setData(result.data);
      }

      setError(null);
    } catch (err) {
      // AbortError means we cancelled — ignore
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // TimeoutError from AbortSignal.timeout — surface as user-facing error
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        setError(new ApiError(0, 'Query timed out after 30 seconds') as unknown as HexalithError);
        return;
      }
      // Infrastructure errors (AuthError, ForbiddenError, etc.) — set error
      // They will propagate to ModuleErrorBoundary via the error return value
      setError(err as HexalithError);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [activeTenant, paramsKey, fetchClient, etagCache, schema]);
  // NOTE: paramsKey (string) instead of queryParams (object) prevents infinite re-renders

  // Effect: initial fetch + refetch on param change
  useEffect(() => {
    if (!enabled) return;
    isInitialFetchRef.current = true;
    fetchData(true);
    isInitialFetchRef.current = false;

    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, fetchData]);

  // Effect: polling interval
  useEffect(() => {
    if (!enabled || !refetchInterval) return;
    intervalRef.current = setInterval(() => fetchData(false), refetchInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refetchInterval, fetchData]);

  // Effect: refetch on window focus
  useEffect(() => {
    if (!enabled || !refetchOnWindowFocus) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchData(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, refetchOnWindowFocus, fetchData]);

  const refetch = useCallback(() => { fetchData(false); }, [fetchData]);

  return { data, isLoading, error, refetch };
}
```

### Backend API Endpoint (Reference)

| Endpoint | Method | Request Body | Response |
|----------|--------|-------------|----------|
| `/api/v1/queries` | POST | `SubmitQueryRequest` (tenant auto-injected) | 200 + `{ correlationId, payload }` + `ETag` header, or 304 (with `If-None-Match`) |

**Request body shape** (from `src/core/types.ts`):
```typescript
interface SubmitQueryRequest {
  tenant: string;       // auto-injected from useTenant()
  domain: string;       // from queryParams
  aggregateId: string;  // from queryParams
  queryType: string;    // from queryParams
  payload?: unknown;    // not used by useQuery (reserved for future)
  entityId?: string;    // from queryParams (optional)
}
```

**Response body shape** (from `src/core/types.ts`):
```typescript
interface SubmitQueryResponse {
  correlationId: string;
  payload: unknown;      // validated by Zod schema
}
```

### Module Developer Usage (Reference — NOT part of this implementation)

```typescript
// In a module component:
import { z } from 'zod';
import { useQuery } from '@hexalith/cqrs-client';

const OrderViewSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  status: z.enum(['draft', 'placed', 'shipped', 'delivered']),
  total: z.number(),
  createdAt: z.string().datetime(),
});
type OrderView = z.infer<typeof OrderViewSchema>;

function OrderListPage() {
  const { data, isLoading, error, refetch } = useQuery(OrderViewSchema, {
    domain: 'Orders',
    queryType: 'GetOrderList',
  });

  if (isLoading) return <Skeleton variant="table" rows={5} />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  return <Table data={data} ... />;
}
```

### Testing Strategy

- **Environment:** `jsdom` — hooks use React, tests need DOM simulation. Add `environment: 'jsdom'` to `vitest.config.ts` or use per-file `// @vitest-environment jsdom` directives for `.test.tsx` files.
- **Hook testing:** Use `@testing-library/react`'s `renderHook` and `act`. With React 19, `renderHook` is available directly from `@testing-library/react`.
- **Mocking FetchClient:** Create mock with `vi.fn()` for `post`, `get`, and `postForQuery` methods.
- **Mocking useTenant:** `vi.mock('@hexalith/shell-api')` → return `{ activeTenant: 'test-tenant' }` (note: `activeTenant` is a plain string, NOT an object).
- **ETag flow tests:** Mock `postForQuery` to return `{ data, status: 200, etag: 'abc' }` first call, then `{ data: null, status: 304, etag: null }` second call. Verify `If-None-Match` header sent on second call.
- **Polling tests:** `vi.useFakeTimers()` + `vi.advanceTimersByTime(interval)` to test refetchInterval.
- **Window focus tests:** Spy on `addEventListener`/`removeEventListener`, then dispatch `visibilitychange` event with `document.visibilityState = 'visible'`.
- **Wrapper pattern:**
  ```typescript
  const wrapper = ({ children }) => (
    <QueryProvider fetchClient={mockFetchClient}>
      {children}
    </QueryProvider>
  );
  // Note: must also mock useTenant() via vi.mock
  ```
- **No MSW** — Unit tests of hook logic, NOT integration tests.

### Previous Story Intelligence (Story 2.3)

- **CqrsProvider** provides `fetchClient` and `commandEventBus` via `useCqrs()` context hook
- **CqrsProvider** location: `src/commands/CqrsProvider.tsx` — this story nests QueryProvider inside it
- **Provider tree after this story:** CqrsProvider → QueryProvider → children
- **Return shape convention:** All hooks return named objects, never tuples
- **Testing pattern:** Mock `createFetchClient`, `useTenant`; use `renderHook` + `act`; `jsdom` environment

### Previous Story Intelligence (Story 2.2)

- **`createFetchClient` is NOT exported** from `src/index.ts` — import from `../core/fetchClient` internally
- **FetchClient interface:** `{ post<T>, get<T> }` — this story adds `postForQuery<T>`
- **Token injection is automatic** — `tokenGetter()` called on every request
- **Error handling** — Non-OK responses throw typed `HexalithError` via `parseProblemDetails`
- **Correlation ID** — Auto-generated per request (ULID)

### UX Context

The `useQuery` hook enables the data loading pattern:

| State | Hook Return | Visual (Story 3+) |
|-------|-----------|-------------------|
| Loading | `isLoading: true, data: undefined` | Content-aware skeleton |
| Data | `isLoading: false, data: T` | Rendered content |
| Error | `error: HexalithError` | ErrorDisplay with retry |
| Stale (refetch) | `isLoading: false, data: T (previous)` | Content visible, no skeleton |

Module developers use `useQuery().data` / `useQuery().isLoading` / `useQuery().error` to drive this UI pattern. The hooks provide the state; `@hexalith/ui` components (Story 3+) provide the visual treatment.

[Source: ux-design-specification.md § Loading State Pattern, architecture.md lines 1025-1039]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4, lines 803-840] — Acceptance criteria, BDD scenarios
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture, lines 220-285] — Projection caching strategy, ETag flow, Zod validation, cache key pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns, lines 328-339] — POST /api/v1/queries endpoint spec
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Standards, lines 432-471] — ValidationError, HexalithError hierarchy
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Boundary Hierarchy, lines 473-483] — Error propagation: useQuery → module boundary → shell
- [Source: _bmad-output/planning-artifacts/architecture.md#React Context Provider Pattern, lines 993-1017] — Provider pattern for QueryProvider
- [Source: _bmad-output/planning-artifacts/architecture.md#Hook Return Value Shape, lines 979-991] — Object destructuring, never tuples
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading State Pattern] — Skeleton → data → error pattern
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-15.md] — useProjection → useQuery, TanStack Query → ETag, Phase 3 sequencing
- [Source: _bmad-output/implementation-artifacts/2-3-command-hooks-submit-status-pipeline.md] — CqrsProvider, fetchClient access, testing patterns
- [Source: packages/cqrs-client/src/core/fetchClient.ts] — FetchClient interface, createFetchClient factory
- [Source: packages/cqrs-client/src/core/types.ts] — SubmitQueryRequest, SubmitQueryResponse
- [Source: packages/cqrs-client/src/errors.ts] — HexalithError hierarchy, ValidationError (ZodIssue[])
- [Source: packages/cqrs-client/src/core/IQueryBus.ts] — IQueryBus interface (reference, not directly used by hook)
- [Source: packages/shell-api/src/tenant/TenantProvider.tsx] — useTenant() hook, activeTenant

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
