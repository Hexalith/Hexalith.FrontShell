# Story 2.9: Pre-flight Authorization Validation

Status: ready-for-dev

## Story

As a module developer,
I want to check whether the current user is authorized to execute a command or query before showing the UI for it,
So that I can hide or disable buttons and forms the user cannot use, avoiding unnecessary rate limit consumption.

## Acceptance Criteria

1. **Given** `useCanExecuteCommand` hook is created in `src/validation/useCanExecute.ts`
   **When** a module developer calls `const { isAuthorized, reason, isLoading } = useCanExecuteCommand({ domain, commandType, aggregateId? })`
   **Then** a `POST /api/v1/commands/validate` request is sent with `{ tenant, domain, commandType, aggregateId? }`
   **And** the hook returns `{ isAuthorized: boolean, reason?: string, isLoading: boolean, error: HexalithError | null }`

2. **Given** `useCanExecuteQuery` hook is created in the same file
   **When** a module developer calls `const { isAuthorized, reason, isLoading } = useCanExecuteQuery({ domain, queryType, aggregateId? })`
   **Then** a `POST /api/v1/queries/validate` request is sent with `{ tenant, domain, queryType, aggregateId? }`
   **And** the hook returns the same shape as `useCanExecuteCommand`

3. **Given** the backend returns `{ isAuthorized: false, reason: "Insufficient tenant permissions" }`
   **When** the hook processes the response
   **Then** `isAuthorized` is `false` and `reason` contains the explanation
   **And** the module developer can use this to disable a button with a tooltip showing the reason

4. **Given** the validation endpoint returns a network error or 503
   **When** the hook processes the failure
   **Then** `isAuthorized` defaults to `false` (fail-closed)
   **And** `reason` is set to `"Authorization service unavailable"`

5. **Given** multiple components check the same authorization
   **When** identical validation requests are made within 30 seconds
   **Then** the result is cached in-memory to avoid redundant API calls
   **And** tenant switch produces different cache keys (tenant-scoped), so no stale cross-tenant results are served

## Tasks / Subtasks

