# Story 2.7: SignalR Connection & Projection Subscriptions

Status: done

## Story

As a module developer,
I want projection data to update automatically when any client changes it, without polling,
so that end users see real-time data across all browser sessions.

## Acceptance Criteria

1. **Given** `useSignalRHub()` is exposed from `SignalRProvider.tsx` (context hook for the multiplexed hub — no separate `useSignalR.ts` file)
   **When** the shell initializes
   **Then** a single SignalR connection is established to `{commandApiBaseUrl}/hubs/projection-changes`
   **And** the connection uses WebSocket transport with auto-fallback to Server-Sent Events
   **And** the access token is provided via `accessTokenFactory` aligned with the same token pattern as `fetchClient` / shell `tokenGetter`
   **And** only one connection exists regardless of how many projections are active (multiplexed)

2. **Given** the SignalR connection is established
   **When** the connection drops
   **Then** automatic reconnection begins with exponential backoff (1s, 3s, 5s, 10s, 30s max)
   **And** `useConnectionState` transitions to `'reconnecting'`
   **And** on successful reconnect, all previously subscribed groups are automatically rejoined
   **And** `useConnectionState` transitions back to `'connected'`

3. **Given** `useProjectionSubscription` hook is created in `src/notifications/useProjectionSubscription.ts`
   **When** a `useQuery` hook mounts with `projectionType` and `tenantId`
   **Then** the hook calls `JoinGroup(projectionType, tenantId)` on the SignalR connection
   **And** when the component unmounts, `LeaveGroup(projectionType, tenantId)` is called

4. **Given** the SignalR hub broadcasts `ProjectionChanged(projectionType, tenantId)`
   **When** the client receives the signal
   **Then** all active `useQuery` hooks matching that `projectionType` and `tenantId` re-fetch with `If-None-Match` ETag header
   **And** if the backend returns `304 Not Modified`, cached data is retained (zero network payload)
   **And** if the backend returns `200`, new data and ETag replace the cache entry

5. **Given** SignalR connection fails entirely (server unavailable)
   **When** all reconnection attempts are exhausted
   **Then** `useConnectionState` transitions to `'disconnected'`
   **And** polling fallback continues providing data freshness via `refetchInterval`
   **And** no error is surfaced to module developers -- degradation is transparent

6. **Given** the maximum group subscription limit (50 per connection) is reached
   **When** a new `useQuery` attempts to subscribe
   **Then** a warning is logged to console with the projectionType that was not subscribed
   **And** the query still functions via polling -- only real-time push is unavailable for that projection

## Tasks / Subtasks

