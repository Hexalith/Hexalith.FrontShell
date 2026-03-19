# Story 2.5: Projection Freshness & Connection State

Status: ready-for-dev

## Story

As a module developer,
I want projection data to stay fresh automatically via polling after commands complete, with observable connection state,
so that end users see current data without manual refresh and I can display connection health.

## Acceptance Criteria

1. **Given** a command completes successfully via `useCommandPipeline`
   **When** the command status reaches `'Completed'`
   **Then** `useCommandPipeline` triggers invalidation for the affected projection domain
   **And** active `useQuery` hooks for that domain automatically refetch fresh data with ETag validation

2. **Given** the shell manages a connection health state
   **When** a module developer calls `useConnectionState()` from `@hexalith/cqrs-client`
   **Then** the hook returns `{ state: 'connected' | 'reconnecting' | 'disconnected', transport: 'polling' }`
   **And** connection state reflects HTTP reachability based on query success/failure patterns
   **And** `transport` is always `'polling'` in this story (SignalR added in Story 2.7 will add `'signalr'`)

3. **Given** polling serves as fallback for data freshness
   **When** a module developer uses `useQuery` with `refetchInterval`
   **Then** the projection data is refreshed at the specified interval
   **And** polling continues independently of connection state transitions

4. **Given** the backend becomes temporarily unavailable
   **When** projection queries fail
   **Then** the connection state transitions to `'disconnected'`
   **And** previously cached data remains available (not cleared)
   **And** the hook automatically retries with jittered exponential backoff (1s, 3s, 5s, 10s, 30s max)

5. **Given** the backend recovers
   **When** a retry succeeds
   **Then** the connection state transitions back to `'connected'`
   **And** stale projections are automatically revalidated (re-fetched with ETag `If-None-Match`)

## Tasks / Subtasks

