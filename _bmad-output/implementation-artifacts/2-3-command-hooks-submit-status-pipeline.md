# Story 2.3: Command Hooks — Submit, Status & Pipeline

Status: done

## Story

As a module developer,
I want to send commands to the backend and receive lifecycle feedback (success, rejection, timeout),
so that I can provide clear user feedback without writing transport or polling code.

## Acceptance Criteria

1. **Given** `useSubmitCommand` hook is created in `src/commands/useSubmitCommand.ts`
   **When** a module developer calls `const { submit, correlationId, error } = useSubmitCommand()`
   **Then** `submit(command)` sends a `POST /api/v1/commands` request and returns `{ correlationId }`
   **And** the return shape uses object destructuring (never tuples)

2. **Given** `useCommandStatus` hook is created in `src/commands/useCommandStatus.ts`
   **When** a module developer calls `const { status, error } = useCommandStatus(correlationId)`
   **Then** the hook polls `GET /api/v1/commands/status/{correlationId}` every 1 second
   **And** polling stops on any terminal status (`Completed`, `Rejected`, `PublishFailed`, `TimedOut`)

3. **Given** `useCommandPipeline` hook is created in `src/commands/useCommandPipeline.ts`
   **When** a module developer calls `const { send, status, error, correlationId, replay } = useCommandPipeline()`
   **Then** the hook composes `useSubmitCommand` + `useCommandStatus` into a single state machine
   **And** `status` updates through: `'idle'` → `'sending'` → `'polling'` → `'completed'` | `'rejected'` | `'failed'` | `'timedOut'`

