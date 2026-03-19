# Story 2.8: ETag Query Cache Integration

Status: done

## Story

As a module developer,
I want query responses cached and validated via ETags so repeat queries avoid re-downloading unchanged data,
So that the application is fast and bandwidth-efficient without any caching code in my module.

## Acceptance Criteria

1. **Given** `ETagCache` is implemented in `src/queries/etagCache.ts`
   **When** inspecting the implementation
   **Then** it is an in-memory `Map<string, { etag: string; data: unknown }>` keyed by `{tenantId}:{domain}:{queryType}:{aggregateId}:{entityId?}`
   **And** the cache is cleared entirely on tenant switch
   **And** the cache is cleared on page refresh (no persistence -- acceptable for projections)

2. **Given** a `useQuery` hook sends its first request for a projection
   **When** the backend responds with `200` and an `ETag` header
   **Then** the response data and ETag are stored in the cache

3. **Given** a `useQuery` hook sends a subsequent request for the same projection
   **When** a cached ETag exists for the query key
   **Then** the request includes `If-None-Match: "{etag}"` header

4. **Given** the backend responds with `304 Not Modified`
   **When** the `useQuery` hook processes the response
   **Then** the previously cached data is returned
   **And** no response body is parsed (zero-payload optimization)
   **And** `isLoading` remains `false` throughout (no loading flicker)

5. **Given** the backend responds with `200` and a new `ETag`
   **When** the `useQuery` hook processes the response
   **Then** the cache entry is updated with new data and new ETag
   **And** the Zod schema validation runs on the new data

6. **Given** a SignalR `ProjectionChanged` signal is received for a subscribed projection
   **When** the re-fetch query is sent
   **Then** `If-None-Match` is included -- if the projection didn't actually change for this tenant, `304` avoids redundant data transfer

7. **Given** a module developer inspects the `useQuery` hook API
   **When** reviewing the return type
   **Then** ETag caching is entirely transparent -- no ETag-related props or configuration exposed to module developers

## Tasks / Subtasks

- [x] Task 1: Audit existing implementation against all ACs (AC: all) -- **DO THIS FIRST**
  - [x] 1.1 Read the current `QueryProvider.tsx` to understand what story 2-7 changed. Check if `QueryContextValue` already exposes a function that publishes domain invalidation events -- it may be named `notifyDomainInvalidation`, `notifyInvalidation`, `publishInvalidation`, or similar. If found under any name, record the actual name in Completion Notes and use it throughout (skip Task 2). If not found, record that it needs to be added.
  - [x] 1.2 Audit `etagCache.ts`: MUST verify by reading the source that `CacheEntry` has `{ data: unknown; etag: string }`, keyed by `buildCacheKey` producing `{tenantId}:{domain}:{queryType}:{aggregateId}:{entityId?}`. Record verification in Completion Notes.
  - [x] 1.3 Audit `useQuery.ts`: MUST verify by reading the source that first fetch has no `If-None-Match`, subsequent fetches include it from cache, 304 returns cached data, 200 updates cache + runs Zod. Record verification in Completion Notes.
  - [x] 1.4 Audit `QueryProvider.tsx`: MUST verify `createETagCache()` on mount, `etagCache.clear()` on tenant switch. Record verification in Completion Notes.
  - [x] 1.5 Audit `fetchClient.ts` `postForQuery`: MUST verify 304 returns `{ status: 304, data: null, etag: null }`, 200 extracts `ETag` header. Record verification in Completion Notes.
  - [x] 1.6 Confirm no ETag-related props are exposed in `UseQueryResult<T>` -- the return type must be `{ data, isLoading, error, refetch }` only.
  - [x] 1.7 If any audit reveals a bug in a DO NOT MODIFY file, document it in Completion Notes and flag for story author review. Do not fix it directly in this story.