- [ ] Task 1: Add `ValidateQueryRequest` type to `src/core/types.ts` (AC: #2)
  - [ ] 1.1 Add `ValidateQueryRequest` interface: `{ tenant: string; domain: string; queryType: string; aggregateId?: string; }` directly below the existing `ValidateCommandRequest` type
  - [ ] 1.2 Export `ValidateQueryRequest` from `src/index.ts` alongside `ValidateCommandRequest`

- [ ] Task 2: Create pre-flight validation cache in `src/validation/preflightCache.ts` (AC: #5)
  - [ ] 2.1 Create `src/validation/preflightCache.ts` with an in-memory `Map<string, { result: PreflightValidationResult; timestamp: number }>` keyed by `{tenant}:{endpoint}:{domain}:{type}:{aggregateId?}`
  - [ ] 2.2 Implement `IPreflightCache` interface with `get(key: string): PreflightValidationResult | undefined` (returns undefined if entry expired beyond `TTL_MS = 30_000`), `set(key: string, result: PreflightValidationResult): void`, and `clear(): void`
  - [ ] 2.3 Implement `createPreflightCache(): IPreflightCache` factory function (same factory pattern as `createETagCache()`)
  - [ ] 2.4 Implement `buildPreflightCacheKey(tenant: string, endpoint: string, params: { domain: string; type: string; aggregateId?: string }): string` — key format: `{tenant}:{endpoint}:{domain}:{type}:{aggregateId?}`
  - [ ] 2.5 Create `src/validation/preflightCache.test.ts` with unit tests: cache hit within TTL, cache miss after TTL, clear empties all entries, buildPreflightCacheKey format correctness

- [ ] Task 3: Inject `preflightCache` into `CqrsProvider` context (AC: #5)
  - [ ] 3.1 Add `preflightCache: IPreflightCache` to `CqrsContextValue` interface in `src/CqrsProvider.tsx`
  - [ ] 3.2 Create the cache in `CqrsProvider` via `useMemo(() => createPreflightCache(), [])`
  - [ ] 3.3 Include `preflightCache` in the context `value` memo alongside `fetchClient` and `commandEventBus`
  - [ ] 3.4 Update `CqrsProvider.test.tsx` to verify `preflightCache` is provided in context
  - **Note**: No explicit tenant-switch cache clearing needed. Cache keys are tenant-scoped (`{tenant}:endpoint:...`), so tenant switch naturally produces different keys. Old entries expire via 30s TTL. This avoids adding `useTenant()` to `CqrsProvider` (which is currently tenant-agnostic).

- [ ] Task 4: Create `useCanExecuteCommand` hook in `src/validation/useCanExecute.ts` (AC: #1, #3, #4, #5)
  - [ ] 4.1 Create `src/validation/useCanExecute.ts`
  - [ ] 4.2 Define input types: `CanExecuteCommandParams = { domain: string; commandType: string; aggregateId?: string }` and `CanExecuteQueryParams = { domain: string; queryType: string; aggregateId?: string }`
  - [ ] 4.3 Define return type: `UseCanExecuteResult = { isAuthorized: boolean; reason: string | undefined; isLoading: boolean; error: HexalithError | null }` — the `error` field follows the convention of `useQuery` and `useSubmitCommand`. It is `null` on success, set to the caught error on 5xx/network failures (alongside `isAuthorized: false`). It allows module developers to distinguish "unauthorized by policy" (`error: null, isAuthorized: false`) from "service unavailable" (`error: ApiError, isAuthorized: false`).
  - [ ] 4.4 Implement `useCanExecuteCommand(params: CanExecuteCommandParams): UseCanExecuteResult`:
    - Get `fetchClient` and `preflightCache` from `useCqrs()`, and `activeTenant` from `useTenant()`
    - Create an `AbortController` on mount; abort on unmount or param change to prevent state updates after unmount
    - On mount / param change: check cache first. If hit, return cached result immediately (no fetch)
    - On cache miss: `POST /api/v1/commands/validate` with body `{ tenant: activeTenant, domain, commandType, aggregateId? }` and `{ signal: controller.signal }`
    - Parse response as `PreflightValidationResult`
    - Store result in cache
    - On `AuthError` (401): re-throw — let the error propagate to the auth layer for token refresh handling. Do NOT fail-closed on auth errors.
    - On `RateLimitError` (429): re-throw — let the error propagate. The user IS authorized; they are rate-limited. Do NOT disable UI for rate limiting.
    - On 5xx, network errors, or other unexpected errors: set `isAuthorized = false`, `reason = "Authorization service unavailable"` (fail-closed per AC #4)
    - On `AbortError`: silently ignore (component unmounted or params changed)
    - `isLoading = true` only during the network request

- [ ] Task 5: Create `useCanExecuteQuery` hook in the same file (AC: #2, #3, #4, #5)
  - [ ] 5.1 Implement `useCanExecuteQuery(params: CanExecuteQueryParams): UseCanExecuteResult` following the exact same pattern as `useCanExecuteCommand` but posting to `/api/v1/queries/validate` with `{ tenant, domain, queryType, aggregateId? }`
  - [ ] 5.2 Both hooks share the same `preflightCache` from `useCqrs()` context and the same `UseCanExecuteResult` return type

- [ ] Task 6: Export new hooks and types from `src/index.ts` (AC: #1, #2)
  - [ ] 6.1 Add exports to `src/index.ts`:
    ```typescript
    // Validation (pre-flight authorization)
    export { useCanExecuteCommand, useCanExecuteQuery } from "./validation/useCanExecute";
    export type { CanExecuteCommandParams, CanExecuteQueryParams, UseCanExecuteResult } from "./validation/useCanExecute";
    ```
  - [ ] 6.2 Add `ValidateQueryRequest` to the existing type exports from `./core/types`

- [ ] Task 7: Create comprehensive tests in `src/validation/useCanExecute.test.ts` (AC: all)
  - [ ] 7.1 Test: `"useCanExecuteCommand returns isAuthorized=true when backend authorizes"` -- mock fetchClient.post to return `{ isAuthorized: true }`, verify hook returns `{ isAuthorized: true, reason: undefined, isLoading: false, error: null }`
  - [ ] 7.2 Test: `"useCanExecuteCommand returns isAuthorized=false with reason when backend denies"` -- mock returns `{ isAuthorized: false, reason: "Insufficient tenant permissions" }`, verify hook returns `{ isAuthorized: false, reason: "Insufficient tenant permissions", isLoading: false }`
  - [ ] 7.3 Test: `"useCanExecuteCommand returns isLoading=true during fetch"` -- use deferred promise for fetchClient.post, verify `isLoading: true` while in-flight, then `false` after resolution
  - [ ] 7.4 Test: `"useCanExecuteCommand fails closed on network error"` -- mock fetchClient.post to reject with TypeError, verify `{ isAuthorized: false, reason: "Authorization service unavailable", isLoading: false, error: <the TypeError wrapped or as-is> }`. The `error` field lets module developers distinguish "service down" from "unauthorized by policy" (which has `error: null`).
  - [ ] 7.5 Test: `"useCanExecuteCommand fails closed on 503"` -- mock fetchClient.post to throw ApiError(503), verify same fail-closed behavior with `error` set to the ApiError instance
  - [ ] 7.6 Test: `"useCanExecuteCommand propagates AuthError on 401"` -- mock fetchClient.post to throw AuthError, verify the error is NOT caught (propagates to error boundary / auth layer). Hook should NOT set `isAuthorized: false` for auth errors — the user's session needs refresh, not UI disabling.
  - [ ] 7.7 Test: `"useCanExecuteCommand propagates RateLimitError on 429"` -- mock fetchClient.post to throw RateLimitError, verify the error propagates. The user IS authorized, just throttled — do not disable UI.
  - [ ] 7.8 Test: `"useCanExecuteCommand caches result within 30 seconds"` -- first call hits API, second identical call within TTL returns cached result without API call. Verify fetchClient.post called exactly once
  - [ ] 7.9 Test: `"useCanExecuteCommand re-fetches after cache TTL expires"` -- use vi.useFakeTimers(), advance past 30 seconds, verify second call makes a new API request. Call `vi.useRealTimers()` in cleanup
  - [ ] 7.10 Test: `"useCanExecuteCommand re-fetches after tenant switch (different cache key)"` -- cache a result for tenant A, switch to tenant B, verify next call makes a new API request (different tenant produces different cache key, so no cache hit)
  - [ ] 7.11 Test: `"useCanExecuteCommand sends correct request body"` -- verify fetchClient.post receives `/api/v1/commands/validate` with `{ tenant, domain, commandType, aggregateId }`
  - [ ] 7.12 Test: `"useCanExecuteQuery posts to /api/v1/queries/validate"` -- verify fetchClient.post receives the query validation endpoint with `{ tenant, domain, queryType, aggregateId }`
  - [ ] 7.13 Test: `"useCanExecuteQuery shares cache with separate cache keys"` -- verify command and query validations use different cache keys (different endpoints), ensuring no cross-contamination
  - [ ] 7.14 Test: `"hooks do not fetch when no active tenant"` -- verify that when activeTenant is null, the hooks return `{ isAuthorized: false, reason: "No active tenant", isLoading: false }` without making API calls
  - [ ] 7.15 Test: `"useCanExecuteCommand re-fetches when params change"` -- render with domain="Orders", verify fetch, then rerender with domain="Inventory", verify a new fetch is made to the correct endpoint with updated params
  - [ ] 7.16 Test: `"useCanExecuteCommand does not update state after unmount"` -- start a fetch with deferred promise, unmount the hook, resolve the promise, verify no React "state update on unmounted component" warning. This validates the AbortController cleanup.

- [ ] Task 8: Run all tests and lint (AC: all)
  - [ ] 8.1 Run full test suite: `pnpm test` -- all existing tests + new tests pass
  - [ ] 8.2 Run lint: `pnpm lint` clean
  - [ ] 8.3 Run full monorepo build: `pnpm build` succeeds

## Dev Notes

### Architecture Compliance

- **Ports-and-adapters pattern**: The hooks use `fetchClient` from `CqrsProvider` for all HTTP calls. No direct `fetch()` calls.
- **Object destructuring returns** (never tuples) for all hooks: `{ isAuthorized, reason, isLoading, error }`.
- **`I` prefix** for interfaces (e.g., `IPreflightCache`).
- **Co-located tests**: `useCanExecute.test.ts` next to `useCanExecute.ts`, and `preflightCache.test.ts` next to `preflightCache.ts`.
- **Pre-flight validation is optional** -- module developers can skip it entirely and handle 403 errors from failed commands/queries instead.
- **Fail-closed security** -- on 5xx and network errors, the hooks default to `isAuthorized: false`. AuthError (401) and RateLimitError (429) propagate to their respective handlers (auth layer / error boundary) — these are NOT authorization failures.
- **Context-injected cache** -- `preflightCache` lives in `CqrsProvider` context (same pattern as `etagCache` in `QueryProvider`), providing test isolation and proper lifecycle management. No module-level singletons.

### Critical Constraints

- **DO NOT add TanStack Query** -- removed per sprint change. All hooks use custom state management.
- **DO NOT modify existing hooks** (`useQuery`, `useSubmitCommand`, `useCommandPipeline`) -- this is a new, independent feature.
- **DO NOT modify `fetchClient.ts`** -- the existing `post<T>()` method is sufficient for validation requests. The validation endpoints return simple JSON, not query responses with ETags.
- **DO NOT add Zod validation** to preflight responses -- the backend returns a simple `{ isAuthorized, reason? }` shape that matches `PreflightValidationResult` exactly. Zod validation is for projection data crossing trust boundaries (complex, unknown shapes). Preflight results are a fixed, two-field contract.
- **DO NOT create a NEW provider/context** for the preflight cache -- instead, add `preflightCache` to the existing `CqrsContextValue` in `CqrsProvider.tsx`. This matches the `etagCache` pattern in `QueryProvider`, provides test isolation (each test wraps with fresh `CqrsProvider`), and avoids module-level singletons that leak state across tests.
- **Cache TTL is exactly 30 seconds** -- per AC #5. Not configurable. Do NOT expose TTL as a hook option.
- **Cache key must include endpoint** to prevent command/query result cross-contamination: `{tenant}:commands/validate:{domain}:{commandType}:{aggregateId?}` vs `{tenant}:queries/validate:{domain}:{queryType}:{aggregateId?}`.
- **All `src/` paths are relative to `packages/cqrs-client/`** -- e.g., `src/validation/useCanExecute.ts` means `packages/cqrs-client/src/validation/useCanExecute.ts`.
- **Use `useCqrs()` (not `useQueryClient()`)** to get the fetchClient -- validation hooks are general-purpose infrastructure, not query-specific. They depend on `CqrsProvider` context.
- **AbortController required** -- create an `AbortController` in the fetch `useEffect`. Abort on cleanup (unmount or param change) to prevent React "state update on unmounted component" warnings. Pass `{ signal: controller.signal }` to `fetchClient.post()`. On `AbortError` (from `DOMException`), silently ignore — the component is gone.
- **No retry logic** -- if the validation endpoint fails, fail-closed immediately (for 5xx/network). Do not add backoff/retry (unlike `useQuery`). The module developer can re-render to retry.
- **Error handling is type-specific** -- `AuthError` (401) and `RateLimitError` (429) MUST propagate (re-throw), not be caught. 401 means the session needs refresh (auth layer handles it). 429 means the user IS authorized but throttled (UI should not be disabled). Only 5xx, network errors, and unexpected errors trigger fail-closed behavior.

### Existing Code -- DO NOT Reinvent

| What | Where | Status |
|------|-------|--------|
| `ValidateCommandRequest` type | `src/core/types.ts` | EXISTS -- use as-is |
| `PreflightValidationResult` type | `src/core/types.ts` | EXISTS -- use as-is |
| `FetchClient.post<T>()` method | `src/core/fetchClient.ts` | EXISTS -- use for validation POSTs |
| `useCqrs()` hook | `src/CqrsProvider.tsx` | EXISTS -- use to get fetchClient AND preflightCache |
| `CqrsContextValue` interface | `src/CqrsProvider.tsx` | MODIFY -- add `preflightCache: IPreflightCache` field |
| `useTenant()` hook | `@hexalith/shell-api` | EXISTS -- use to get activeTenant |
| `HexalithError` hierarchy | `src/errors.ts` | EXISTS -- errors from fetchClient are already typed |
| `createETagCache()` pattern | `src/queries/etagCache.ts` | PATTERN REFERENCE -- follow same factory pattern for preflightCache |
| `buildCacheKey()` pattern | `src/queries/etagCache.ts` | PATTERN REFERENCE -- follow same key-building pattern |
| `MockCommandBus` / `MockQueryBus` | `src/mocks/` | NOT NEEDED -- preflight hooks use fetchClient directly, mock fetchClient in tests |

### What This Story Is About

**This is a new feature story adding two hooks and a cache module.** Unlike story 2-8 (audit/test), this story creates new production code:

1. **`preflightCache.ts`** -- simple TTL cache (30s), same factory pattern as `etagCache.ts`
2. **`useCanExecuteCommand`** -- hook that POSTs to `/api/v1/commands/validate`, caches result
3. **`useCanExecuteQuery`** -- hook that POSTs to `/api/v1/queries/validate`, caches result
4. **Types** -- add `ValidateQueryRequest` to `types.ts`
5. **Exports** -- add all new public API to `index.ts`

Both hooks are **public API** for module developers. They follow existing hook conventions: object return, `isLoading` pattern, error surfacing.

### Backend API Contracts

**Command validation:**
```
POST /api/v1/commands/validate
Content-Type: application/json
Authorization: Bearer {token}
X-Correlation-ID: {ulid}

{
  "tenant": "acme-corp",
  "domain": "Orders",
  "commandType": "CreateOrder",
  "aggregateId": "ord-123"   // optional
}

→ 200 { "isAuthorized": true }
→ 200 { "isAuthorized": false, "reason": "Insufficient tenant permissions" }
→ 503 (service unavailable → fail-closed)
```

**Query validation:**
```
POST /api/v1/queries/validate
Content-Type: application/json
Authorization: Bearer {token}
X-Correlation-ID: {ulid}

{
  "tenant": "acme-corp",
  "domain": "Orders",
  "queryType": "GetOrderList",
  "aggregateId": "ord-123"   // optional
}

→ 200 { "isAuthorized": true }
→ 200 { "isAuthorized": false, "reason": "No read access to Orders" }
→ 503 (service unavailable → fail-closed)
```

### Hook Usage Examples (for test guidance)

```typescript
// Module developer usage -- command authorization
const { isAuthorized, reason, isLoading, error } = useCanExecuteCommand({
  domain: "Orders",
  commandType: "CreateOrder",
});

// Recommended UI pattern: optimistic during loading, disabled only when definitively unauthorized
// This avoids a flash of disabled state during the brief preflight check.
// The backend (403 on command submit) is the real security gate; preflight is a UX optimization.
<Button disabled={!isAuthorized && !isLoading} title={reason}>
  Create Order
</Button>

// Alternative: conservative pattern (disabled during loading)
// Use this only if showing an unauthorized action briefly is unacceptable.
<Button disabled={!isAuthorized || isLoading} title={reason}>
  Create Order
</Button>

// Distinguishing "unauthorized" from "service down"
if (error) {
  // Service unavailable — show retry guidance, not "you lack permission"
} else if (!isAuthorized) {
  // Backend says unauthorized — show reason tooltip
}

// Module developer usage -- query authorization
const { isAuthorized, reason, isLoading } = useCanExecuteQuery({
  domain: "Orders",
  queryType: "GetOrderList",
});
```

### Cache Design

```
useCanExecuteCommand mounts
  │
  ├─ Build cache key: "{tenant}:commands/validate:{domain}:{commandType}:{aggregateId?}"
  ├─ Check cache:
  │   ├─ HIT (entry exists AND age < 30s): return cached result, isLoading=false
  │   └─ MISS (no entry OR age >= 30s):
  │       ├─ Set isLoading=true
  │       ├─ POST /api/v1/commands/validate
  │       ├─ On 200: store in cache, return { isAuthorized, reason, isLoading: false }
  │       ├─ On 401 (AuthError): re-throw → auth layer handles token refresh
  │       ├─ On 429 (RateLimitError): re-throw → user IS authorized, just throttled
  │       ├─ On 5xx/network: return { isAuthorized: false, reason: "Authorization service unavailable", isLoading: false }
  │       └─ On AbortError: silently ignore (component unmounted or params changed)
  │
  ├─ Param change (domain, commandType, aggregateId):
  │   └─ Abort previous request → check cache with new key → fetch if miss
  │
  ├─ Unmount:
  │   └─ AbortController.abort() → prevents state update on unmounted component
  │
  ├─ Tenant switch:
  │   └─ No explicit clear needed — cache keys are tenant-scoped.
  │      New tenant produces different keys. Old entries expire via 30s TTL.
  │
  └─ Page refresh:
      └─ CqrsProvider recreates cache on mount → all checks re-fetch
```

### Testing Strategy

- **Unit tests for cache** (`preflightCache.test.ts`): TTL behavior, key format, clear behavior. Use `vi.useFakeTimers()` for time-dependent tests.
- **Integration tests for hooks** (`useCanExecute.test.ts`): Use `renderHook` with providers wrapping `CqrsProvider` (mocked). Mock `fetchClient.post` to simulate backend responses.
- **Test provider setup**: Both hooks need `CqrsProvider` in the test tree. Each test gets a fresh `CqrsProvider` with its own `preflightCache` — no shared state between tests. Pattern: same as `useSubmitCommand.test.ts`.
- **No new mock classes needed** -- mock `fetchClient.post` via `vi.fn()` directly.
- **Import ordering**: value imports before type imports, blank line between external/internal groups.

### Known Limitations (Deliberate MVP Omissions)

- **No `enabled` option**: Unlike `useQuery`, these hooks do not support `enabled?: boolean` for conditional execution. If a module developer needs to defer a preflight check (e.g., until data loads), they must conditionally render the component that calls the hook:
  ```typescript
  // ✅ Correct: conditional rendering
  {order.data && <AuthorizedButton commandType={order.data.status === "draft" ? "SubmitOrder" : "CancelOrder"} />}

  // ❌ Wrong: passing undefined commandType
  const { isAuthorized } = useCanExecuteCommand({ domain: "Orders", commandType: order.data?.commandType ?? "" });
  ```
  Adding `enabled` is a candidate for a future enhancement if the pattern proves too cumbersome.

- **No `refetch()` function**: If permissions change (e.g., admin grants access), the cached result is stale for up to 30 seconds. The module developer must wait for TTL expiry or remount the component. This is acceptable for MVP — permission changes are rare and 30s TTL is short.

### Previous Story Intelligence (Story 2-8)

- Story 2-8 is a quality gate / testing story for ETag cache integration. No new production patterns.
- Story 2-7 established `notifyDomainInvalidation` in `QueryContextValue` and the `SignalRProvider` / `useProjectionSubscription` pattern.
- Stories 2-3 through 2-7 established the hook development patterns: `useCqrs()` for fetchClient, `useTenant()` for tenant, object return types, co-located tests.

### Git Intelligence

Recent commits: sequential story completion (2-4 through 2-7 done, 2-8 in progress). Each story adds files in `packages/cqrs-client/src/` and updates sprint status. Lint and build must pass before commit.

### Project Structure Notes

- **New directory**: `src/validation/` -- this is the first file in this directory. The epics specified `src/validation/useCanExecute.ts` as the target location.
- **New files**: `src/validation/useCanExecute.ts`, `src/validation/useCanExecute.test.ts`, `src/validation/preflightCache.ts`, `src/validation/preflightCache.test.ts`
- **Modified files**: `src/core/types.ts` (add `ValidateQueryRequest`), `src/index.ts` (add exports), `src/CqrsProvider.tsx` (add `preflightCache` to context), `src/CqrsProvider.test.tsx` (verify cache in context)

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.9]
- [Source: _bmad-output/planning-artifacts/architecture.md - API & Communication Patterns, /api/v1/commands/validate and /api/v1/queries/validate endpoints]
- [Source: _bmad-output/planning-artifacts/architecture.md - Pre-flight validation types: ValidateCommandRequest, PreflightValidationResult]
- [Source: _bmad-output/planning-artifacts/architecture.md - State Management Summary]
- [Source: _bmad-output/planning-artifacts/architecture.md - Enforcement Guidelines, hook return shape conventions]
- [Source: _bmad-output/planning-artifacts/epics.md - FR16: pre-flight authorization status]
- [Source: packages/cqrs-client/src/core/types.ts - Existing ValidateCommandRequest and PreflightValidationResult types]
- [Source: packages/cqrs-client/src/core/fetchClient.ts - FetchClient.post<T>() method for HTTP requests]
- [Source: packages/cqrs-client/src/queries/etagCache.ts - Factory pattern reference for cache creation]
- [Source: packages/cqrs-client/src/CqrsProvider.tsx - useCqrs() context for fetchClient access]
- [Source: packages/cqrs-client/src/commands/useSubmitCommand.ts - Hook pattern reference (useCqrs, useTenant, error handling)]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