4. **Given** the backend returns `Completed` status
   **When** the polling detects it
   **Then** polling stops
   **And** a `commandCompleted` event is emitted for projection cache invalidation (same-client immediate invalidation for Story 2.4's `useQuery`)
   **And** `status` becomes `'completed'`

5. **Given** the backend returns `Rejected` status
   **When** the polling detects it
   **Then** polling stops and a `CommandRejectedError` is surfaced via the `error` return value
   **And** `status` becomes `'rejected'`

6. **Given** the backend returns `PublishFailed` or `TimedOut` status
   **When** the polling detects it
   **Then** polling stops and the appropriate error (`CommandTimeoutError`) is surfaced
   **And** the hook exposes a `replay` function for retrying via `POST /api/v1/commands/replay/{correlationId}`

7. **Given** `useCommandPipeline` is called outside the shell provider context
   **When** the hook attempts to access auth/tenant context
   **Then** a descriptive error is thrown: `"useCommandPipeline must be used within CqrsProvider"`

8. **Given** `CqrsProvider` is created in `src/CqrsProvider.tsx` (package root — serves commands and queries)
   **When** the shell inserts it into the provider tree
   **Then** it creates a configured `FetchClient` from `commandApiBaseUrl` and `tokenGetter` props
   **And** command hooks access the `FetchClient` via `useCqrs()` context hook

9. **Given** the shell's `ShellProviders.tsx` is updated
   **When** the app renders
   **Then** `CqrsProvider` sits between `TenantProvider` and `ConnectionHealthProvider` in the provider chain
   **And** `tokenGetter` is wired to the OIDC access token via `react-oidc-context`

## Tasks / Subtasks

- [x] Task 0: Create shared command types file
  - [x]Create `src/commands/types.ts` — single canonical location for shared command types:

    ```typescript
    export type PipelineStatus =
      | "idle"
      | "sending"
      | "polling"
      | "completed"
      | "rejected"
      | "failed"
      | "timedOut";

    export interface SubmitCommandInput {
      domain: string;
      aggregateId: string;
      commandType: string;
      payload: unknown;
      extensions?: Record<string, string>;
    }
    ```

  - [x]`PipelineStatus` has 7 states — `useCommandStatus` uses a subset (never enters `'sending'`), `useCommandPipeline` uses all 7. Define once here, import everywhere.
  - [x]`SubmitCommandInput` also shared — used by `useSubmitCommand` and re-exported from `useCommandPipeline`. Note: `payload: unknown` is intentional — each module passes domain-specific data (e.g., `{ name: 'Acme' }` for creating a tenant). Type safety is the module developer's responsibility via their own typed wrapper.
  - [x]Export both from `src/index.ts`

- [x] Task 1: Create `CqrsProvider` and `useCqrs` context hook (AC: #7, #8, #9)
  - [x]Create `src/CqrsProvider.tsx` (package root level, NOT `src/commands/`) — CqrsProvider serves both commands (this story) AND queries (Story 2.4), so it's a package-wide concern:
    - `CqrsProviderProps`: `{ commandApiBaseUrl: string; tokenGetter: () => Promise<string | null>; children: ReactNode }`
    - Creates `FetchClient` via `createFetchClient({ baseUrl: commandApiBaseUrl, tokenGetter })` in a `useMemo` (stable reference)
    - Creates `CommandEventBus` instance (see Task 1b) in a `useMemo`
    - Provides both via `CqrsContext`
  - [x]Create `CqrsContextValue` interface: `{ fetchClient: FetchClient; commandEventBus: CommandEventBus }`
  - [x]Create `useCqrs()` hook that throws descriptive error if context is null
  - [x]Export `CqrsProvider` and `useCqrs` from `src/index.ts`
  - [x]Create `src/CqrsProvider.test.tsx` — test context guard error, test children rendering

- [x] Task 1b: Create `CommandEventBus` for cache invalidation signaling (AC: #4)
  - [x]Create `src/commands/commandEventBus.ts`:

    ```typescript
    export interface CommandCompletedEvent {
      correlationId: string;
      domain: string;
      aggregateId: string;
      tenant: string;
    }

    export interface CommandEventBus {
      onCommandCompleted(listener: (event: CommandCompletedEvent) => void): () => void;
      emitCommandCompleted(event: CommandCompletedEvent): void;
    }

    export function createCommandEventBus(): CommandEventBus { ... }
    ```

  - [x]Simple listener-list pattern (NOT DOM EventTarget — runs outside DOM in tests)
  - [x]`onCommandCompleted` returns an unsubscribe function (for React effect cleanup)
  - [x]Export `CommandCompletedEvent` and `CommandEventBus` type from `src/index.ts`
  - [x]Create `src/commands/commandEventBus.test.ts`

- [x] Task 2: Create `useSubmitCommand` hook (AC: #1)
  - [x]Create `src/commands/useSubmitCommand.ts`:

    ```typescript
    import type { SubmitCommandInput } from './types'; // From Task 0
    // Note: `tenant` is NOT in SubmitCommandInput — auto-injected from useTenant()

    interface UseSubmitCommandResult {
      submit: (command: SubmitCommandInput) => Promise<SubmitCommandResponse>;
      correlationId: string | null;
      error: HexalithError | null;
    }

    export function useSubmitCommand(): UseSubmitCommandResult { ... }
    ```

  - [x]`submit(command)`:
    1. Reset error state to null, reset correlationId to null
    2. Get `activeTenant` from `useTenant()` — the tenant field is populated from context, NOT from the caller
    3. Validate `activeTenant` is not null — throw `new ForbiddenError('No active tenant selected — cannot submit command without tenant context')`. Do NOT throw bare `Error` — use the typed error hierarchy per enforcement guidelines.
    4. Call `fetchClient.post<SubmitCommandResponse>('/api/v1/commands', { body: { ...command, tenant: activeTenant } })` — `activeTenant` is `string | null`, NOT an object
    5. On success: set `correlationId` state, return response
    6. On error: **catch, set `error` state, then re-throw**. This dual behavior is intentional — `error` state triggers re-render for inline error display, while the re-throw allows `useCommandPipeline` (or standalone callers) to catch in their own flow. Both code paths are exercised.
  - [x]Create `src/commands/useSubmitCommand.test.ts`

- [x] Task 3: Create `useCommandStatus` polling hook (AC: #2)
  - [x]Create `src/commands/useCommandStatus.ts`:

    ```typescript
    import type { PipelineStatus } from './types'; // From Task 0 — 7-state superset; this hook uses subset (never 'sending')

    interface UseCommandStatusResult {
      status: PipelineStatus;
      response: CommandStatusResponse | null;
      error: HexalithError | null;
    }

    export function useCommandStatus(correlationId: string | null): UseCommandStatusResult { ... }
    ```

  - [x]When `correlationId` is null: return `{ status: 'idle', response: null, error: null }` (no polling)
  - [x]When `correlationId` is set:
    1. Start polling `GET /api/v1/commands/status/{correlationId}` every 1000ms via `setInterval`
    2. Poll immediately on correlationId change (don't wait 1s for first poll)
    3. On each poll: update `response` with latest `CommandStatusResponse`
    4. Terminal statuses: `Completed`, `Rejected`, `PublishFailed`, `TimedOut` → stop polling
    5. Map terminal status to `PipelineStatus`:
       - `Completed` → `'completed'`
       - `Rejected` → `'rejected'`, create `CommandRejectedError(response.rejectionEventType, response.correlationId)` → set error
       - `PublishFailed` → `'failed'`, create `CommandTimeoutError(response.failureReason ?? 'Publish failed', response.correlationId)` → set error
       - `TimedOut` → `'timedOut'`, create `CommandTimeoutError(response.timeoutDuration ?? 'unknown', response.correlationId)` → set error
    6. Non-terminal statuses (`Received`, `Processing`, `EventsStored`, `EventsPublished`): continue polling, status = `'polling'`
  - [x]**Recommended:** Extract the terminal-status-to-PipelineStatus mapping (the `switch` block) into a pure function `mapTerminalStatus(resp: CommandStatusResponse): { status: PipelineStatus; error?: HexalithError }`. This is independently testable without React hook scaffolding and simplifies the `useEffect` body.
  - [x]Use `useEffect` cleanup to clear interval on unmount or correlationId change
  - [x]Use `useRef` for interval ID to avoid stale closure issues
  - [x]Handle fetch errors during polling: set error state, stop polling (do NOT retry indefinitely — infrastructure errors bubble). This is a deliberate simplification — Story 2.5 adds retry with jittered exponential backoff for transient network errors. Add a `// TODO: Story 2.5 adds retry with backoff for transient errors` comment at the error catch site.
  - [x]**Deliberate simplifications (Story 2.5 scope):** The following are NOT bugs — they're deferred to Story 2.5:
    - No max polling duration — commands could theoretically poll forever if the backend never returns a terminal status. Story 2.5 should add a ~60s timeout.
    - Unknown status values (e.g., if the backend adds `'Cancelling'`) cause continued polling. Story 2.5 should add an unknown-status safety valve.
    - Slow backend responses (>1s) cause overlapping poll requests. Harmless (React batches setState) but wasteful. Story 2.5 should skip a poll tick if the previous one hasn't returned.
  - [x]Create `src/commands/useCommandStatus.test.ts`

- [x] Task 4: Create `useCommandPipeline` composed hook (AC: #3, #4, #5, #6)
  - [x]Create `src/commands/useCommandPipeline.ts`:

    ```typescript
    import type { PipelineStatus, SubmitCommandInput } from './types'; // From Task 0

    interface UseCommandPipelineResult {
      send: (command: SubmitCommandInput) => Promise<void>;
      status: PipelineStatus;
      error: HexalithError | null;
      correlationId: string | null;
      replay: (() => Promise<void>) | null;
    }

    export function useCommandPipeline(): UseCommandPipelineResult { ... }
    ```

  - [x]**CRITICAL: Store last command input** — Use a `useRef<{ domain: string; aggregateId: string; tenant: string } | null>` to preserve the `domain`, `aggregateId`, and `tenant` from the `send()` call. These values are needed when emitting `commandCompleted` event on completion, but `useCommandStatus` only returns status/correlationId — NOT the original command context.
  - [x]State machine:
    1. Initial state: `'idle'`, no correlationId, no error
    2. `send(command)`: store `{ domain: command.domain, aggregateId: command.aggregateId, tenant: activeTenant }` in ref (`activeTenant` is a string), transition to `'sending'`, call `useSubmitCommand().submit(command)`
    3. On submit success: transition to `'polling'` (useCommandStatus auto-starts)
    4. On submit error: transition to `'failed'`, set error
    5. Terminal transitions from `useCommandStatus`:
       - `'completed'` → emit `commandEventBus.emitCommandCompleted({ correlationId, ...commandInputRef.current })` using the STORED command context
       - `'rejected'` → set error from useCommandStatus
       - `'failed'` | `'timedOut'` → set error, create `replay` function
  - [x]`replay` function (only available after `'failed'` or `'timedOut'`):
    1. Call ``fetchClient.post<SubmitCommandResponse>(`/api/v1/commands/replay/${correlationId}`)``
    2. On success: set new correlationId, transition to `'polling'`
    3. On 409 (non-replayable): `parseProblemDetails` returns `ApiError(409, body)` which the fetchClient throws. Catch it, set as `error`, transition to `'failed'`. The dev agent does NOT need special 409 handling — the fetchClient already throws typed errors.
  - [x]`send` should reset the entire state machine (clear correlationId, error, status → 'sending')
  - [x]Create `src/commands/useCommandPipeline.test.ts`

- [x] Task 5: Wire `CqrsProvider` into shell (AC: #9)
  - [x]Update `apps/shell/src/providers/ShellProviders.tsx`:
    - Import `CqrsProvider` from `@hexalith/cqrs-client`
    - Insert between `TenantProvider` and `ConnectionHealthProvider`:
      ```tsx
      <AuthProvider ...>
        <TenantProvider ...>
          <CqrsProvider
            commandApiBaseUrl={backendUrl}
            tokenGetter={/* see below */}
          >
            <ConnectionHealthProvider ...>
              ...
            </ConnectionHealthProvider>
          </CqrsProvider>
        </TenantProvider>
      </AuthProvider>
      ```
    - Create `tokenGetter` callback: use `react-oidc-context`'s `useAuth()` hook to get `auth.user?.access_token`. The callback MUST be stable (wrapped in `useCallback`) to prevent FetchClient re-creation:

      ```typescript
      import { useAuth } from "react-oidc-context";

      const auth = useAuth();
      const tokenGetter = useCallback(
        () => Promise.resolve(auth.user?.access_token ?? null),
        [auth.user?.access_token],
      );
      ```

  - [x]Update `apps/shell/src/providers/ShellProviders.test.tsx` if it exists to include CqrsProvider

- [x] Task 6: Export public API from `src/index.ts` (AC: all)
  - [x]Add to `packages/cqrs-client/src/index.ts`:

    ```typescript
    // Provider (package-level — serves commands + queries)
    export { CqrsProvider, useCqrs } from "./CqrsProvider";

    // Command types (shared)
    export type { PipelineStatus, SubmitCommandInput } from "./commands/types";

    // Command hooks
    export { useSubmitCommand } from "./commands/useSubmitCommand";
    export { useCommandStatus } from "./commands/useCommandStatus";
    export { useCommandPipeline } from "./commands/useCommandPipeline";

    // Command event bus types
    export type {
      CommandCompletedEvent,
      CommandEventBus,
    } from "./commands/commandEventBus";
    ```

  - [x]Do NOT export `createCommandEventBus` — it's internal (only CqrsProvider creates it)
  - [x]Do NOT export `useCqrs` if it's only for internal hook use — DECISION: export it because modules may need direct FetchClient access for advanced patterns
  - [x]Verify `pnpm build` succeeds

- [x] Task 7: Write comprehensive tests (AC: all)
  - [x]**CqrsProvider.test.tsx**: context guard throws, children render, fetchClient created with correct config
  - [x]**commandEventBus.test.ts**: subscribe, emit, unsubscribe, multiple listeners, unsubscribe stops delivery
  - [x]**useSubmitCommand.test.ts**:
    - Successful submit sets correlationId
    - Submit includes tenant from context (NOT from caller)
    - Submit with null tenant throws ForbiddenError (NOT bare Error)
    - Error response sets error state AND re-throws (test both: error state via hook result, throw via expect().rejects)
    - 401 sets error to AuthError AND throws AuthError
    - 403 sets error to ForbiddenError AND throws ForbiddenError
    - Return shape is object (not tuple)
  - [x]**useCommandStatus.test.ts**:
    - Null correlationId returns idle state
    - Polls immediately on correlationId set
    - Polls every 1000ms
    - Stops on Completed status
    - Stops on Rejected status, sets CommandRejectedError
    - Stops on PublishFailed status, sets error
    - Stops on TimedOut status, sets CommandTimeoutError
    - Cleans up interval on unmount
    - Non-terminal statuses continue polling
    - Fetch error stops polling and sets error
  - [x]**useCommandPipeline.test.ts**:
    - Full lifecycle: idle → sending → polling → completed
    - Rejected lifecycle: idle → sending → polling → rejected
    - TimedOut lifecycle with replay: idle → sending → polling → timedOut → replay → polling → completed
    - Emits commandCompleted event on Completed
    - Replay function only available after failed/timedOut
    - Replay on 409 sets error
    - send() resets state machine
    - Context guard error (outside CqrsProvider)
  - [x]All hook tests: use `@testing-library/react` `renderHook` + `act`
  - [x]All tests mock `createFetchClient` and `useTenant` — do NOT call real APIs
  - [x]Vitest environment: `jsdom` for hook tests (React hooks need DOM)

- [x] Task 8: Configure test environment and add dev dependencies
  - [x]Run `pnpm --filter @hexalith/cqrs-client add -D @testing-library/react jsdom` (both are needed; jsdom is the vitest environment provider)
  - [x]Update `packages/cqrs-client/vitest.config.ts`: set `environment: 'jsdom'` globally — this package will have React hooks throughout (Stories 2.3, 2.4, 2.5), so global jsdom is appropriate. Do NOT use per-file `// @vitest-environment jsdom` annotations.
  - [x]Verify existing Story 2.1/2.2 tests still pass after environment change (pure TS tests run fine under jsdom)

- [x] Task 9: Verify package integrity
  - [x]`pnpm --filter @hexalith/cqrs-client build` succeeds (ESM + .d.ts)
  - [x]`pnpm --filter @hexalith/cqrs-client test` passes all tests
  - [x]`pnpm --filter @hexalith/cqrs-client lint` passes
  - [x]`pnpm build` (full monorepo) succeeds
  - [x]Verify CqrsProvider renders in shell without errors (manual or shell test)

## Dev Notes

### Architecture Compliance

- **Native `fetch` via `createFetchClient`** — Story 2.2's internal utility. NOT ky (removed per sprint change 2026-03-15). NOT a new HTTP client. The fetch client is in `src/core/fetchClient.ts` and is imported internally.
- **Object destructuring return shapes** — All hooks return named objects, never tuples. Follows TanStack Query convention per architecture: `const { data, isLoading, error } = useProjection(...)`.
- **Errors via return value + re-throw** — Hooks surface ALL errors (business AND infrastructure) via the `error` return property for inline display. Infrastructure errors (`AuthError`, `ForbiddenError`, `RateLimitError`, network errors) are ALSO re-thrown so they propagate to `ModuleErrorBoundary`. This dual behavior is intentional: `error` state triggers a re-render for one-frame visibility, while the re-throw ensures boundary catching. Business errors (`CommandRejectedError`, `CommandTimeoutError`) from polling are set in `error` state but NOT re-thrown — they're terminal states the module handles inline. Never `try/catch` around `useCommandPipeline` at the module level.
- **Tenant from context, NOT from caller** — `SubmitCommandRequest.tenant` is auto-injected from `useTenant().activeTenant` (which is `string | null` — a plain tenant ID, NOT an object) inside `useSubmitCommand`. Module developers pass `{ domain, aggregateId, commandType, payload }` — NOT `tenant`. This prevents tenant-mismatch bugs.
- **React Context provider pattern** — CqrsProvider follows the same pattern as AuthProvider, TenantProvider: named context, named Provider export, named hook export, hook throws if outside provider. [Source: architecture.md § React Context Provider Pattern, lines 993-1017]
- **No TanStack Query** — Removed per sprint change proposal 2026-03-15. Projection caching uses a custom ETag cache (Story 2.4). Do NOT add `@tanstack/react-query` as a dependency.
- **No SignalR in this story** — SignalR is Story 2.7. The `commandCompleted` event bus is the same-client invalidation mechanism. Cross-client invalidation is SignalR's job (Story 2.7).

### Critical Constraints

- **CRITICAL: `tokenGetter` prop MUST be reference-stable** — The `CqrsProvider` creates its `FetchClient` in a `useMemo` keyed on `[commandApiBaseUrl, tokenGetter]`. If the shell passes a new function reference on every render, the FetchClient is recreated, which resets all in-flight polling and breaks mid-command lifecycle. The shell's `tokenGetter` MUST be wrapped in `useCallback` (see Task 5). This is the single most likely source of subtle bugs in this story.
- **DO NOT create `useQuery` or query hooks** — Those are Story 2.4.
- **DO NOT create mock implementations** — `MockCommandBus`, `MockQueryBus` are Story 2.6.
- **DO NOT add SignalR** — Story 2.7. The `CommandEventBus` is a simple in-memory pub/sub for same-client use.
- **DO NOT add new runtime dependencies** — All needed packages are already in package.json: `@hexalith/shell-api` (for `useTenant`), `react` (peer dep for hooks). However, you MUST add `@testing-library/react` as a devDependency — it is NOT currently in `packages/cqrs-client/package.json`. Do NOT add the deprecated `@testing-library/react-hooks` — `renderHook` is included in `@testing-library/react` since React 18. Run: `pnpm --filter @hexalith/cqrs-client add -D @testing-library/react`.
- **DO NOT re-export FetchClient types from index.ts** — `FetchClient`, `FetchClientConfig`, `FetchRequestOptions`, `createFetchClient` are internal. Only `CqrsProvider` (which wraps them) is public.
- **DEPENDS ON Story 2.1 + 2.2** — This story imports from `./core/fetchClient` (createFetchClient, FetchClient), `./core/types` (SubmitCommandRequest, SubmitCommandResponse, CommandStatusResponse, CommandStatus), `./errors` (HexalithError, CommandRejectedError, CommandTimeoutError, AuthError). All exist and are verified working.
- **Token getter is a prop, NOT from shell-api** — `@hexalith/shell-api`'s `AuthContextValue` does NOT expose the raw access token (only `AuthUser` with mapped profile). The `tokenGetter` callback is passed as a prop to `CqrsProvider`, and the shell wires it to `react-oidc-context`'s `auth.user?.access_token`. This keeps `@hexalith/cqrs-client` decoupled from OIDC.
- **`useTenant` import path** — Import from `@hexalith/shell-api` (already a workspace dependency of cqrs-client). The hook is `useTenant()` and returns `TenantContextValue` with `activeTenant: { id: string; ... } | null`.
- **Polling interval is 1 second** — Per architecture decision #5: "Status endpoint returns `Retry-After: 1`". Do NOT make this configurable in MVP.
- **ALL three hooks require `CqrsProvider`** — Not just `useCommandPipeline`. `useSubmitCommand` and `useCommandStatus` also call `useCqrs()` internally. If used outside `CqrsProvider`, they throw "useCqrs must be used within CqrsProvider". AC #7 only mentions `useCommandPipeline`, but the context requirement applies to all three.

### Design Decision: CommandEventBus Pattern

The `commandCompleted` event (AC #4) uses a simple in-memory listener-list pattern instead of DOM `EventTarget` because:

1. Hooks may run in non-DOM test environments
2. Type safety — `CommandCompletedEvent` is fully typed
3. Cleanup — unsubscribe function for React effect cleanup
4. Scope — bus is scoped to CqrsProvider instance (not global)

Story 2.4's `useQuery` will subscribe to `commandEventBus.onCommandCompleted(...)` to trigger re-fetches for the affected domain. Story 2.7's SignalR handles cross-client invalidation.

**Important:** `CommandCompletedEvent.tenant` is the tenant at command submission time, NOT the currently active tenant. If the user switches tenants between `send()` and completion, the event still carries the original tenant. This is intentional — cache invalidation must target the tenant whose data actually changed.

### Design Decision: State Machine in useCommandPipeline

The `PipelineStatus` union type models the command lifecycle as a finite state machine:

```
              ┌──────────────────────────────────────┐
              │                                      │
              ▼                                      │
idle ──► sending ──► polling ──► completed            │
              │         │                             │
              │         ├──► rejected                  │
              │         ├──► failed ──► (replay) ──►──┘
              │         └──► timedOut ──► (replay) ──►─┘
              │
              └──► failed (submit error)
```

- `replay` transitions directly to `'polling'` (NOT through `'sending'`) — the command was already sent; replay tells the backend to re-process it. The replay endpoint returns a NEW correlationId, which triggers `useCommandStatus` to start polling again.
- `send()` always resets the entire state to `'sending'` (fresh lifecycle)
- Status transitions are driven by `useCommandStatus` response, NOT by manual setState calls
- **Race condition safety:** If `send()` is called twice rapidly, the second call resets the state machine including `correlationId`. The `useCommandStatus` effect cleanup runs before the new effect starts (React guarantees this), clearing the old polling interval. No additional guards needed — React's effect lifecycle handles this correctly.
- **Double-submit prevention is the caller's responsibility.** The hooks do NOT debounce or queue commands. If the user clicks submit twice, two commands are sent. Module code should disable the submit button while `status !== 'idle'` or `correlationId` is non-null.

### Design Notes (Inline)

- **`useCommandStatus.response` field:** AC #2 specifies `{ status, error }`. The implementation adds `response: CommandStatusResponse | null` — intentional for `useCommandPipeline` to access raw response data (`rejectionEventType`, `failureReason`, `timeoutDuration`). Not part of the public AC but necessary for internal composition.
- **Hook independence:** Each hook calls `useCqrs()` independently (3 calls per render when composed). React context lookup is O(1). Do NOT optimize by passing `fetchClient` as a parameter — hooks must be independently usable.
- **Unmount during polling:** If a component unmounts while polling, React's `useEffect` cleanup clears the interval. In-flight fetch requests may still complete and call `setState` on the unmounted component — React 18 handles this gracefully (no crash, dev-mode warning only). No `isMounted` ref pattern needed.

### File Structure (Target)

```
packages/cqrs-client/
├── src/
│   ├── index.ts                        # Add command hook + provider exports
│   ├── errors.ts                       # (From Story 2.1) — DO NOT modify
│   ├── CqrsProvider.tsx                # THIS STORY — package-level (serves commands + queries)
│   ├── CqrsProvider.test.tsx           # THIS STORY — provider tests
│   ├── core/
│   │   ├── fetchClient.ts              # (From Story 2.2) — imported by CqrsProvider
│   │   ├── types.ts                    # (From Story 2.1) — backend payload types
│   │   ├── correlationId.ts            # (From Story 2.1) — used by fetchClient
│   │   ├── problemDetails.ts           # (From Story 2.1) — used by fetchClient
│   │   ├── ICommandBus.ts              # (From Story 2.1) — NOT used by hooks directly
│   │   └── IQueryBus.ts               # (From Story 2.1) — NOT used by hooks directly
│   └── commands/                       # THIS STORY — new directory
│       ├── types.ts                    # THIS STORY — PipelineStatus, SubmitCommandInput
│       ├── commandEventBus.ts          # CommandEventBus factory + types
│       ├── commandEventBus.test.ts     # Event bus tests
│       ├── useSubmitCommand.ts         # Submit hook
│       ├── useSubmitCommand.test.ts    # Submit tests
│       ├── useCommandStatus.ts         # Status polling hook
│       ├── useCommandStatus.test.ts    # Polling tests
│       ├── useCommandPipeline.ts       # Composed pipeline hook
│       └── useCommandPipeline.test.ts  # Pipeline tests
apps/shell/
└── src/
    └── providers/
        └── ShellProviders.tsx          # Modified — insert CqrsProvider
```

### Naming Conventions

| Element            | Convention             | Example                                                      |
| ------------------ | ---------------------- | ------------------------------------------------------------ |
| Hooks              | camelCase with `use`   | `useSubmitCommand`, `useCommandStatus`, `useCommandPipeline` |
| Provider component | PascalCase             | `CqrsProvider`                                               |
| Context hook       | camelCase with `use`   | `useCqrs`                                                    |
| Event types        | PascalCase             | `CommandCompletedEvent`                                      |
| Status union types | PascalCase type        | `PipelineStatus`                                             |
| Input types        | PascalCase             | `SubmitCommandInput`                                         |
| Result types       | PascalCase             | `UseSubmitCommandResult`, `UseCommandPipelineResult`         |
| Test files         | co-located .test.ts(x) | `useCommandPipeline.test.ts`, `CqrsProvider.test.tsx`        |

### Implementation Sketches

**useSubmitCommand:**

```typescript
import { useState, useCallback } from "react";
import { useTenant } from "@hexalith/shell-api";
import { useCqrs } from "../CqrsProvider";
import type { SubmitCommandResponse } from "../core/types";
import { HexalithError, ForbiddenError } from "../errors";
import type { SubmitCommandInput } from "./types";

export function useSubmitCommand() {
  const { fetchClient } = useCqrs();
  const { activeTenant } = useTenant();
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [error, setError] = useState<HexalithError | null>(null);

  const submit = useCallback(
    async (command: SubmitCommandInput) => {
      if (!activeTenant) {
        throw new ForbiddenError(
          "No active tenant selected — cannot submit command without tenant context",
        );
      }
      setError(null);
      setCorrelationId(null);

      try {
        const response = await fetchClient.post<SubmitCommandResponse>(
          "/api/v1/commands",
          { body: { ...command, tenant: activeTenant } }, // activeTenant is string, not .id
        );
        setCorrelationId(response.correlationId);
        return response;
      } catch (err) {
        // Set error state for re-render, then re-throw for caller flow control
        if (err instanceof HexalithError) {
          setError(err);
        }
        throw err;
      }
    },
    [fetchClient, activeTenant],
  );

  return { submit, correlationId, error };
}
```

**useCommandStatus (polling logic):**

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { useCqrs } from "../CqrsProvider";
import type { CommandStatusResponse } from "../core/types";
import type { PipelineStatus } from "./types";
import { CommandRejectedError, CommandTimeoutError } from "../errors";

const TERMINAL_STATUSES = [
  "Completed",
  "Rejected",
  "PublishFailed",
  "TimedOut",
] as const;
const POLL_INTERVAL_MS = 1000;

export function useCommandStatus(correlationId: string | null) {
  const { fetchClient } = useCqrs();
  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [response, setResponse] = useState<CommandStatusResponse | null>(null);
  const [error, setError] = useState<HexalithError | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup function
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!correlationId) {
      setStatus("idle");
      return;
    }

    setStatus("polling");
    setError(null);

    const poll = async () => {
      const resp = await fetchClient.get<CommandStatusResponse>(
        `/api/v1/commands/status/${correlationId}`,
      );
      setResponse(resp);

      if (TERMINAL_STATUSES.includes(resp.status as any)) {
        stopPolling();
        // Map terminal status → pipeline status + error
        switch (resp.status) {
          case "Completed":
            setStatus("completed");
            break;
          case "Rejected":
            setStatus("rejected");
            setError(
              new CommandRejectedError(
                resp.rejectionEventType ?? "",
                resp.correlationId,
              ),
            );
            break;
          case "PublishFailed":
            setStatus("failed");
            setError(
              new CommandTimeoutError(
                resp.failureReason ?? "Publish failed",
                resp.correlationId,
              ),
            );
            break;
          case "TimedOut":
            setStatus("timedOut");
            setError(
              new CommandTimeoutError(
                resp.timeoutDuration ?? "unknown",
                resp.correlationId,
              ),
            );
            break;
        }
      }
    };

    // Poll immediately, then every POLL_INTERVAL_MS
    // TODO: Story 2.5 adds retry with backoff for transient errors
    poll().catch((err) => {
      setError(err);
      stopPolling();
    });
    intervalRef.current = setInterval(() => {
      poll().catch((err) => {
        setError(err);
        stopPolling();
      });
    }, POLL_INTERVAL_MS);

    return stopPolling;
  }, [correlationId, fetchClient, stopPolling]);

  return { status, response, error };
}
```

**CqrsProvider:**

```tsx
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createFetchClient, type FetchClient } from "./core/fetchClient";
import {
  createCommandEventBus,
  type CommandEventBus,
} from "./commands/commandEventBus";

interface CqrsContextValue {
  fetchClient: FetchClient;
  commandEventBus: CommandEventBus;
}

const CqrsContext = createContext<CqrsContextValue | null>(null);

interface CqrsProviderProps {
  commandApiBaseUrl: string;
  tokenGetter: () => Promise<string | null>;
  children: ReactNode;
}

export function CqrsProvider({
  commandApiBaseUrl,
  tokenGetter,
  children,
}: CqrsProviderProps) {
  const fetchClient = useMemo(
    () => createFetchClient({ baseUrl: commandApiBaseUrl, tokenGetter }),
    [commandApiBaseUrl, tokenGetter],
  );
  const commandEventBus = useMemo(() => createCommandEventBus(), []);

  const value = useMemo(
    () => ({ fetchClient, commandEventBus }),
    [fetchClient, commandEventBus],
  );

  return <CqrsContext.Provider value={value}>{children}</CqrsContext.Provider>;
}

export function useCqrs(): CqrsContextValue {
  const ctx = useContext(CqrsContext);
  if (!ctx) throw new Error("useCqrs must be used within CqrsProvider");
  return ctx;
}
```

### Backend API Endpoints (Reference)

| Endpoint                       | Method | Used By This Story          | Request Body                                  | Response                         |
| ------------------------------ | ------ | --------------------------- | --------------------------------------------- | -------------------------------- |
| `/api/v1/commands`             | POST   | useSubmitCommand            | `SubmitCommandRequest` (tenant auto-injected) | 202 + `{ correlationId }` (GUID) |
| `/api/v1/commands/status/{id}` | GET    | useCommandStatus            | (none — correlationId in URL path)            | 200 + `CommandStatusResponse`    |
| `/api/v1/commands/replay/{id}` | POST   | useCommandPipeline (replay) | (none — correlationId in URL path)            | 202 + `{ correlationId }` or 409 |

### Shell Provider Order (After This Story)

```
AuthProvider → TenantProvider → CqrsProvider → ConnectionHealthProvider → FormDirtyProvider → ThemeProvider → LocaleProvider
```

`CqrsProvider` must be INSIDE `TenantProvider` (hooks use `useTenant()`) and INSIDE the scope where `react-oidc-context`'s auth is available (the shell wraps everything in `AuthProvider`). It must be OUTSIDE modules so all module hooks have access.

### Testing Strategy

- **Environment:** `jsdom` — hooks use React, tests need DOM simulation. Update `vitest.config.ts` to include `environment: 'jsdom'` if not already set for test files that need it.
- **Hook testing:** Use `@testing-library/react`'s `renderHook` and `act` utilities. Check if `@testing-library/react` is already a devDependency; add it if not.
- **Mocking FetchClient:** `vi.mock('../core/fetchClient')` — mock `createFetchClient` to return a mock `FetchClient` with `vi.fn()` for `post` and `get` methods.
- **Mocking useTenant:** `vi.mock('@hexalith/shell-api')` — mock `useTenant` to return `{ activeTenant: { id: 'test-tenant' } }`.
- **Polling tests:** Use `vi.useFakeTimers()` and `vi.advanceTimersByTime(1000)` to simulate polling intervals without real delays.
- **Wrapper pattern:** All hook tests wrap in `CqrsProvider` with mocked props:
  ```typescript
  const wrapper = ({ children }) => (
    <CqrsProvider commandApiBaseUrl="http://test" tokenGetter={() => Promise.resolve('token')}>
      {children}
    </CqrsProvider>
  );
  ```
- **No MSW** — These are unit tests of hook logic, NOT integration tests. Mock `fetchClient` methods directly.

### Previous Story Intelligence (Story 2.2)

- **`createFetchClient` is NOT exported** from `src/index.ts` — import directly from `../core/fetchClient` inside hooks.
- **FetchClient interface:** `{ post<T>(path, options?): Promise<T>; get<T>(path, options?): Promise<T> }`.
- **FetchRequestOptions:** `{ body?, headers?, signal?, correlationId? }`.
- **Token injection is automatic** — `tokenGetter` is called on every request. No manual token handling in hooks.
- **Error handling** — Non-OK responses throw typed `HexalithError` subclasses via `parseProblemDetails`. Hooks do NOT need to parse errors — the fetch client does it.
- **Correlation ID** — Auto-generated per request (ULID). Hooks can pass `correlationId` in options to propagate a specific ID (for distributed tracing continuity).
- **Story 2.2 completion notes:** All errors (including 429) now delegate to `parseProblemDetails`. 101 tests passing. The `RateLimitError` import was removed from fetchClient.ts since it's handled by parseProblemDetails.

### UX Context (Three-Phase Feedback Pattern)

The hooks enable the UX three-phase feedback pattern described in the design specification:

| Phase         | Hook State    | Visual (Story 3+)                                              | Duration           |
| ------------- | ------------- | -------------------------------------------------------------- | ------------------ |
| 1. Optimistic | `'sending'`   | Instant UI update for client-predictable fields                | 0ms                |
| 2. Confirming | `'polling'`   | Subtle animated underline; "confirming..." micro-indicator     | 0-2s typical       |
| 3. Confirmed  | `'completed'` | Projection update arrives; final values resolve; success toast | Instant on arrival |

Module developers use `useCommandPipeline().status` to drive this UI pattern. The hooks provide the state; `@hexalith/ui` components (Story 3+) provide the visual treatment.

**Optimistic UI is the module developer's responsibility.** The hooks provide status signals (`'sending'`, `'polling'`, `'completed'`). The module decides what to render for each status — e.g., showing a predicted value during `'sending'` and replacing it with the server value on `'completed'`. The hooks do NOT modify any projection data or UI state directly.

[Source: ux-design-specification.md § Three-Phase Feedback Pattern, lines 534-544]

### Error Handling Pattern (Module Developer Reference)

```typescript
// Module code example (for context — NOT part of this story's implementation)
const { send, status, error } = useCommandPipeline();

if (error instanceof CommandRejectedError) {
  // Expected business error — show inline message via @hexalith/ui Alert
  return <Alert variant="warning">{error.message}</Alert>;
}
// Infrastructure errors (AuthError, ApiError) bubble to ModuleErrorBoundary automatically
```

[Source: architecture.md § Error Recovery Pattern, lines 1042-1055]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3, lines 758-801] — Acceptance criteria, BDD scenarios
- [Source: _bmad-output/planning-artifacts/architecture.md#Command Lifecycle, lines 415-430] — useCommand hook flow, polling, terminal statuses
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns, lines 328-413] — Endpoint specs, payload types, ProblemDetails
- [Source: _bmad-output/planning-artifacts/architecture.md#React Context Provider Pattern, lines 993-1017] — Context pattern, hook throw pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Boundary Hierarchy, lines 473-483] — Error propagation: hooks → module boundary → shell
- [Source: _bmad-output/planning-artifacts/architecture.md#Projection Caching Strategy, lines 236-245] — Command-complete invalidation layer
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Three-Phase Feedback, lines 534-544] — Optimistic → confirming → confirmed UX pattern
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-15.md] — useCommand split to 3 hooks, ky→fetch, TanStack Query→ETag
- [Source: _bmad-output/implementation-artifacts/2-2-authenticated-fetch-client-with-correlation-id.md] — Previous story: fetchClient API, error delegation, tenant NOT in fetchClient
- [Source: packages/cqrs-client/src/core/fetchClient.ts] — FetchClient interface, createFetchClient factory
- [Source: packages/cqrs-client/src/core/types.ts] — SubmitCommandRequest, CommandStatusResponse, CommandStatus
- [Source: packages/cqrs-client/src/errors.ts] — HexalithError hierarchy, CommandRejectedError, CommandTimeoutError
- [Source: packages/shell-api/src/tenant/TenantProvider.tsx] — useTenant() hook, TenantContextValue, activeTenant
- [Source: apps/shell/src/providers/ShellProviders.tsx] — Provider composition order, backendUrl prop

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- `activeTenant` is `string | null` (not `{ id: string }` as story spec assumed) — adapted all hooks to use `activeTenant` directly instead of `activeTenant.id`
- `react-oidc-context` needed `InnerProviders` bridge component in ShellProviders since `useAuth()` (OIDC) can only be called inside `AuthProvider`
- Added `@types/react` and `@types/react-dom` as devDependencies for DTS build
- Added `react-oidc-context` and `@hexalith/cqrs-client` as dependencies of `@hexalith/shell`
- Extracted `mapTerminalStatus` as a pure function for independent testability (per story recommendation)
- Used deferred promises in pipeline tests to control async timing with fake timers
- `setError` + re-throw pattern: tests must catch the error within `act()` to allow state updates to commit before asserting `result.current.error`

### Completion Notes List

- All 9 acceptance criteria satisfied
- 142 tests pass (101 existing + 41 new), 0 regressions
- Build succeeds (ESM + .d.ts for cqrs-client, full monorepo including shell)
- Lint passes clean
- Shell tests (79) pass with CqrsProvider wired in
- CqrsProvider sits between TenantProvider and ConnectionHealthProvider as specified
- tokenGetter is reference-stable via useCallback
- createCommandEventBus is internal-only (not exported from index.ts)

### Change Log

- 2026-03-16: Story 2.3 implemented — command hooks, CqrsProvider, event bus, shell integration
- 2026-03-16: Code review fixes applied — pipeline re-throws infrastructure failures, replay availability now requires a correlation ID, AC #7 guard message aligned, file list synced with lockfile changes

### File List

New files:

- packages/cqrs-client/src/commands/types.ts
- packages/cqrs-client/src/commands/commandEventBus.ts
- packages/cqrs-client/src/commands/commandEventBus.test.ts
- packages/cqrs-client/src/commands/useSubmitCommand.ts
- packages/cqrs-client/src/commands/useSubmitCommand.test.ts
- packages/cqrs-client/src/commands/useCommandStatus.ts
- packages/cqrs-client/src/commands/useCommandStatus.test.ts
- packages/cqrs-client/src/commands/useCommandPipeline.ts
- packages/cqrs-client/src/commands/useCommandPipeline.test.ts
- packages/cqrs-client/src/CqrsProvider.tsx
- packages/cqrs-client/src/CqrsProvider.test.tsx

Modified files:

- packages/cqrs-client/src/index.ts
- packages/cqrs-client/package.json
- packages/cqrs-client/vitest.config.ts
- packages/cqrs-client/src/CqrsProvider.tsx
- packages/cqrs-client/src/commands/useCommandPipeline.ts
- packages/cqrs-client/src/commands/useCommandPipeline.test.ts
- apps/shell/src/providers/ShellProviders.tsx
- apps/shell/package.json
- pnpm-lock.yaml

## Senior Developer Review (AI)

- Outcome: Approved after review fixes
- Fixed review findings:
  - `useCommandPipeline` now re-throws infrastructure failures after storing local error state.
  - `replay` is only exposed when a correlation ID exists, preventing replay after initial submit failures.
  - The pipeline hook now throws the exact AC #7 guard message: `"useCommandPipeline must be used within CqrsProvider"`.
  - Story documentation now includes `pnpm-lock.yaml` in the file list to match git reality.