- [ ] Task 1: Create `ConnectionStateProvider` and `useConnectionState` hook (AC: #2, #4, #5)
  - [ ] Create `src/connection/ConnectionStateProvider.tsx`:

    ```typescript
    type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';
    type TransportType = 'polling' | 'signalr';

    interface ConnectionStateValue {
      state: ConnectionState;
      transport: TransportType;
      reportSuccess: () => void;
      reportFailure: () => void;
    }

    function ConnectionStateProvider({ children }: { children: ReactNode }): JSX.Element;
    function useConnectionState(): { state: ConnectionState; transport: TransportType };
    ```

  - [ ] State machine transitions:
    - Initial state: `'connected'` (optimistic — assume healthy until proven otherwise)
    - On `reportFailure()`: increment consecutive failure counter
      - 1 failure: transition to `'reconnecting'`
      - 3+ consecutive failures: transition to `'disconnected'`
    - On `reportSuccess()`: reset failure counter, transition to `'connected'`
  - [ ] `transport` field: hardcode `'polling'` in this story. Story 2.7 will extend the provider to accept SignalR state and set `'signalr'` when SignalR is connected.
  - [ ] `useConnectionState()` public hook: returns `{ state, transport }` only (NOT `reportSuccess`/`reportFailure` — those are internal)
  - [ ] Internal hook `useConnectionReporter()`: returns `{ reportSuccess, reportFailure }` — used by `useQuery` internally
  - [ ] Hook guard: `useConnectionState` throws `"useConnectionState must be used within ConnectionStateProvider"` if outside provider
  - [ ] Create `src/connection/ConnectionStateProvider.test.tsx`

- [ ] Task 2: Implement jittered exponential backoff retry in `useQuery` (AC: #4, #5)
  - [ ] Add retry logic to `useQuery.ts` fetch error path:

    ```typescript
    const BACKOFF_SCHEDULE = [1000, 3000, 5000, 10000, 30000] as const;

    function getBackoffDelay(attempt: number): number {
      const base = BACKOFF_SCHEDULE[Math.min(attempt, BACKOFF_SCHEDULE.length - 1)];
      // Jitter: +-25% randomization to prevent thundering herd
      const jitter = base * 0.25 * (Math.random() * 2 - 1);
      return Math.max(0, base + jitter);
    }
    ```

  - [ ] On fetch error (network failure, 5xx):
    1. Call `reportFailure()` from `useConnectionReporter()`
    2. Keep existing cached data (do NOT clear `data` state)
    3. Schedule retry with backoff delay (use `setTimeout`, track with `useRef`)
    4. On successful retry: call `reportSuccess()`, update data, reset retry counter
  - [ ] On fetch success: call `reportSuccess()`, reset retry counter to 0
  - [ ] Retry applies to ALL fetch attempts: initial, refetch, interval, window-focus
  - [ ] Retry is additive to `refetchInterval` — if polling is active and a fetch fails, retry backoff runs concurrently. If the polling interval fires before retry completes, skip (don't stack requests)
  - [ ] Abort in-flight retries on unmount or param change (existing `AbortController` pattern)
  - [ ] DO NOT retry on business errors: `ValidationError`, `AuthError`, `ForbiddenError` — only on network errors and `ApiError` with 5xx status codes
  - [ ] Create/update `src/queries/useQuery.test.ts` with retry tests

- [ ] Task 3: Wire command-complete → projection invalidation (AC: #1)
  - [ ] In `QueryProvider.tsx`, subscribe to `commandEventBus.onCommandCompleted`:

    ```typescript
    // Inside QueryProvider
    const { commandEventBus } = useCqrs('QueryProvider');

    useEffect(() => {
      const unsubscribe = commandEventBus.onCommandCompleted((event) => {
        // Notify all active useQuery hooks matching the domain
        notifyDomainInvalidation(event.domain, event.tenant);
      });
      return unsubscribe;
    }, [commandEventBus]);
    ```

  - [ ] Invalidation mechanism — add domain invalidation channel to `QueryContextValue`:

    ```typescript
    interface QueryContextValue {
      fetchClient: FetchClient;
      etagCache: ETagCache;
      onDomainInvalidation: (listener: (domain: string, tenant: string) => void) => () => void;
    }
    ```

  - [ ] In `useQuery.ts`, subscribe to domain invalidation:

    ```typescript
    const { onDomainInvalidation } = useQueryClient();

    useEffect(() => {
      const unsubscribe = onDomainInvalidation((domain, tenant) => {
        if (domain === queryParams.domain && tenant === activeTenant) {
          refetch(); // Re-fetch with ETag If-None-Match
        }
      });
      return unsubscribe;
    }, [onDomainInvalidation, queryParams.domain, activeTenant]);
    ```

  - [ ] The refetch triggered by invalidation uses the existing ETag cache — sends `If-None-Match`, gets `304` if unchanged (zero payload)
  - [ ] Update `src/queries/QueryProvider.test.tsx` with invalidation wiring tests
  - [ ] Update `src/queries/useQuery.test.ts` with command-complete invalidation tests

- [ ] Task 4: Wire `ConnectionStateProvider` into `CqrsProvider` (AC: #2)
  - [ ] Update `CqrsProvider.tsx` to nest `ConnectionStateProvider`:

    ```tsx
    export function CqrsProvider({ commandApiBaseUrl, tokenGetter, children }: CqrsProviderProps) {
      const fetchClient = useMemo(...);
      const commandEventBus = useMemo(...);

      return (
        <CqrsContext.Provider value={{ fetchClient, commandEventBus }}>
          <ConnectionStateProvider>
            <QueryProvider fetchClient={fetchClient}>
              {children}
            </QueryProvider>
          </ConnectionStateProvider>
        </CqrsContext.Provider>
      );
    }
    ```

  - [ ] Nesting order: `CqrsContext` > `ConnectionStateProvider` > `QueryProvider` — because `useQuery` (inside QueryProvider) needs `useConnectionReporter` (from ConnectionStateProvider)
  - [ ] Update `src/CqrsProvider.test.tsx` to verify ConnectionStateProvider nesting
  - [ ] Export `useConnectionState` from `src/index.ts`

- [ ] Task 5: Export public API additions from `src/index.ts` (AC: all)
  - [ ] Add to `packages/cqrs-client/src/index.ts`:

    ```typescript
    // Connection state
    export { useConnectionState } from './connection/ConnectionStateProvider';
    export type { ConnectionState, TransportType } from './connection/ConnectionStateProvider';
    ```

  - [ ] Do NOT export `ConnectionStateProvider` directly — it's nested inside `CqrsProvider`
  - [ ] Do NOT export `useConnectionReporter` — internal hook for `useQuery`
  - [ ] Verify `pnpm build` succeeds

- [ ] Task 6: Write comprehensive tests (AC: all)
  - [ ] **ConnectionStateProvider.test.tsx**:
    - Initial state is `'connected'` with transport `'polling'`
    - Single failure transitions to `'reconnecting'`
    - Three consecutive failures transitions to `'disconnected'`
    - Success after failure transitions to `'connected'`
    - Success resets failure counter
    - Hook throws outside provider
    - `useConnectionReporter` returns reportSuccess/reportFailure
  - [ ] **useQuery.test.ts** (additions):
    - Command-complete invalidation triggers refetch for matching domain
    - Command-complete invalidation does NOT trigger refetch for different domain
    - Command-complete invalidation does NOT trigger refetch for different tenant
    - Invalidation refetch sends `If-None-Match` header (ETag-aware)
    - Network error triggers retry with backoff
    - 5xx error triggers retry with backoff
    - Retry succeeds and updates data
    - Retry calls `reportSuccess` on success
    - Retry calls `reportFailure` on each failure
    - ValidationError does NOT trigger retry
    - AuthError does NOT trigger retry
    - Unmount cancels pending retry
    - Param change cancels pending retry
    - Concurrent retry and polling don't stack requests
  - [ ] **CqrsProvider.test.tsx** (additions):
    - ConnectionStateProvider is nested inside
    - useConnectionState works within CqrsProvider
  - [ ] All tests use `vi.useFakeTimers()` for backoff timing tests
  - [ ] All tests mock `fetchClient` — do NOT call real APIs

- [ ] Task 7: Verify package integrity
  - [ ] `pnpm --filter @hexalith/cqrs-client build` succeeds (ESM + .d.ts)
  - [ ] `pnpm --filter @hexalith/cqrs-client test` passes all tests
  - [ ] `pnpm --filter @hexalith/cqrs-client lint` passes
  - [ ] `pnpm build` (full monorepo) succeeds
  - [ ] Verify `useConnectionState` returns correct types (TS compile check)

## Dev Notes

### Architecture Compliance

- **Native `fetch` via `createFetchClient`** — Same fetch client from Story 2.2. Do NOT add ky, axios, or any HTTP library. The `postForQuery` method (Story 2.4) is used for all query fetches including retries.
- **No TanStack Query** — Removed per sprint change proposal 2026-03-15. Cache invalidation uses the custom `commandEventBus` → `onDomainInvalidation` pattern, NOT `queryClient.invalidateQueries`. The epics file references `queryClient.invalidateQueries` but that's from the pre-sprint-change design. Use the event bus pattern instead.
- **No SignalR in this story** — SignalR is Story 2.7. The `ConnectionStateProvider` is designed to be extended by Story 2.7 (which adds SignalR state to the composite connection status), but this story only tracks HTTP reachability. `transport` is always `'polling'`.
- **Object destructuring return shapes** — `const { state, transport } = useConnectionState()`. Never tuples.
- **React Context provider pattern** — `ConnectionStateProvider` follows the exact pattern from architecture.md: named context, named Provider export, named hook export, hook throws if outside provider. [Source: architecture.md § React Context Provider Pattern, lines 993-1017]
- **Errors via return value** — `useQuery` continues to surface errors via the `error` return property. Retry logic is transparent to the consumer — the hook retries internally, updating `error` on each failure and clearing it on success.
- **Stale-but-valid pattern** — When a refetch fails, `error` is set but `data` is NOT cleared. Module developers display both: data with an error indicator. This was established in Story 2.4 and MUST be preserved.
- **`commandEventBus` pattern** — Story 2.3 created `CommandEventBus` with `onCommandCompleted` / `emitCommandCompleted`. Story 2.5 wires the listener side. The `CommandCompletedEvent` contains `{ correlationId, domain, aggregateId, tenant }` — use `domain` and `tenant` to match against active `useQuery` hooks.

### Critical Constraints

- **DO NOT add `@tanstack/react-query`** — Removed per sprint change. Invalidation uses the `commandEventBus` event pattern.
- **DO NOT add `@microsoft/signalr`** — Story 2.7. Connection state is HTTP-reachability only.
- **DO NOT modify existing hook return types** — `useQuery` return type (`UseQueryResult<T>`) stays identical. `useConnectionState` is a NEW export.
- **DO NOT modify `CommandEventBus` interface** — Story 2.3 created it. We only subscribe to `onCommandCompleted` events.
- **DO NOT create mock implementations** — Story 2.6.
- **DEPENDS ON Stories 2.1 + 2.2 + 2.3 + 2.4** — This story imports from:
  - `./core/fetchClient` (FetchClient — from Story 2.2)
  - `./commands/commandEventBus` (CommandEventBus, CommandCompletedEvent — from Story 2.3)
  - `./queries/etagCache` (ETagCache — from Story 2.4)
  - `./queries/QueryProvider` (QueryProvider, useQueryClient — from Story 2.4)
  - `./queries/useQuery` (useQuery internal modifications — from Story 2.4)
  - `./errors` (HexalithError, ApiError — from Story 2.1)
  - `@hexalith/shell-api` useTenant (returns `{ activeTenant: string | null }`)
- **`useTenant` import path** — `import { useTenant } from '@hexalith/shell-api'`. `activeTenant` is a plain string (tenant ID), NOT an object.
- **Backoff jitter is mandatory** — Architecture requires jittered exponential backoff to prevent thundering herd after backend deploys. [Source: architecture.md § Reliability, line 49; § Real-time data, line 91]
- **Only retry transient errors** — Network failures and 5xx. Do NOT retry 4xx (client errors), `ValidationError` (Zod), `AuthError` (401), `ForbiddenError` (403), `RateLimitError` (429 — has its own `Retry-After` semantics).
- **Window-focus burst risk** — Story 2.4 documented that `refetchOnWindowFocus: true` fires all `useQuery` instances simultaneously. Consider debouncing window-focus refetches: group all window-focus re-fetches into a single batch with a 100ms debounce. This prevents N simultaneous requests when the user alt-tabs back.
- **Zod is already a dependency** — `"zod": "^3.25.76"` in package.json. Do NOT re-add.
- **`@testing-library/react` is already a devDependency** — Added in Story 2.4. Do NOT re-add.
- **`vitest.config.ts` already has `environment: 'jsdom'`** — Set in Story 2.4.

### Connection State Design

```
State Machine:
                 reportFailure (1st)
  connected ─────────────────────────→ reconnecting
      ↑                                    │
      │ reportSuccess                      │ reportFailure (3rd consecutive)
      │                                    ↓
      └──────────────── reportSuccess ── disconnected

Failure Counter:
  0 failures → state: connected
  1-2 failures → state: reconnecting
  3+ failures → state: disconnected

Success always resets counter to 0 and state to connected.
```

**Why 3 consecutive failures for `disconnected`?** A single failed request could be a transient timeout. Two could be server restart. Three consecutive failures strongly suggest the backend is actually down. This threshold prevents connection state flicker on transient errors while detecting real outages quickly (3 × 1s polling = 3s detection).

**Future extension point (Story 2.7):** The `ConnectionStateProvider` will be extended to accept SignalR connection state as an additional input. The composite state will be:
- `'connected'`: HTTP queries succeed AND SignalR connected
- `'reconnecting'`: HTTP queries succeed but SignalR reconnecting, OR HTTP queries failing (retry in progress)
- `'disconnected'`: both HTTP and SignalR failing

### Command-Complete Invalidation Design

```
useCommandPipeline                  QueryProvider                     useQuery
──────────────────                  ─────────────                     ────────
Command completes
  → emitCommandCompleted({          onCommandCompleted((event) →
     domain: 'Orders',                notifyDomainInvalidation(       onDomainInvalidation((domain, tenant) →
     tenant: 'tenant-1',               event.domain,                   if (domain === myDomain &&
     aggregateId: 'ord-123',            event.tenant                      tenant === myTenant)
     correlationId: '...'             )                                   refetch() // with ETag
  })                                )                                 )
```

**Why `domain` + `tenant` matching (not `aggregateId`)?** A command on one aggregate may affect list projections that include that aggregate. For example, creating order `ord-456` should refresh a `GetOrderList` projection for the `Orders` domain. Matching by domain + tenant is deliberately broad to ensure freshness. The ETag cache prevents unnecessary data transfer — if the projection hasn't actually changed, the backend returns `304`.

### Retry Backoff Design

```
Attempt 0: immediate (first fetch)
Attempt 1: ~1000ms ± 250ms jitter
Attempt 2: ~3000ms ± 750ms jitter
Attempt 3: ~5000ms ± 1250ms jitter
Attempt 4: ~10000ms ± 2500ms jitter
Attempt 5+: ~30000ms ± 7500ms jitter (capped)
```

**Interaction with `refetchInterval`:** If a `useQuery` hook has `refetchInterval: 5000` and fetch fails:
1. Retry backoff starts (1s, 3s, 5s, ...)
2. Polling interval continues firing every 5s
3. If polling fires while retry is in-flight, skip (don't stack)
4. Whichever succeeds first resets the retry counter
5. Use a `useRef` flag (`isFetchingRef`) to prevent concurrent requests

### Project Structure Notes

```
packages/cqrs-client/
├── src/
│   ├── index.ts                        # ADD: useConnectionState, ConnectionState, TransportType exports
│   ├── errors.ts                       # (Story 2.1) — ApiError used for retry decisions
│   ├── CqrsProvider.tsx                # MODIFIED — nest ConnectionStateProvider
│   ├── CqrsProvider.test.tsx           # MODIFIED — verify ConnectionStateProvider nesting
│   ├── core/
│   │   ├── fetchClient.ts              # (Story 2.2) — NOT modified
│   │   ├── types.ts                    # (Story 2.1) — NOT modified
│   │   └── ...                         # Other core files — NOT modified
│   ├── commands/
│   │   ├── commandEventBus.ts          # (Story 2.3) — NOT modified, we subscribe to it
│   │   ├── useCommandPipeline.ts       # (Story 2.3) — NOT modified, emits events we consume
│   │   └── ...                         # Other command files — NOT modified
│   ├── connection/                     # THIS STORY — new directory
│   │   ├── ConnectionStateProvider.tsx  # ConnectionState context + provider + hooks
│   │   └── ConnectionStateProvider.test.tsx
│   └── queries/
│       ├── etagCache.ts                # (Story 2.4) — NOT modified
│       ├── QueryProvider.tsx           # MODIFIED — add command-complete invalidation wiring
│       ├── QueryProvider.test.tsx       # MODIFIED — add invalidation tests
│       ├── useQuery.ts                 # MODIFIED — add retry backoff + invalidation subscription + connection reporting
│       └── useQuery.test.ts            # MODIFIED — add retry + invalidation tests
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Provider component | PascalCase | `ConnectionStateProvider` |
| Public hook | camelCase with `use` | `useConnectionState` |
| Internal hook | camelCase with `use` | `useConnectionReporter` |
| State types | PascalCase union | `ConnectionState = 'connected' \| 'reconnecting' \| 'disconnected'` |
| Transport type | PascalCase union | `TransportType = 'polling' \| 'signalr'` |
| Constants | UPPER_SNAKE_CASE | `BACKOFF_SCHEDULE`, `MAX_CONSECUTIVE_FAILURES` |
| Event listener | `on` + PascalCase | `onDomainInvalidation` |

### References

- [Source: architecture.md § Projection Caching Strategy, lines 235-261]
- [Source: architecture.md § Command Lifecycle in useCommand Hook, lines 415-430]
- [Source: architecture.md § React Context Provider Pattern, lines 993-1017]
- [Source: architecture.md § Reliability, line 49 — jittered exponential backoff]
- [Source: architecture.md § Real-time data, line 91 — connection health in status bar]
- [Source: architecture.md § State Management Summary, lines 517-525]
- [Source: architecture.md § Fallback Behavior, line 261 — SignalR is optimization layer]
- [Source: epics.md § Story 2.5, lines 842-881]
- [Source: epics.md § Story 2.7, lines 932-977 — SignalR future integration]
- [Source: prd.md § FR11, FR12, FR13 — projection freshness and connection state FRs]
- [Source: ux-design-specification.md § Connection health indicator, line 1155]
- [Source: ux-design-specification.md § Status bar, lines 1172-1176]
- [Source: story 2-4 § Dev Notes — stale-but-valid pattern, window-focus burst risk, no TanStack Query]
- [Source: story 2-4 § useQuery Hook Lifecycle — error + data dual-state behavior]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