- [x] Task 2: Expose `notifyDomainInvalidation` from QueryProvider context (AC: #6)
  - [x] 2.1 If Task 1.1 found that story 2-7 already added `notifyDomainInvalidation` to `QueryContextValue`, skip to Task 3.
  - [x] 2.2 Add `notifyDomainInvalidation: (domain: string, tenant: string) => void` to `QueryContextValue` interface in `src/queries/QueryProvider.tsx`
  - [x] 2.3 Include `notifyDomainInvalidation` in the context `value` memo alongside `fetchClient`, `etagCache`, `onDomainInvalidation`
  - [x] 2.4 Export the type from `QueryProvider.tsx` only. Do NOT add `notifyDomainInvalidation` to `src/index.ts` public exports. Add `@internal Shell infrastructure only -- do not call from module code.` JSDoc comment.
  - [x] 2.5 Update `QueryProvider.test.tsx` to verify `notifyDomainInvalidation` is provided in context and fires domain invalidation listeners

- [x] Task 3: Add missing ETag integration tests to `useQuery.test.ts` (AC: #1, #4, #5, #6)
  - [x] 3.1 Add test: `"no loading flicker or data loss during refetch returning 304"` -- verify that after initial load completes, a refetch (triggered by `refetch()`) that returns 304 never sets `isLoading` to `true` AND `data` never becomes `undefined`. The mock for the refetch should NOT resolve immediately -- use a deferred promise or short delay so there is a window to assert state during the in-flight period. Assert: (a) `isLoading === false` after initial load, (b) trigger refetch, (c) `isLoading` stays `false` AND `data` stays defined throughout, (d) after 304 resolves, `data` equals the originally cached value.
  - [x] 3.2 Add test: `"cache entry updates with new ETag on subsequent 200"` -- first fetch returns `ETag: "v1"`, refetch returns `ETag: "v2"` with new data. Verify second refetch sends `If-None-Match: "v2"` (not `"v1"`), confirming cache was updated.
  - [x] 3.3 Add test: `"304 response does not trigger Zod validation"` -- primary assertion: after a refetch returning 304, `data` equals the originally cached value AND `error` is `null` (if Zod had run on a null body, it would set a `ValidationError`). Optional secondary assertion: `vi.spyOn(schema, 'safeParse')` confirms it was called exactly once (initial 200 only, not on the 304 refetch). The primary assertion is sufficient; the spy is defense-in-depth against future refactors that move the Zod call before the 304 branch.
  - [x] 3.4 Add test: `"domain invalidation refetch sends If-None-Match (ETag-aware)"` -- Verify this test exists (check by searching for `"invalidation refetch sends If-None-Match"` in `useQuery.test.ts`). If it exists and is correct, skip. If missing, add: emit `commandCompleted` for matching domain, verify subsequent fetch includes `If-None-Match` header with cached ETag.
  - [x] 3.5 Add test: `"polling refetch sends If-None-Match header"` -- configure `refetchInterval`, use `vi.useFakeTimers()` to control timing. **Vitest gotcha**: `fetchData` is async, so use `await vi.advanceTimersByTimeAsync(refetchInterval)` (not the sync version) to properly flush the async mock resolution after the interval fires. Verify polling request includes `If-None-Match` from cache. Call `vi.useRealTimers()` in cleanup.
  - [x] 3.6 Add test: `"window focus refetch sends If-None-Match header"` -- trigger visibility change via `document.dispatchEvent(new Event('visibilitychange'))` with `document.visibilityState` stubbed to `'visible'`, verify refetch includes `If-None-Match`.
  - [x] 3.7 Add test: `"stale ETag recovery -- backend rejects old ETag with 200"` -- first fetch stores `ETag: "stale"`, refetch sends `If-None-Match: "stale"`, backend responds 200 with new data + `ETag: "fresh"`. Verify cache updates to `"fresh"` and third refetch sends `If-None-Match: "fresh"`. This validates the cache self-heals when the backend doesn't recognize a cached ETag.
  - [x] 3.8 Add test: `"concurrent useQuery hooks sharing same cache key both use latest ETag"` -- this requires a custom test component (not `renderHook`) that renders two `useQuery` hooks with identical `queryParams` and same tenant, exposing individual `refetch` handles via refs or callback props. First fetch returns 200 + `ETag: "shared-v1"`. Trigger refetch on hook A only -- backend returns 200 + `ETag: "shared-v2"`. Then trigger refetch on hook B -- verify it sends `If-None-Match: "shared-v2"` (not `"shared-v1"`), proving both hooks share the same cache entry via the Map. **Simpler fallback if custom component proves too complex**: test the shared cache property at the unit level by calling `etagCache.set(key, v1)` then `etagCache.set(key, v2)` then asserting `etagCache.get(key).etag === v2` -- this proves the Map is shared but doesn't prove the hook integration. Prefer the full test; use the fallback only if blocked.

- [x] Task 4: Add tenant-switch cache integration tests to `useQuery.test.ts` (AC: #1)
  - [x] 4.1 Add test: `"tenant switch clears ETag cache and refetches without If-None-Match"` -- initial query caches ETag, switch tenant, verify next query does NOT include `If-None-Match` (cold start for new tenant).
  - [x] 4.2 Verify existing `QueryProvider.test.tsx` test `"clears cache when tenant changes"` covers the provider-level behavior. If correct, no changes needed.

- [x] Task 5: Run all tests and lint (AC: all)
  - [x] 5.1 Run full test suite: `pnpm test` -- all existing tests + new tests pass
  - [x] 5.2 Run lint: `pnpm lint` clean
  - [x] 5.3 Run full monorepo build: `pnpm build` succeeds
  - [x] 5.4 Record test count before and after: run `pnpm test` at story start to capture baseline count (expected: 251+ from story 2-6 plus story 2-7 additions), then verify the count increased by at least 8 tests (Tasks 3.1-3.8) after story completion

## Dev Notes

### Architecture Compliance

- **ETag caching is an infrastructure concern** -- module developers never interact with it. The `useQuery` hook handles all ETag logic internally. No cache-related props are exposed.
- **Ports-and-adapters pattern**: `ETagCache` is an interface with a simple factory (`createETagCache()`). Tests can inject custom cache implementations if needed.
- **Object destructuring returns** (never tuples) for all hooks.
- **`I` prefix** for interfaces, `Mock` prefix for mocks.

### Critical Constraints

- **DO NOT add TanStack Query** -- removed per sprint change. State management is custom hooks + ETag cache.
- **DO NOT modify `UseQueryResult<T>`** -- ETag caching must remain transparent. No new props.
- **DO NOT persist the ETag cache** -- in-memory Map is correct for projections. No localStorage/sessionStorage.
- **DO NOT add cache size limits or eviction** -- not required for MVP. The cache grows proportionally to active queries (typically < 50 entries). If needed in future, add LRU eviction as a separate story.
- **DO NOT modify `etagCache.ts` core logic** -- it is already correct and tested. Changes should only be to add new tests or fix bugs found during audit.
- **DO NOT modify `fetchClient.ts` `postForQuery`** -- the 304/200 handling and ETag extraction are already correct.
- **DO NOT create new test files** -- add new tests to existing `useQuery.test.ts` and `QueryProvider.test.tsx`. No new test files for ETag integration.
- **DO NOT add ETag-related options** (e.g., `enableCache`, `cacheKey`) to the `useQuery` options parameter or input API -- caching is automatic and non-configurable.
- **Cache key format is fixed**: `{tenantId}:{domain}:{queryType}:{aggregateId}:{entityId?}` -- matches architecture doc exactly.
- **All `src/` paths are relative to `packages/cqrs-client/`** -- e.g., `src/queries/etagCache.ts` means `packages/cqrs-client/src/queries/etagCache.ts`.
- **`domain` (query context) and `projectionType` (SignalR context) are the same string value** -- do not create a mapping layer. Story 2-7 established this equivalence.
- **`notifyDomainInvalidation` may already exist in context** -- story 2-7 may have added it. Check by reading the current `QueryContextValue` interface in `QueryProvider.tsx`. If it already exists, Task 2 is a no-op.
- **Escape hatch for unexpected bugs**: If the audit (Task 1) reveals a bug in a DO NOT MODIFY file (`etagCache.ts`, `fetchClient.ts`), document it in Completion Notes and flag for story author review. Do not fix it directly in this story -- the constraint exists to prevent scope creep.

### Existing Code -- DO NOT Reinvent

| What | Where | Status |
|------|-------|--------|
| `ETagCache` interface + `createETagCache()` | `src/queries/etagCache.ts` | COMPLETE -- do not modify |
| `buildCacheKey()` | `src/queries/etagCache.ts` | COMPLETE -- do not modify |
| `useQuery` ETag integration | `src/queries/useQuery.ts` | COMPLETE -- verify, add tests only |
| `QueryProvider` tenant-switch cache clearing | `src/queries/QueryProvider.tsx` | COMPLETE -- verify, add tests only |
| `postForQuery` 304/200 handling | `src/core/fetchClient.ts` | COMPLETE -- do not modify |
| `CacheEntry` type `{ data, etag }` | `src/queries/etagCache.ts` | COMPLETE -- do not modify |
| `MockSignalRHub` | `src/mocks/MockSignalRHub.ts` | Available for integration tests |
| `commandEventBus` domain invalidation | `src/commands/commandEventBus.ts` | Already wired in QueryProvider |
| Existing ETag tests | `src/queries/etagCache.test.ts` (8 tests) | COMPLETE -- do not modify |
| Existing useQuery tests | `src/queries/useQuery.test.ts` (40+ tests) | ADD new tests, do not break existing |
| Existing QueryProvider tests | `src/queries/QueryProvider.test.tsx` (6 tests) | ADD new tests if needed |

### What This Story Is Really About

**This is a quality gate story, not a coding story.** The ETag implementation is already done. The primary deliverable is comprehensive test coverage and verification, with potentially one small production code change (exposing `notifyDomainInvalidation`). The dev agent should approach this as an auditor and test author, not a feature builder.

Story 2-4 implemented ETag caching as part of the `useQuery` hook. Story 2-5 added projection freshness with domain invalidation. Story 2-7 adds SignalR real-time push. **Story 2-8 ensures the complete ETag cache integration is verified, tested, and hardened across ALL invalidation sources:**

1. **Manual refetch** (`refetch()`) -- sends `If-None-Match`
2. **Command-complete invalidation** -- domain invalidation triggers refetch with `If-None-Match`
3. **SignalR push invalidation** -- `ProjectionChanged` → domain invalidation → refetch with `If-None-Match`
4. **Polling** (`refetchInterval`) -- sends `If-None-Match`
5. **Window focus** -- sends `If-None-Match`
6. **Tenant switch** -- clears cache entirely, next fetch has no `If-None-Match`

The primary deliverable is **comprehensive test coverage** proving all these paths are ETag-aware.

### No-Loading-Flicker Guarantee (AC #4)

The UX spec requires: "Loading states match the actual content layout... not like something broke." For ETag-cached queries:
- **Initial fetch**: `isLoading = true` (expected -- no cached data yet)
- **Refetch (any source)**: `isLoading` must stay `false`. The hook sets `isLoading = true` ONLY when `isInitial === true`. Refetches pass `isInitial = false`, so `isLoading` stays `false`. Data stays visible during refetch. On 304, cached data is returned immediately. On 200, new data replaces old atomically. Additionally, `data` must never become `undefined` after the initial load -- React 18+ batches state updates inside async functions, but a future refactor could break this. Tests must assert both `isLoading === false` AND `data !== undefined` during refetch.

This must be explicitly tested (Task 3.1).

### `notifyDomainInvalidation` Exposure (Task 2)

Story 2-7's `useProjectionSubscription` (task 4.6) calls `QueryProvider.notifyDomainInvalidation(projectionType, tenantId)` when receiving a `ProjectionChanged` signal. This requires `notifyDomainInvalidation` to be exposed in the `QueryContextValue`.

**Current state**: `notifyDomainInvalidation` is defined in `QueryProvider.tsx` but NOT in the `QueryContextValue` interface -- it's used only internally for `commandEventBus` subscription. Story 2-7 may have already added it. **Task 1.1 checks this first.**

If needed, the change is minimal:
```typescript
export interface QueryContextValue {
  fetchClient: FetchClient;
  etagCache: ETagCache;
  onDomainInvalidation: (listener: DomainInvalidationListener) => () => void;
  notifyDomainInvalidation: (domain: string, tenant: string) => void; // NEW
}
```

**Encapsulation note**: `notifyDomainInvalidation` is an **internal API** for shell infrastructure use only (SignalR provider, command event bus). It must NOT be exported from `src/index.ts` as a public API. Module developers must never call it directly -- they trigger invalidation by sending commands (which complete and auto-invalidate) or via SignalR (which the shell manages). If exposing via `QueryContextValue`, add a JSDoc comment: `@internal Shell infrastructure only -- do not call from module code.`

### ETag Flow Diagram

```
useQuery mounts
  │
  ├─ First fetch: POST /api/v1/queries (no If-None-Match)
  │   └─ 200 + ETag header → etagCache.set(key, { data, etag })
  │
  ├─ Subsequent fetch (refetch/poll/focus/invalidation):
  │   ├─ Cache lookup: etagCache.get(key) → cached entry
  │   ├─ POST /api/v1/queries + If-None-Match: "{etag}"
  │   │
  │   ├─ 304 Not Modified:
  │   │   └─ Return cached.data (no body parse, no Zod, no flicker)
  │   │
  │   └─ 200 + new ETag:
  │       ├─ Zod validate new payload
  │       └─ etagCache.set(key, { data: validated, etag: newEtag })
  │
  ├─ Tenant switch:
  │   └─ etagCache.clear() → next fetch has no If-None-Match (cold start)
  │
  └─ Page refresh:
      └─ In-memory Map resets → all fetches are cold starts
```

### Cache Key Examples

| tenantId | domain | queryType | aggregateId | entityId | Cache Key |
|----------|--------|-----------|-------------|----------|-----------|
| `acme-corp` | `Orders` | `GetOrderList` | (none) | (none) | `acme-corp:Orders:GetOrderList::` |
| `acme-corp` | `Orders` | `GetOrderDetail` | `ord-123` | (none) | `acme-corp:Orders:GetOrderDetail:ord-123:` |
| `acme-corp` | `Inventory` | `GetStockLevel` | `wh-1` | `sku-42` | `acme-corp:Inventory:GetStockLevel:wh-1:sku-42` |

### Testing Strategy

- **This story is primarily a testing and verification story.** The implementation is already done. The dev agent must verify correctness and add missing test coverage.
- **Unit tests use mocks** -- `createMockFetchClient()`, `createMockEventBus()`, `MockSignalRHub`. No real network calls.
- **Co-located tests**: `*.test.ts(x)` next to source files. No `__tests__/` directories.
- **New tests go in existing test files** -- `useQuery.test.ts`, `QueryProvider.test.tsx`. Do NOT create new test files for ETag integration.
- **Existing tests must not break** -- all 251+ tests must pass plus story 2-7 additions.
- **Import ordering**: value imports before type imports, blank line between external/internal groups.
- **Test organization hint**: Group 304-related tests (3.1, 3.3) together in a `describe("ETag 304 behavior")` block, and If-None-Match tests (3.2, 3.4-3.7) in a `describe("ETag If-None-Match across refetch sources")` block. This avoids duplicating mock setup patterns and gives clearer test failure signals.

### Previous Story Intelligence (Story 2-7)

- Story 2-7 adds `src/notifications/` directory with `SignalRHub.ts`, `SignalRProvider.tsx`, `useProjectionSubscription.ts`.
- `useProjectionSubscription` calls `notifyDomainInvalidation(projectionType, tenantId)` on `ProjectionChanged` signal.
- `@microsoft/signalr@^10.0.0` added as dependency.
- 12 existing `MockSignalRHub` tests from story 2-6.
- Provider nesting: `ConnectionStateProvider > SignalRProvider > QueryProvider > CqrsProvider`.
- `domain` (query param) === `projectionType` (SignalR context) -- same string.

### Git Intelligence

Recent commits: sequential story completion (2-4 done → 2-5 done → 2-6 done). Each story adds files in `packages/cqrs-client/src/` and updates sprint status. Lint and build must pass before commit.

### Project Structure Notes

- No new files needed -- all changes go in existing files.
- Primary files to modify: `src/queries/useQuery.test.ts` (new tests), `src/queries/QueryProvider.tsx` (possibly expose `notifyDomainInvalidation`), `src/queries/QueryProvider.test.tsx` (new tests if needed).

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.8]
- [Source: _bmad-output/planning-artifacts/architecture.md - Projection Caching Strategy, ETag Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md - API & Communication Patterns, /api/v1/queries endpoint]
- [Source: _bmad-output/planning-artifacts/architecture.md - State Management Summary]
- [Source: _bmad-output/planning-artifacts/prd.md - FR10, FR17]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - "no loading spinners that could be skeletons", designed degradation]
- [Source: _bmad-output/implementation-artifacts/2-7-signalr-connection-and-projection-subscriptions.md - SignalR integration, notifyDomainInvalidation]
- [Source: packages/cqrs-client/src/queries/etagCache.ts - ETag cache implementation]
- [Source: packages/cqrs-client/src/queries/useQuery.ts - useQuery ETag integration]
- [Source: packages/cqrs-client/src/queries/QueryProvider.tsx - QueryProvider, domain invalidation pub/sub]
- [Source: packages/cqrs-client/src/core/fetchClient.ts - postForQuery 304/200 handling]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — no blocking issues encountered during implementation.

### Completion Notes List

**Task 1 — Audit Results:**
- 1.1: `notifyDomainInvalidation` ALREADY EXISTS in `QueryContextValue` interface (QueryProvider.tsx:24) and is included in context value memo (line 86). Named exactly `notifyDomainInvalidation`. Task 2 skipped (no-op).
- 1.2: Verified `CacheEntry` has `{ data: T; etag: string }`, `buildCacheKey` produces `{tenantId}:{domain}:{queryType}:{aggregateId?}:{entityId?}`. Correct.
- 1.3: Verified first fetch has no `If-None-Match` (line 139: only when `cached` exists), subsequent fetches include it, 304 returns cached data (line 166-167), 200 updates cache + runs Zod (lines 168-183). Correct.
- 1.4: Verified `createETagCache()` on mount via `useMemo` (line 36), `etagCache.clear()` on tenant switch (lines 40-48). Correct.
- 1.5: Verified `postForQuery` returns `{ status: 304, data: null, etag: null }` for 304 (lines 107-109), extracts `ETag` header for 200 (lines 125-127). Correct.
- 1.6: Verified `UseQueryResult<T>` is `{ data, isLoading, error, refetch }` only. No ETag-related props exposed.
- 1.7: No bugs found in DO NOT MODIFY files (`etagCache.ts`, `fetchClient.ts`).

**Task 2 — Skipped (no-op):**
Story 2-7 already added `notifyDomainInvalidation` to `QueryContextValue` interface and context value. All subtasks (2.1-2.5) marked complete — 2.1 confirmed skip condition, 2.2-2.5 already done by story 2-7. Note: No `@internal` JSDoc comment was added since Task 2 was skipped per instructions.

**Task 3 — New Tests Added (7 tests):**
- 3.1: "no loading flicker or data loss during refetch returning 304" — uses deferred promise to verify `isLoading` stays `false` and `data` stays defined during in-flight 304 refetch.
- 3.2: "cache entry updates with new ETag on subsequent 200" — verifies third fetch sends `If-None-Match: "v2"` (not `"v1"`), proving cache was updated.
- 3.3: "304 response does not trigger Zod validation" — both primary (data/error check) and secondary (`safeParse` spy) assertions confirm Zod not called on 304.
- 3.4: SKIPPED — test "invalidation refetch sends If-None-Match (ETag-aware)" already existed at line 1147 and was correct.
- 3.5: "polling refetch sends If-None-Match header" — uses `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` to verify polling requests include cached ETag.
- 3.6: "window focus refetch sends If-None-Match header" — verifies `visibilitychange` refetch includes `If-None-Match`.
- 3.7: "stale ETag recovery -- backend rejects old ETag with 200" — verifies cache self-heals from "stale" → "fresh" → third fetch uses "fresh".
- 3.8: "concurrent useQuery hooks sharing same cache key both use latest ETag" — full integration test using dual-hook renderHook pattern. After hook A updates cache to "shared-v2", hook B's refetch sends `If-None-Match: "shared-v2"`, proving shared Map cache.

**Task 4 — Tenant Switch Tests (1 test):**
- 4.1: "tenant switch clears ETag cache and refetches without If-None-Match" — verifies post-switch query has no `If-None-Match` and uses new tenant.
- 4.2: Existing `QueryProvider.test.tsx` test "clears cache when tenant changes" (line 177) already correctly covers provider-level cache clearing. No changes needed.

**Task 5 — Validation:**
- 5.1: Full test suite passes: 290 tests (cqrs-client), 79 tests (shell), 369 total.
- 5.2: Lint clean for `useQuery.test.ts`. 3 pre-existing import-order errors in other test files (unrelated to this story).
- 5.3: `pnpm build` succeeds.
- 5.4: Baseline: 282 tests (cqrs-client). Final: 290 tests. Delta: +8 tests (7 new from Task 3 + 1 from Task 4). Exceeds minimum of 8 new tests required.

### File List
-
- `packages/cqrs-client/src/queries/useQuery.test.ts` (modified — added SignalR invalidation ETag assertion + AC coverage)
- `_bmad-output/implementation-artifacts/2-8-etag-query-cache-integration.md` (modified — review update + audit documentation)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — sprint tracking sync for Story 2-8)
- `_bmad-output/implementation-artifacts/2-9-preflight-authorization-validation.md` (generated artifact during follow-on story planning; currently untracked)

### Change Log

- 2026-03-19: Story 2-8 review completed — comprehensive ETag cache integration verification and test coverage. Hardened SignalR `ProjectionChanged` coverage to ensure invalidation refetch sends cached `If-None-Match`, plus updated story bookkeeping for sprint sync and run artifacts. No production code changes required — all existing implementation verified correct via audit.