- [x] Task 1: Add `@microsoft/signalr` dependency (AC: #1)
  - [x] 1.1 `pnpm add @microsoft/signalr@^10.0.0` in `packages/cqrs-client`
  - [x] 1.2 Verify build still produces ESM output with `.d.ts` and no bundle bloat

- [x] Task 2: Implement `SignalRHub` (real ISignalRHub) in `src/notifications/SignalRHub.ts` (AC: #1, #2)
  - [x] 2.1 Create class implementing `ISignalRHub` interface from `src/mocks/MockSignalRHub.ts`
  - [x] 2.2 Build `HubConnection` via `HubConnectionBuilder` with `withUrl(hubUrl, { accessTokenFactory })` and `.withAutomaticReconnect([1000, 3000, 5000, 10000, 30000])`
  - [x] 2.3 Map `connection.on('ProjectionChanged', ...)` to `onProjectionChanged` listeners
  - [x] 2.4 Implement `joinGroup` / `leaveGroup` with connection state guards: always add/remove from tracking `Set` regardless of connection state, but only call `connection.invoke('JoinGroup'/'LeaveGroup')` when `connection.state === HubConnectionState.Connected`. If not connected, the group is still tracked -- `joinGroup` groups will be re-joined on reconnect, `leaveGroup` groups will not. This prevents `invoke()` throwing during `reconnecting` or `disconnected` states.
  - [x] 2.5 Track joined groups in a `Set<string>` for auto-rejoin on reconnect
  - [x] 2.6 Wire `onreconnecting` / `onreconnected` / `onclose` to `connectionState` and listener notification
  - [x] 2.7 On `onreconnected`: iterate tracked groups and re-invoke `JoinGroup` for each
  - [x] 2.8 Implement `start()` and `stop()` methods for lifecycle management
  - [x] 2.9 Co-located tests: `SignalRHub.test.ts` -- use `vi.mock('@microsoft/signalr')` with a factory that returns a mock `HubConnectionBuilder` whose fluent `.withUrl().withAutomaticReconnect().build()` chain returns a mock `HubConnection`. Create a local `createMockHubConnection()` helper in the test file (not exported) that returns a mock object with `.start()`, `.stop()`, `.invoke()`, `.on()`, `.off()`, `.onreconnecting()`, `.onreconnected()`, `.onclose()`, and `.state`. Must include explicit test: `"re-joins all tracked groups after reconnection"`

- [x] Task 3: Create `SignalRProvider` in `src/notifications/SignalRProvider.tsx` (AC: #1, #2, #5)
  - [x] 3.1 React context providing `ISignalRHub` instance
  - [x] 3.2 Accept `hubUrl` and `accessTokenFactory` props
  - [x] 3.3 Create `SignalRHub` on mount, call `start()` wrapped in try/catch (on failure: set `connectionState = 'disconnected'`, log warning, do NOT throw -- queries continue via polling). On unmount: unsubscribe from all connection state change listeners FIRST, then call `stop()`. This ordering prevents `stop()` from triggering `onclose` which fires state listeners that try to update React state on an unmounted component.
  - [x] 3.4 Report connection state changes to `ConnectionStateProvider` via `useConnectionReporter()`
  - [x] 3.5 Update transport to `'signalr'` in ConnectionStateProvider when connected
  - [x] 3.6 On `'disconnected'` after exhausted retries, report failure (transport falls back to `'polling'`)
  - [x] 3.7 Export `useSignalRHub()` hook with null-check + throw pattern
  - [x] 3.8 Co-located tests: `SignalRProvider.test.tsx` using `MockSignalRHub`

- [x] Task 4: Create `useProjectionSubscription` hook in `src/notifications/useProjectionSubscription.ts` (AC: #3, #4, #6)
  - [x] 4.1 Accept `projectionType: string` and `tenantId: string` params
  - [x] 4.2 Access SignalR context via `useContext` directly with null check (NOT via `useSignalRHub()` which throws). If context is null (no `SignalRProvider` in tree), return a no-op -- this enables `useQuery` to call `useProjectionSubscription` safely in polling-only mode. Use `useEffect` with `[projectionType, tenantId]` dependency array. On mount: call `signalRHub.joinGroup(projectionType, tenantId)`. Return the unsubscribe function from `onProjectionChanged` as the `useEffect` cleanup.
  - [x] 4.3 On unmount: call `signalRHub.leaveGroup(projectionType, tenantId)`
  - [x] 4.4 Implement reference counting per group key (`Map<string, number>`): `joinGroup` increments count, `leaveGroup` decrements. Only invoke `JoinGroup` on SignalR connection when count goes from 0 to 1. Only invoke `LeaveGroup` when count reaches 0. This prevents multiple `useQuery` hooks sharing the same `(projectionType, tenantId)` from unsubscribing each other on unmount. **React StrictMode note**: StrictMode double-invokes effects (mount → unmount → mount). The ref count naturally handles this: mount (count 0→1, join) → unmount (count 1→0, leave) → mount (count 0→1, join). To prevent the rapid leave/join race from causing server-side subscription loss, debounce `LeaveGroup` invocations by ~50ms -- if a `JoinGroup` for the same key arrives within the debounce window, cancel the pending `LeaveGroup`.
  - [x] 4.5 Track total active group count (across all keys); enforce 50-group limit with `console.warn` on overflow
  - [x] 4.6 On `ProjectionChanged` matching this subscription: call `QueryProvider.notifyDomainInvalidation(projectionType, tenantId)`
  - [x] 4.7 Handle reconnect: subscriptions auto-rejoin via SignalRHub's group tracking (no hook action needed)
  - [x] 4.8 Co-located tests: `useProjectionSubscription.test.ts` using `MockSignalRHub`. Must include: boundary tests for 50-group limit (49 succeeds, 50 succeeds, 51 warns), reference counting tests (two hooks same group: first unmount does NOT call LeaveGroup, second unmount DOES call LeaveGroup), `useEffect` cleanup test (unmount unsubscribes from `onProjectionChanged`)

- [x] Task 5: Integrate `useProjectionSubscription` into `useQuery` (AC: #3, #4)
  - [x] 5.1 In `useQuery`, derive `projectionType` from query params (`domain` field)
  - [x] 5.2 Call `useProjectionSubscription(projectionType, tenantId)` inside `useQuery` unconditionally -- the hook internally handles missing `SignalRProvider` (returns no-op via null context check from Task 4.2)
  - [x] 5.3 No explicit guard needed in `useQuery` -- `useProjectionSubscription` handles the missing-provider case internally. `useQuery` simply calls it and moves on.
  - [x] 5.4 When `notifyDomainInvalidation` fires (from SignalR or commandEventBus), existing refetch logic already handles it -- no additional code
  - [x] 5.5 Update existing `useQuery.test.ts` to cover SignalR integration path

- [x] Task 6: Wire `SignalRProvider` into shell provider tree (AC: #1)
  - [x] 6.1 Add `SignalRProvider` to `CqrsProvider.tsx` or shell's `ShellProviders.tsx`
  - [x] 6.2 Provide `hubUrl` from runtime config (`commandApiBaseUrl + '/hubs/projection-changes'`)
  - [x] 6.3 Provide `accessTokenFactory` from auth context (same getter pattern as fetchClient)
  - [x] 6.4 Place INSIDE `ConnectionStateProvider` (so it can report state) and OUTSIDE `QueryProvider` (so queries can subscribe)

- [x] Task 7: Update exports and build (AC: all)
  - [x] 7.1 Export `SignalRProvider`, `useSignalRHub`, `useProjectionSubscription` from `src/index.ts`
  - [x] 7.2 Export `SignalRHub` class (for advanced use / testing)
  - [x] 7.3 Verify `tsup` build produces clean ESM + `.d.ts`
  - [x] 7.4 Verify `dist/index.js` includes `@microsoft/signalr` as external (peer/dependency, not bundled)
  - [x] 7.5 Run full test suite: all existing 251+ tests pass + new tests pass
  - [x] 7.6 Run lint: `pnpm lint` clean
  - [x] 7.7 Run full monorepo build: `pnpm build` succeeds

## Dev Notes

### Architecture Compliance

- **Ports-and-adapters pattern**: `SignalRHub` implements `ISignalRHub` -- same interface that `MockSignalRHub` implements. Tests can swap freely.
- **Single multiplexed connection**: One SignalR connection per shell instance. All projection subscriptions share it via `JoinGroup`/`LeaveGroup`.
- **SignalR is an optimization layer, NOT a requirement**: If SignalR is unavailable, all queries continue working via polling + command-complete invalidation. Zero errors surfaced to modules.
- **Exponential backoff**: Use `withAutomaticReconnect([1000, 3000, 5000, 10000, 30000])` (fixed delays). The architecture doc mentions "jittered" backoff, but `@microsoft/signalr`'s built-in `withAutomaticReconnect(number[])` uses fixed delays. A custom `IRetryPolicy` would be needed for true jitter. Fixed delays are acceptable for MVP (< 1000 concurrent users). If thundering herd becomes an issue at scale, implement `IRetryPolicy` with random jitter in a follow-up.
- **Object destructuring returns** (never tuples) for all hooks.
- **`I` prefix** for interfaces (`ISignalRHub`), `Mock` prefix for mocks.

### Critical Constraints

- **DO NOT add TanStack Query** -- removed per sprint change. State management is custom hooks + ETag cache.
- **DO NOT modify `ISignalRHub` interface** -- it is already defined in `MockSignalRHub.ts` and tests depend on it. Implement it exactly.
- **DO NOT modify `useQuery` return type** -- SignalR integration must be transparent. No new props exposed to module developers.
- **DO NOT create a separate `useSignalR` file** -- the hook exposing the hub context should be `useSignalRHub()` co-located with `SignalRProvider.tsx`.
- **DO NOT bundle `@microsoft/signalr` into the dist** -- it must be an external dependency (add to `dependencies` in package.json, mark external in tsup if needed).
- **Hub URL pattern**: `{commandApiBaseUrl}/hubs/projection-changes` (from runtime `/config.json`).
- **Group key format**: The SignalR hub uses `projectionType` + `tenantId` as group identifiers, matching the domain invalidation pattern. **Naming clarification**: `projectionType` (SignalR context) and `domain` (query context) are the **same string value**. Task 5.1 derives `projectionType` from the query's `domain` field. They are used interchangeably -- do not create a mapping layer.
- **DO NOT implement the 10-second disconnect banner** -- the UX spec mentions a non-dismissable "Connection lost" banner after 10s of disconnection. This is out of scope for story 2-7. The StatusBar already consumes `useConnectionState()` from story 1-6; SignalR state changes propagate to the status bar dot/text automatically. The escalation banner is a future UX enhancement.
- **50-group limit has no promotion**: If a group is rejected at subscription time (>50 groups), it remains unsubscribed even if another group later unsubscribes and a slot opens. The rejected group only gets a subscription when its component remounts. This is acceptable for MVP -- the console.warn tells the developer to reduce concurrent subscriptions.
- **`refetch()` is unchanged**: Module developers calling `refetch()` from `useQuery` still works exactly as before -- it sends a manual query with `If-None-Match` regardless of SignalR state. SignalR integration does not alter the `useQuery` return type or its manual refetch behavior.

### Existing Code to Reuse (DO NOT Reinvent)

| What | Where | How to Use |
|------|-------|------------|
| `ISignalRHub` interface | `src/mocks/MockSignalRHub.ts` | Implement this exact interface in `SignalRHub` |
| `MockSignalRHub` | `src/mocks/MockSignalRHub.ts` | Use in all unit tests instead of real SignalR |
| `ConnectionStateProvider` | `src/connection/ConnectionStateProvider.tsx` | Call `useConnectionReporter()` to report SignalR state changes |
| `useConnectionReporter()` | `src/connection/ConnectionStateProvider.tsx` | `reportSuccess()` on connected, `reportFailure()` on disconnect |
| `QueryProvider.notifyDomainInvalidation()` | `src/queries/QueryProvider.tsx` | Call when `ProjectionChanged` signal received |
| `commandEventBus` | `src/commands/commandEventBus.ts` | Already wired for command-complete invalidation -- do not duplicate |
| `etagCache` / `buildCacheKey()` | `src/queries/etagCache.ts` | Already handles `If-None-Match` on refetch -- no changes needed |
| `fetchClient` token getter pattern | `src/core/fetchClient.ts` | Same `accessTokenFactory` callback pattern for SignalR auth |
| `CqrsProvider` | `src/CqrsProvider.tsx` | Provider composition reference; may host `SignalRProvider` |
| Error hierarchy | `src/errors.ts` | 7 error classes -- do not add new ones for SignalR (degrade silently) |

### `ISignalRHub` Interface (Already Defined)

```typescript
// From src/mocks/MockSignalRHub.ts -- implement this EXACTLY
type SignalRConnectionState = 'connected' | 'disconnected' | 'reconnecting';

interface ISignalRHub {
  joinGroup(projectionType: string, tenantId: string): void;
  leaveGroup(projectionType: string, tenantId: string): void;
  onProjectionChanged(listener: (projectionType: string, tenantId: string) => void): () => void;
  readonly connectionState: SignalRConnectionState;
  onConnectionStateChange(listener: (state: SignalRConnectionState) => void): () => void;
}
```

### SignalR Connection Lifecycle

```
Shell starts → SignalRProvider mounts
  │
  ├─ HubConnectionBuilder()
  │   .withUrl(hubUrl, { accessTokenFactory })
  │   .withAutomaticReconnect([1000, 3000, 5000, 10000, 30000])
  │   .build()
  │
  ├─ try { connection.start() } catch { connectionState = 'disconnected' + warn }
  │   ├─ Success → connectionState = 'connected' + ConnectionStateProvider.reportSuccess()
  │   └─ Failure → connectionState = 'disconnected' + log warning (queries use polling)
  │
  ├─ useQuery mounts → useProjectionSubscription(domain, tenantId)
  │   └─ hub.joinGroup(domain, tenantId)
  │       └─ connection.invoke('JoinGroup', domain, tenantId)
  │
  ├─ Server broadcasts ProjectionChanged(domain, tenantId)
  │   └─ hub.onProjectionChanged listeners fire
  │       └─ QueryProvider.notifyDomainInvalidation(domain, tenantId)
  │           └─ useQuery refetches with If-None-Match → 304 or 200
  │
  ├─ Connection drops → onreconnecting
  │   ├─ connectionState = 'reconnecting'
  │   └─ ConnectionStateProvider.reportFailure()
  │
  ├─ Reconnect succeeds → onreconnected
  │   ├─ connectionState = 'connected'
  │   ├─ Re-invoke JoinGroup for all tracked groups
  │   └─ ConnectionStateProvider.reportSuccess()
  │
  └─ Reconnect exhausted → onclose
      ├─ connectionState = 'disconnected'
      ├─ ConnectionStateProvider.reportFailure() (3+ failures → 'disconnected')
      └─ Queries continue via polling fallback (refetchInterval)
```

### Provider Nesting Order

```
ShellProviders.tsx:
  AuthProvider
    TenantProvider
      ConnectionStateProvider         ← already exists
        SignalRProvider                ← NEW (needs ConnectionStateProvider above, QueryProvider below)
          QueryProvider               ← already exists (useProjectionSubscription calls notifyDomainInvalidation)
            CqrsProvider              ← already exists
              ThemeProvider
                LocaleProvider
                  {children}
```

### File Structure (New Files)

```
packages/cqrs-client/src/
├── notifications/                    ← NEW directory
│   ├── SignalRHub.ts                 ← Real ISignalRHub implementation wrapping @microsoft/signalr
│   ├── SignalRHub.test.ts            ← Unit tests (mock HubConnectionBuilder)
│   ├── SignalRProvider.tsx           ← React context + useSignalRHub() hook
│   ├── SignalRProvider.test.tsx      ← Tests using MockSignalRHub
│   ├── useProjectionSubscription.ts  ← Hook for group join/leave + invalidation
│   └── useProjectionSubscription.test.ts
```

### Testing Strategy

- **Unit tests use `MockSignalRHub`** (already complete from story 2-6) -- not real SignalR connections.
- **`SignalRHub.ts` tests**: Mock `@microsoft/signalr` via `vi.mock('@microsoft/signalr')` with factory. Create a local `createMockHubConnection()` helper (not exported) returning a mock with all connection methods (`.start()`, `.stop()`, `.invoke()`, `.on()`, `.off()`, `.onreconnecting()`, `.onreconnected()`, `.onclose()`, `.state`). Verify `joinGroup` invokes `connection.invoke('JoinGroup', ...)`, state transitions fire listeners. Critical tests:
  - `"re-joins all tracked groups after reconnection"` -- verify `connection.invoke('JoinGroup', ...)` is called exactly N times after `onreconnected` fires, where N = number of tracked groups. This is a **count assertion**, not just a boolean.
  - `"joinGroup is no-op on invoke when not connected"` -- verify group is added to tracking Set but `connection.invoke` is NOT called when `connection.state !== Connected`.
  - `"leaveGroup removes from tracking Set even when disconnected"` -- verify group is removed and won't be re-joined on reconnect.
  - `"start() failure sets disconnected state without throwing"` -- verify try/catch behavior.
- **`SignalRProvider.test.tsx`**: Render with `MockSignalRHub` injected. Verify context provides hub, useSignalRHub() returns it, cleanup calls `stop()`.
- **`useProjectionSubscription.test.ts`**: Use `MockSignalRHub`. Verify mount calls `joinGroup`, unmount calls `leaveGroup`, `emitProjectionChanged` triggers `notifyDomainInvalidation`. Boundary tests for 50-group limit: 49 succeeds silently, 50 succeeds silently, 51 warns + polling fallback.
- **`useQuery.test.ts` updates**: Add test case where `SignalRProvider` is in tree; verify `ProjectionChanged` triggers refetch.
- **All 251+ existing tests must continue passing** -- no regressions.
- Test co-location: `*.test.ts(x)` next to source files. No `__tests__/` directories.

### `@microsoft/signalr` Library Notes

- **Package**: `@microsoft/signalr@^10.0.0` (~30KB gzipped)
- **Import**: `import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'`
- **Key API**:
  - `new HubConnectionBuilder().withUrl(url, { accessTokenFactory }).withAutomaticReconnect(retryDelays).build()`
  - `connection.start(): Promise<void>`
  - `connection.stop(): Promise<void>`
  - `connection.invoke(methodName, ...args): Promise<any>` -- for `JoinGroup` / `LeaveGroup`
  - `connection.on(methodName, handler)` -- for `ProjectionChanged`
  - `connection.off(methodName, handler)` -- cleanup
  - `connection.onreconnecting(error => ...)` -- state change callback
  - `connection.onreconnected(connectionId => ...)` -- reconnect success
  - `connection.onclose(error => ...)` -- permanent disconnect
  - `connection.state` -- `HubConnectionState.Connected | Disconnected | Connecting | Reconnecting`
- **Transport**: Default is WebSocket with auto-fallback to SSE then LongPolling. Do NOT restrict transports.
- **Token refresh**: `accessTokenFactory` is called on every request/reconnect, so it automatically picks up refreshed tokens from `oidc-client-ts`.
- **Handlers persist across reconnects**: `.on()` handlers survive reconnection. Only group memberships (server-side state) need re-joining.
- **Token refresh edge case**: If `accessTokenFactory` returns a stale token during reconnect (before `oidc-client-ts` silent refresh completes), the reconnect attempt may fail with 401. `@microsoft/signalr` treats this as fatal and fires `onclose`. This is expected -- the next user action or polling cycle triggers token refresh, and the shell can re-establish SignalR on the next successful auth event. Do NOT add custom retry logic for this case.

### Architecture Decision Records (Story 2-7)

**ADR-0: Dual group tracking -- non-redundant by design**
- **Context**: Both `SignalRHub` (tracking `Set<string>`) and `useProjectionSubscription` (ref counting `Map<string, number>`) track group subscriptions.
- **Decision**: Keep both. They serve different purposes and must not be merged.
- **Rationale**: `SignalRHub.Set` is a transport-level concern -- it tracks which groups to re-join on reconnect. It knows nothing about React. `useProjectionSubscription.Map` is a React-level concern -- it tracks how many hooks share a subscription to prevent premature `LeaveGroup`. It knows nothing about reconnection. Merging them would violate separation of concerns.

**ADR-1: Reference counting for group subscriptions**
- **Context**: Multiple `useQuery` hooks may subscribe to the same `(projectionType, tenantId)` group.
- **Decision**: Reference count per group key via `Map<string, number>`. Only invoke `JoinGroup` on the SignalR connection when count goes 0 → 1. Only invoke `LeaveGroup` when count reaches 0.
- **Rationale**: Without ref counting, the first hook to unmount removes the group subscription for all other hooks sharing it. Projections go silent for remaining subscribers.

**ADR-2: `joinGroup`/`leaveGroup` connection state guards**
- **Context**: `connection.invoke()` throws if connection is not in `Connected` state (e.g., during `reconnecting` or `disconnected`).
- **Decision**: `SignalRHub.joinGroup()` always adds to tracking `Set`. `SignalRHub.leaveGroup()` always removes from tracking `Set`. The actual `connection.invoke('JoinGroup'/'LeaveGroup')` only fires when `connection.state === HubConnectionState.Connected`. On reconnect, all groups still in the `Set` are re-joined automatically.
- **Rationale**: Clean separation of tracking (always consistent) vs. server communication (only when possible). No errors on race conditions. Groups survive reconnection cycles correctly.

**ADR-3: `start()` error handling -- silent degradation**
- **Context**: `connection.start()` rejects if backend is unreachable at shell startup.
- **Decision**: Wrap `start()` in try/catch. On failure, set `connectionState = 'disconnected'` and log warning. Do NOT throw or re-throw. Queries continue via polling.
- **Rationale**: The shell must always start successfully regardless of backend availability. SignalR is purely additive -- its absence should never block the application.

### Previous Story Intelligence (Story 2-6)

- **Mocks are public API**: Exported from `src/index.ts`, not test internals.
- **`src/mocks/` directory** (not `__mocks__/`): Convention established in story 2-6.
- **Dual entry point**: `src/index.ts` (main) + `src/testing.ts` (contract test helpers). Story 2-7 should only modify `src/index.ts`.
- **Build produces**: `dist/index.js` + `dist/testing.js` with `.d.ts` files.
- **Package.json exports map** has `"."` and `"./testing"` entries.
- **Import ordering**: Value imports before type imports, blank line between external/internal groups.
- **Delay clamping**: Established pattern for non-negative configuration values.
- **42 existing tests** added in story 2-6 (16 MockCommandBus, 14 MockQueryBus, 12 MockSignalRHub).
- **Total test count**: 251+ tests across the monorepo.

### Git Intelligence

Recent commits show sequential story completion pattern: 2-4 done, 2-5 done, 2-6 done. Each story added files in `packages/cqrs-client/src/` and updated sprint status. Lint and build must pass before commit.

### Project Structure Notes

- All new files go in `packages/cqrs-client/src/notifications/` -- this directory does not exist yet, create it.
- `SignalRHub` (real implementation) lives in `src/notifications/`, NOT in `src/mocks/`.
- `MockSignalRHub` stays in `src/mocks/` (already exists from story 2-6).
- The `ISignalRHub` interface type should be extracted to a shared location (e.g., `src/notifications/types.ts`) or re-exported from `MockSignalRHub.ts` -- check where the type is currently defined and import from there.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.7]
- [Source: _bmad-output/planning-artifacts/architecture.md - Projection Caching Strategy, SignalR Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md - API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md - State Management Summary]
- [Source: _bmad-output/planning-artifacts/architecture.md - Cross-Cutting Concerns, Real-time data]
- [Source: _bmad-output/planning-artifacts/prd.md - FR11, FR12, FR13, FR17]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Status Bar, Three-Phase Feedback]
- [Source: _bmad-output/implementation-artifacts/2-6-mock-implementations-and-contract-tests.md - ISignalRHub interface, MockSignalRHub patterns]
- [Source: packages/cqrs-client/src/mocks/MockSignalRHub.ts - ISignalRHub interface definition]
- [Source: packages/cqrs-client/src/connection/ConnectionStateProvider.tsx - connection state reporting]
- [Source: packages/cqrs-client/src/queries/QueryProvider.tsx - domain invalidation pub/sub]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- No halts or blockers encountered during implementation.
- Pre-existing unhandled rejection in `useQuery.test.ts` (timer firing after teardown) — not introduced by this story.

### Completion Notes List

- **Task 1**: Added `@microsoft/signalr@^10.0.0` dependency. Build verified.
- **Task 2**: Implemented `SignalRHub` class in `src/notifications/SignalRHub.ts` implementing `ISignalRHub` interface. Uses `HubConnectionBuilder` with exponential backoff `[1000, 3000, 5000, 10000, 30000]`. Connection state guards on `joinGroup`/`leaveGroup` prevent `invoke()` errors during reconnection. Group tracking `Set<string>` enables auto-rejoin on reconnect. 14 unit tests with mocked `@microsoft/signalr`.
- **Task 3**: Created `SignalRProvider` in `src/notifications/SignalRProvider.tsx`. React context provides `ISignalRHub`, reports connection state to `ConnectionStateProvider`, updates transport type. Cleanup unsubscribes before `stop()` to prevent unmounted state updates. Added `setTransport` to `ConnectionStateProvider` for dynamic transport reporting. 5 tests using `MockSignalRHub`.
- **Task 4**: Created `useProjectionSubscription` hook with reference counting (`Map<string, number>`) for shared group subscriptions. 50ms debounce on `LeaveGroup` handles React StrictMode cycles. 50-group limit with `console.warn` on overflow. Exposed `notifyDomainInvalidation` from `QueryProvider` context. 11 tests including boundary tests for 50-group limit and ref counting.
- **Task 5**: Integrated `useProjectionSubscription` into `useQuery` — called unconditionally with `queryParams.domain` as `projectionType`. No-op when no `SignalRProvider` in tree. 2 new integration tests in `useQuery.test.ts`.
- **Task 6**: Wired `SignalRProvider` into `CqrsProvider.tsx` between `ConnectionStateProvider` and `QueryProvider`. Hub URL derived from `commandApiBaseUrl + '/hubs/projection-changes'`. Token factory uses same `tokenGetter` pattern as `fetchClient`.
- **Task 7**: Exported `SignalRHub`, `SignalRProvider`, `useSignalRHub`, `useProjectionSubscription`. Build verified: ESM + `.d.ts`, `@microsoft/signalr` external. 285 tests pass, lint clean, full monorepo build succeeds.

### File List

**New files:**
- `packages/cqrs-client/src/notifications/SignalRHub.ts` — Real `ISignalRHub` implementation wrapping `@microsoft/signalr`
- `packages/cqrs-client/src/notifications/SignalRHub.test.ts` — 14 unit tests
- `packages/cqrs-client/src/notifications/SignalRProvider.tsx` — React context + `useSignalRHub()` hook
- `packages/cqrs-client/src/notifications/SignalRProvider.test.tsx` — 5 tests
- `packages/cqrs-client/src/notifications/useProjectionSubscription.ts` — Group subscription hook with ref counting
- `packages/cqrs-client/src/notifications/useProjectionSubscription.test.ts` — 11 tests

**Modified files:**
- `packages/cqrs-client/package.json` — Added `@microsoft/signalr@^10.0.0` dependency
- `packages/cqrs-client/src/index.ts` — Added SignalR exports
- `packages/cqrs-client/src/CqrsProvider.tsx` — Inserted `SignalRProvider` in provider tree; optional `signalRHub` for tests (`MockSignalRHub`)
- `packages/cqrs-client/src/CqrsProvider.test.tsx` — Asserts `signalRHub` wiring without real SignalR
- `packages/cqrs-client/src/connection/ConnectionStateProvider.tsx` — Added `setTransport`, `reportSignalRHubDisconnected` to context / `useConnectionReporter`
- `packages/cqrs-client/src/index.ts` — Export `CqrsProviderProps` (includes optional `signalRHub`)
- `packages/cqrs-client/src/queries/QueryProvider.tsx` — Exposed `notifyDomainInvalidation` in context value
- `packages/cqrs-client/src/queries/useQuery.ts` — Calls `useProjectionSubscription` for real-time updates
- `packages/cqrs-client/src/queries/useQuery.test.ts` — Added 2 SignalR integration tests
- `packages/cqrs-client/src/commands/useCommandPipeline.test.ts` — `signalRHub: MockSignalRHub` in `CqrsProvider` wrapper
- `packages/cqrs-client/src/commands/useCommandStatus.test.ts` — same
- `packages/cqrs-client/src/commands/useSubmitCommand.test.ts` — same
- `apps/shell/src/providers/ShellProviders.tsx` — Optional `signalRHub` passed to `CqrsProvider`
- `apps/shell/src/providers/ShellProviders.test.tsx` — `MockSignalRHub` for quiet SignalR in tests

**Code review (2026-03-19) — fixes applied in implementation:**

- `packages/cqrs-client/src/connection/ConnectionStateProvider.tsx` — Added `reportSignalRHubDisconnected()` so terminal SignalR hub state maps to app `disconnected` without using the query retry failure ladder (fixes cold `start()` failure showing `reconnecting`).
- `packages/cqrs-client/src/notifications/SignalRProvider.tsx` — Hub `disconnected` now calls `reportSignalRHubDisconnected()` + `setTransport('polling')`.
- `packages/cqrs-client/src/notifications/SignalRHub.ts` — Internal group keys use unit separator `\u001f` instead of `:`, so `rejoinGroups()` cannot split `projectionType` / `tenantId` incorrectly when values contain colons.
- `packages/cqrs-client/src/notifications/SignalRHub.test.ts` — Regression test for re-join with colons in domain/tenant.
- `packages/cqrs-client/src/notifications/SignalRProvider.test.tsx` — Assert `state === 'disconnected'` after simulated hub disconnect.

### Review Follow-ups (AI) — resolved 2026-03-19

- [x] [MEDIUM] Optional `signalRHub` on `CqrsProvider` forwards to `SignalRProvider` as `hub` so tests can pass `MockSignalRHub` and avoid real negotiation. `CqrsProvider.test.tsx` covers the prop; `useCommandPipeline.test.ts`, `useCommandStatus.test.ts`, and `useSubmitCommand.test.ts` pass `MockSignalRHub` in their wrappers. `apps/shell` `ShellProviders` accepts optional `signalRHub` and `ShellProviders.test.tsx` passes `MockSignalRHub` (quiet tests, no live negotiation).
- [x] [MEDIUM] `useProjectionSubscription.test.ts` — `InvalidationSpy` subscribes via `onDomainInvalidation` and asserts `ProjectionChanged` triggers `notifyDomainInvalidation` for the matching domain/tenant.
- [x] [LOW] AC #1 updated to describe `useSignalRHub()` and token pattern (see above).

**Discovery:** `packages/` is listed in `.gitignore`, so git cannot corroborate the story File List for `packages/cqrs-client/` — rely on workspace files for audits.
