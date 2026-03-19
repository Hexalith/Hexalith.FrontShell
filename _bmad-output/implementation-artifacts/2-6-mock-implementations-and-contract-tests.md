# Story 2.6: Mock Implementations & Contract Tests

Status: done

## Story

As a module developer,
I want faithful mock implementations of the command and query buses for testing,
so that my tests accurately simulate real backend behavior without requiring a running backend.

## Acceptance Criteria

1. **Given** `MockCommandBus` implements `ICommandBus`
   **When** a test calls `mockBus.send(command)`
   **Then** the mock simulates async delay (configurable, not instant)
   **And** the mock can be configured to simulate success (returns `{ correlationId }`), rejection (`CommandRejectedError`), timeout (`CommandTimeoutError`), and publish failure scenarios
   **And** the mock returns RFC 9457 ProblemDetails error responses matching real backend format
   **Note:** Command lifecycle status transitions (Received -> Processing -> Completed) are handled by `useCommandStatus` polling via `FetchClient`, not by `ICommandBus.send()`. The mock bus covers the send/error contract; lifecycle is tested at the hook level (Story 2.3).

2. **Given** `MockQueryBus` implements `IQueryBus`
   **When** a test calls `mockBus.query(request, schema)`
   **Then** the mock returns configurable response data after simulated async delay
   **And** the mock validates responses against the provided Zod schema (same as real implementation)
   **And** the mock can be configured to return different data per query key and to throw specific errors
   **Note:** ETag caching (304 responses, `If-None-Match` headers) is handled by the `FetchClient.postForQuery()` layer, not by `IQueryBus.query()` which returns `Promise<T>` directly. ETag behavior is out of scope for MockQueryBus.

3. **Given** `MockSignalRHub` is provided for future Story 2.7 integration
   **When** a test needs to simulate real-time projection changes
   **Then** the mock supports `JoinGroup`, `LeaveGroup`, and emitting `ProjectionChanged` signals
   **And** the mock simulates connection lifecycle (connected, disconnected, reconnecting)

4. **Given** a module developer uses `useCommandPipeline` or `useQuery` in tests
   **When** they configure the test with mock implementations
   **Then** the hooks behave identically to production for bus-level interactions (same error types, same Zod validation, same async behavior)

5. **Given** contract test suites exist
   **When** `commandBus.contract.test.ts` runs
   **Then** the same parameterized test suite validates: correlationId format, async delay, rejection error type, timeout error type, ProblemDetails error shape, `X-Correlation-ID` header propagation
   **And** contract test expectations are derived from the documented backend API specifications, not from frontend code assumptions

6. **Given** `queryBus.contract.test.ts` runs
   **When** executed against both mock and real implementations
   **Then** both produce identical behavior for: valid query response, Zod validation failure, error propagation, and `entityId`-scoped queries

7. **Given** the mock implementation diverges from the real implementation
   **When** the contract tests run in CI
   **Then** the divergence is caught and the build fails with a clear message identifying the behavioral difference

## Tasks / Subtasks

- [x] Task 1: Create `MockCommandBus` (AC: #1, #4, #5)
  - [x] Create `src/mocks/MockCommandBus.ts` implementing `ICommandBus`:

    ```typescript
    interface MockCommandBusConfig {
      /** Simulated async delay in ms. Default: 50. Must be > 0 (contract test verifies). */
      delay?: number;
      /** Default behavior: 'success'. Override per-call via configureNextSend(). */
      defaultBehavior?: 'success' | 'reject' | 'timeout' | 'publishFail';
    }

    interface MockCommandBusCall {
      command: SubmitCommandRequest;
      correlationId: string;
      timestamp: number;
    }

    class MockCommandBus implements ICommandBus {
      constructor(config?: MockCommandBusConfig);
      send(command: SubmitCommandRequest): Promise<SubmitCommandResponse>;

      // Test configuration API
      configureNextSend(behavior: MockSendBehavior): void;
      getCalls(): ReadonlyArray<MockCommandBusCall>;
      getLastCall(): MockCommandBusCall | undefined;
      reset(): void;
    }

    type MockSendBehavior =
      | { type: 'success' }
      | { type: 'reject'; rejectionEventType: string }
      | { type: 'timeout'; duration?: string }
      | { type: 'publishFail'; failureReason?: string }
      | { type: 'error'; error: Error };
    ```

  - [x] `send()` implementation:
    1. Generate correlationId via `generateCorrelationId()` (reuse existing utility from `src/core/correlationId.ts`)
    2. Simulate async delay via `await new Promise(resolve => setTimeout(resolve, delay))`
    3. Record the call in `calls` array for test assertions
    4. Check `configureNextSend` queue; if empty, use `defaultBehavior`
    5. On `'success'`: return `{ correlationId }`
    6. On `'reject'`: throw `new CommandRejectedError(rejectionEventType, correlationId)`
    7. On `'timeout'`: throw `new CommandTimeoutError(duration ?? 'PT30S', correlationId)`
    8. On `'publishFail'`: throw `new ApiError(500, { type: 'about:blank', title: 'Publish Failed', status: 500, detail: failureReason ?? 'Event publication failed', instance: '/api/v1/commands' })` — RFC 9457 ProblemDetails shape
    9. On `'error'`: throw the provided error directly
  - [x] `configureNextSend()` uses a FIFO queue — each call to `configureNextSend` enqueues one behavior for the next `send()` call. After the configured behavior is consumed, subsequent sends fall back to `defaultBehavior`.
  - [x] `getCalls()` returns full history for assertions: `expect(mockBus.getCalls()).toHaveLength(2)`
  - [x] `reset()` clears calls history AND behavior queue

- [x] Task 2: Create `MockQueryBus` (AC: #2, #4, #6)
  - [x] Create `src/mocks/MockQueryBus.ts` implementing `IQueryBus`:

    ```typescript
    interface MockQueryBusConfig {
      /** Simulated async delay in ms. Default: 30. Must be > 0 (contract test verifies). */
      delay?: number;
    }

    interface MockQueryBusCall {
      request: SubmitQueryRequest;
      timestamp: number;
    }

    class MockQueryBus implements IQueryBus {
      constructor(config?: MockQueryBusConfig);
      query<T>(request: SubmitQueryRequest, schema: z.ZodType<T>): Promise<T>;

      // Test configuration API
      setResponse(key: string, data: unknown): void;
      setError(key: string, error: Error): void;
      clearResponses(): void;
      getCalls(): ReadonlyArray<MockQueryBusCall>;
      getLastCall(): MockQueryBusCall | undefined;
      reset(): void;
    }
    ```

  - [x] Response key format: `{domain}:{queryType}:{aggregateId}:{entityId?}` — same pattern as ETag cache keys from Story 2.4. Use `buildCacheKey()` from `src/queries/etagCache.ts` if available, or replicate the logic: join with `:`, omit trailing empty segments. For list queries where `aggregateId` is required by the type but semantically empty, use the actual value passed (the caller decides what to pass).
  - [x] `query()` implementation:
    1. Simulate async delay
    2. Record call in `calls` array
    3. Build response key from request fields
    4. If error is configured for this key, throw it
    5. If no response is configured for this key, throw `new ApiError(404, { type: 'about:blank', title: 'Not Found', status: 404, detail: 'No projection data found', instance: '/api/v1/queries' })`
    6. Validate configured response data against the provided Zod schema — throw `new ValidationError(zodResult.error.issues)` if invalid (same behavior as real implementation)
    7. Return validated data
  - [x] **ETag is out of scope** — `IQueryBus.query()` returns `Promise<T>` directly. ETag caching (304 responses, `If-None-Match` headers) is handled by `FetchClient.postForQuery()`, not by the query bus interface. Remove `etag` parameter from `setResponse()` — it's unused.
  - [x] **IMPORTANT**: The `IQueryBus.query()` method returns `Promise<T>` directly — Zod validation happens inside, and validated data is returned. The mock MUST validate against the schema, not just return raw data. This ensures tests catch schema drift.

- [x] Task 3: Create `MockSignalRHub` (AC: #3)
  - [x] Create `src/mocks/MockSignalRHub.ts`:

    ```typescript
    interface ISignalRHub {
      joinGroup(projectionType: string, tenantId: string): void;
      leaveGroup(projectionType: string, tenantId: string): void;
      onProjectionChanged(
        listener: (projectionType: string, tenantId: string) => void,
      ): () => void;
      readonly connectionState: 'connected' | 'disconnected' | 'reconnecting';
      onConnectionStateChange(
        listener: (state: 'connected' | 'disconnected' | 'reconnecting') => void,
      ): () => void;
    }

    class MockSignalRHub implements ISignalRHub {
      // Test control API
      emitProjectionChanged(projectionType: string, tenantId: string): void;
      simulateDisconnect(): void;
      simulateReconnect(): void;
      getJoinedGroups(): ReadonlyArray<{ projectionType: string; tenantId: string }>;
      reset(): void;
    }
    ```

  - [x] `joinGroup()` / `leaveGroup()`: track active group subscriptions in a Set
  - [x] `emitProjectionChanged()`: notify all registered listeners
  - [x] `simulateDisconnect()` / `simulateReconnect()`: transition `connectionState` and notify state listeners
  - [x] Initial state: `'connected'` (optimistic, consistent with `ConnectionStateProvider` from Story 2.5)
  - [x] **NOTE**: `ISignalRHub` is a forward-looking interface. Story 2.7 will create the real `useSignalR` hook that connects to `@microsoft/signalr`. The interface defined here will be validated/adjusted in Story 2.7. Do NOT add `@microsoft/signalr` as a dependency.

- [x] Task 4: Create contract test suites (AC: #5, #6, #7)
  - [x] Create `src/mocks/__contracts__/commandBus.contract.test.ts`:

    ```typescript
    import { describe, it, expect } from 'vitest';
    import type { ICommandBus } from '../../core/ICommandBus';
    import type { SubmitCommandRequest } from '../../core/types';
    import { CommandRejectedError, CommandTimeoutError, ApiError } from '../../errors';

    /** Valid test command fixture */
    export const TEST_COMMAND: SubmitCommandRequest = {
      tenant: 'test-tenant',
      domain: 'TestDomain',
      aggregateId: 'agg-001',
      commandType: 'TestCommand',
      payload: { value: 'test' },
    };

    /**
     * Parameterized contract test suite for ICommandBus implementations.
     * Run against MockCommandBus now; run against DaprCommandBus when it exists.
     * Expectations derived from Architecture § API & Communication Patterns.
     */
    export function commandBusContractTests(
      name: string,
      createBus: () => ICommandBus,
      configureBehavior?: {
        configureReject: (bus: ICommandBus) => void;
        configureTimeout: (bus: ICommandBus) => void;
      },
    ) {
      describe(`ICommandBus contract: ${name}`, () => {
        it('returns correlationId as ULID string on successful send', async () => {
          const bus = createBus();
          const result = await bus.send(TEST_COMMAND);
          expect(result.correlationId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i);
        });

        it('simulates async delay (not instant)', async () => {
          const bus = createBus();
          const start = performance.now();
          await bus.send(TEST_COMMAND);
          expect(performance.now() - start).toBeGreaterThan(0);
        });

        it('surfaces rejection as CommandRejectedError', async () => {
          const bus = createBus();
          configureBehavior?.configureReject(bus);
          await expect(bus.send(TEST_COMMAND))
            .rejects.toBeInstanceOf(CommandRejectedError);
        });

        it('surfaces timeout as CommandTimeoutError', async () => {
          const bus = createBus();
          configureBehavior?.configureTimeout(bus);
          await expect(bus.send(TEST_COMMAND))
            .rejects.toBeInstanceOf(CommandTimeoutError);
        });

        it('rejected error includes correlationId', async () => {
          const bus = createBus();
          configureBehavior?.configureReject(bus);
          try {
            await bus.send(TEST_COMMAND);
          } catch (e) {
            expect(e).toBeInstanceOf(CommandRejectedError);
            expect((e as CommandRejectedError).correlationId).toBeTruthy();
          }
        });
      });
    }
    ```

  - [x] Create `src/mocks/__contracts__/queryBus.contract.test.ts`:

    ```typescript
    export function queryBusContractTests(
      name: string,
      createBus: () => IQueryBus,
      configureResponse?: {
        setValidResponse: (bus: IQueryBus) => void;
        setInvalidSchemaResponse: (bus: IQueryBus) => void;
      },
    ) {
      describe(`IQueryBus contract: ${name}`, () => {
        it('returns validated data for valid response', ...);
        it('simulates async delay (not instant)', ...);
        it('throws ValidationError for schema mismatch', ...);
        it('supports entityId-scoped queries', ...);
      });
    }
    ```

  - [x] Expectations MUST be derived from:
    - Architecture § API & Communication Patterns (POST /api/v1/commands returns 202 + correlationId)
    - Architecture § Command Lifecycle (Received -> Processing -> Completed)
    - RFC 9457 ProblemDetails shape from `src/core/types.ts`
    - CorrelationId format: ULID (26 chars, Crockford Base32) — from `src/core/correlationId.ts`
  - [x] The `configureBehavior` parameter allows the same test suite to work against both mock (where behavior is set via `configureNextSend()`) and real implementations (where behavior depends on backend state).

- [x] Task 5: Run contract tests against MockCommandBus and MockQueryBus
  - [x] Create `src/mocks/MockCommandBus.test.ts`:
    ```typescript
    import { commandBusContractTests } from './__contracts__/commandBus.contract.test';
    import { MockCommandBus } from './MockCommandBus';

    // Contract tests
    commandBusContractTests('MockCommandBus', () => new MockCommandBus(), {
      configureReject: (bus) =>
        (bus as MockCommandBus).configureNextSend({ type: 'reject', rejectionEventType: 'OrderNotFound' }),
      configureTimeout: (bus) =>
        (bus as MockCommandBus).configureNextSend({ type: 'timeout' }),
    });

    // Mock-specific tests (behavior queue, getCalls, reset, etc.)
    describe('MockCommandBus specifics', () => {
      it('records all send() calls', ...);
      it('consumes behavior queue FIFO', ...);
      it('falls back to defaultBehavior after queue is empty', ...);
      it('reset() clears calls and behavior queue', ...);
      it('returns ProblemDetails shape for publishFail', ...);
    });
    ```

  - [x] Create `src/mocks/MockQueryBus.test.ts`:
    ```typescript
    import { queryBusContractTests } from './__contracts__/queryBus.contract.test';
    import { MockQueryBus } from './MockQueryBus';

    // Contract tests
    queryBusContractTests('MockQueryBus', () => {
      const bus = new MockQueryBus();
      bus.setResponse('TestDomain:GetList:agg-001', [{ id: '1', name: 'Test' }]);
      return bus;
    }, {
      setValidResponse: (bus) =>
        (bus as MockQueryBus).setResponse('TestDomain:GetList:agg-001', [{ id: '1', name: 'Test' }]),
      setInvalidSchemaResponse: (bus) =>
        (bus as MockQueryBus).setResponse('TestDomain:GetList:agg-001', { invalid: true }),
    });

    // Mock-specific tests
    describe('MockQueryBus specifics', () => {
      it('throws ApiError(404) for unconfigured response key', ...);
      it('validates response against Zod schema', ...);
      it('throws ValidationError on schema mismatch', ...);
      it('records all query() calls', ...);
      it('reset() clears responses and calls', ...);
    });
    ```

  - [x] Create `src/mocks/MockSignalRHub.test.ts`:
    - Test group join/leave tracking
    - Test projection changed event emission
    - Test connection state simulation (disconnect/reconnect)
    - Test listener cleanup on unsubscribe

- [x] Task 6: Export public API and testing entry point (AC: all)
  - [x] Add mock exports to `packages/cqrs-client/src/index.ts`:

    ```typescript
    // Mock implementations (platform capabilities — FR14, FR15)
    export { MockCommandBus } from './mocks/MockCommandBus';
    export type { MockCommandBusConfig, MockSendBehavior } from './mocks/MockCommandBus';
    export { MockQueryBus } from './mocks/MockQueryBus';
    export type { MockQueryBusConfig } from './mocks/MockQueryBus';
    export { MockSignalRHub } from './mocks/MockSignalRHub';
    export type { ISignalRHub } from './mocks/MockSignalRHub';
    ```

  - [x] Create `packages/cqrs-client/src/testing.ts` — separate entry point for contract test helpers:

    ```typescript
    // Contract test helpers — import from '@hexalith/cqrs-client/testing'
    // These import vitest and must NOT be in the main bundle.
    export { commandBusContractTests, TEST_COMMAND } from './mocks/__contracts__/commandBus.contract.test';
    export { queryBusContractTests, TEST_QUERY } from './mocks/__contracts__/queryBus.contract.test';
    ```

  - [x] Update `tsup.config.ts` to add the second entry point:

    ```typescript
    export default defineConfig({
      entry: ['src/index.ts', 'src/testing.ts'],
      // ... existing config
    });
    ```

  - [x] Update `package.json` exports map:

    ```json
    "exports": {
      ".": {
        "import": "./dist/index.js",
        "types": "./dist/index.d.ts"
      },
      "./testing": {
        "import": "./dist/testing.js",
        "types": "./dist/testing.d.ts"
      }
    }
    ```

  - [x] **CRITICAL**: MockCommandBus, MockQueryBus, and MockSignalRHub are PUBLIC API exports in the main entry point — they are platform capabilities (FR14, FR15), not test internals. Module developers import them directly from `@hexalith/cqrs-client`.
  - [x] Contract test functions are in the `testing` entry point because they import `vitest` (`describe`, `it`, `expect`) — bundling these in the main entry would create a production dependency on a test framework. Future `DaprCommandBus`/`DaprQueryBus` tests import from `@hexalith/cqrs-client/testing`.
  - [x] Verify `pnpm build` succeeds — tsup must produce both `dist/index.js` and `dist/testing.js`.

- [x] Task 7: Verify package integrity
  - [x] `pnpm --filter @hexalith/cqrs-client build` succeeds — produces both `dist/index.js` and `dist/testing.js` with `.d.ts` files
  - [x] `pnpm --filter @hexalith/cqrs-client test` passes all tests (including contract tests)
  - [x] `pnpm --filter @hexalith/cqrs-client lint` passes
  - [x] `pnpm build` (full monorepo) succeeds
  - [x] Verify `import { MockCommandBus, MockQueryBus, MockSignalRHub } from '@hexalith/cqrs-client'` works
  - [x] Verify `import { commandBusContractTests } from '@hexalith/cqrs-client/testing'` works
  - [x] Verify the main `dist/index.js` does NOT contain `vitest` imports

## Dev Notes

### Architecture Compliance

- **Ports-and-adapters pattern** — MockCommandBus/MockQueryBus implement the SAME `ICommandBus`/`IQueryBus` interfaces that `DaprCommandBus`/`DaprQueryBus` will implement (future stories). The contract tests ensure behavioral parity. This is the core of the ports-and-adapters abstraction: modules code to the interface, not the implementation. [Source: architecture.md § CQRS transport abstraction, line 88]
- **Mock fidelity is a first-class concern** — "Mock implementations must faithfully reproduce async timing, error modes, and lifecycle events of real implementations. Contract tests validate mock/real parity. Without this, test suites create false confidence." [Source: architecture.md § Mock fidelity, line 96]
- **Mocks are public API, not test internals** — "MockCommandBus and MockQueryBus are exported from @hexalith/cqrs-client — they are platform capabilities (FR14, FR15), not test internals." [Source: architecture.md § Test fixtures, line 1531]
- **No TanStack Query** — Removed per sprint change proposal 2026-03-15. The mock query bus validates against Zod schemas directly, not through any query client layer.
- **Object destructuring return shapes** — All hook returns are object destructuring (`{ data, error }`), never tuples.
- **Naming conventions** — `I` prefix for interfaces (`ICommandBus`, `IQueryBus`, `ISignalRHub`), `Mock` prefix for mock implementations (`MockCommandBus`), PascalCase + `Schema` suffix for Zod schemas. [Source: architecture.md § Code Naming, lines 687-688]
- **Co-located tests** — `.test.ts` suffix, co-located in the same directory. No `__tests__/` directories. [Source: architecture.md § File Naming, lines 665-666]
- **Contract tests in `__contracts__/`** — `.contract.test.ts` suffix inside `__contracts__/` folder. [Source: architecture.md § File Naming, line 667]

### Critical Constraints

- **DO NOT add `@microsoft/signalr`** — Story 2.7. MockSignalRHub is a pure TypeScript mock with a forward-looking `ISignalRHub` interface.
- **DO NOT add `@tanstack/react-query`** — Removed per sprint change.
- **DO NOT add `ky` or `axios`** — Native `fetch` via `createFetchClient` (Story 2.2).
- **DO NOT use `__mocks__/` directory convention** — That's for vitest/jest auto-mocking. Our mocks are explicit public API exports, not auto-mock overrides. Use `src/mocks/` instead.
- **DO NOT modify existing interfaces** — `ICommandBus`, `IQueryBus`, error classes, and existing hooks are NOT modified in this story. We only ADD new files.
- **Delay MUST be > 0** — Contract tests verify `performance.now() - start > 0`. Instant mocks create false confidence about async behavior. Default delays: MockCommandBus 50ms, MockQueryBus 30ms.
- **Zod validation is mandatory in MockQueryBus** — The mock MUST validate response data against the provided schema, throwing `ValidationError` on mismatch. This catches schema drift in tests.
- **CorrelationId format: ULID** — 26-character Crockford Base32. Generated via `generateCorrelationId()` from `src/core/correlationId.ts`. NOT UUID/GUID format (the architecture example shows GUID regex but the actual implementation uses ULID via `ulidx`).
- **RFC 9457 ProblemDetails** — Error responses from mocks must match the `ProblemDetails` shape from `src/core/types.ts`: `{ type, title, status, detail, instance, correlationId?, tenantId? }`.
- **DEPENDS ON Stories 2.1-2.5** — Imports from:
  - `./core/ICommandBus` — `ICommandBus` interface
  - `./core/IQueryBus` — `IQueryBus` interface
  - `./core/types` — `SubmitCommandRequest`, `SubmitCommandResponse`, `SubmitQueryRequest`, `ProblemDetails`
  - `./core/correlationId` — `generateCorrelationId()`
  - `./errors` — `CommandRejectedError`, `CommandTimeoutError`, `ApiError`, `ValidationError`
  - `zod` — schema validation (`z.ZodType<T>`)

### File Structure Decision

The epics reference `src/commands/__mocks__/` and `src/queries/__mocks__/` but the architecture references `src/bus/`. Neither matches the actual code structure:
- `__mocks__/` is a vitest/jest convention for auto-mocking, which is NOT appropriate since these are public API exports
- `src/bus/` directory was never created (interfaces live in `src/core/`)

**Decision: Use `src/mocks/`** — A dedicated directory that:
1. Clearly communicates these are mock implementations
2. Avoids confusion with vitest auto-mock conventions
3. Groups all mocks together (command, query, signalr) since they're cross-cutting
4. Keeps `__contracts__/` as a subdirectory for contract tests

```
packages/cqrs-client/
├── src/
│   ├── index.ts                        # MODIFIED — add mock exports (MockCommandBus, MockQueryBus, MockSignalRHub)
│   ├── testing.ts                      # NEW — contract test helpers entry point (imports vitest)
│   ├── core/
│   │   ├── ICommandBus.ts             # NOT modified (interface only)
│   │   ├── IQueryBus.ts               # NOT modified (interface only)
│   │   ├── types.ts                   # NOT modified (shared types)
│   │   ├── correlationId.ts           # NOT modified (reused by mocks)
│   │   └── ...
│   ├── commands/                       # NOT modified
│   ├── queries/                        # NOT modified
│   ├── connection/                     # NOT modified
│   ├── errors.ts                       # NOT modified
│   ├── CqrsProvider.tsx                # NOT modified
│   └── mocks/                          # THIS STORY — new directory
│       ├── MockCommandBus.ts           # ICommandBus mock implementation
│       ├── MockCommandBus.test.ts      # Unit + contract tests
│       ├── MockQueryBus.ts             # IQueryBus mock implementation
│       ├── MockQueryBus.test.ts        # Unit + contract tests
│       ├── MockSignalRHub.ts           # ISignalRHub mock (forward-looking for 2.7)
│       ├── MockSignalRHub.test.ts      # Unit tests
│       └── __contracts__/              # Parameterized contract test suites
│           ├── commandBus.contract.test.ts
│           └── queryBus.contract.test.ts
```

### Previous Story Intelligence (Story 2.5)

- **ConnectionStateProvider** tracks HTTP reachability with failure threshold (3 consecutive failures -> disconnected). MockCommandBus/MockQueryBus do NOT interact with ConnectionStateProvider directly — they implement bus interfaces, not hook-level behavior. The hooks (`useCommandPipeline`, `useQuery`) are what report to ConnectionStateProvider.
- **commandEventBus** pattern: `onCommandCompleted` / `emitCommandCompleted` — established in Story 2.3, wired to query invalidation in Story 2.5. Mocks don't need to interact with this directly, but module tests using mocks will test this flow end-to-end.
- **No TanStack Query removal** — Confirmed in Stories 2.4 and 2.5. Custom `useQuery` hook with manual ETag cache, retry logic, and domain invalidation.
- **Stale-but-valid pattern** — When a refetch fails, `error` is set but `data` is NOT cleared. This is a `useQuery` behavior, not a bus behavior — mocks don't need to implement this.
- **Zod is already a dependency** — `"zod": "^3.25.76"` in package.json. Do NOT re-add.
- **`@testing-library/react` is already a devDependency** — Do NOT re-add.
- **`vitest.config.ts` already has `environment: 'jsdom'`** — Set in Story 2.4.
- **Error hierarchy is complete** — All 7 error classes exist in `src/errors.ts`: `ApiError`, `ValidationError`, `CommandRejectedError`, `CommandTimeoutError`, `AuthError`, `ForbiddenError`, `RateLimitError`. Mocks reuse these classes directly.

### Git Intelligence

Recent commits show stories 2.1-2.5 building the cqrs-client package incrementally:
- Story 2.1: CQRS client package with types, interfaces, error hierarchy, correlationId
- Story 2.2: Authenticated fetch client with correlation ID propagation
- Story 2.3: Command hooks (useSubmitCommand, useCommandStatus, useCommandPipeline, commandEventBus)
- Story 2.4: Query hook (useQuery) with Zod validation, ETag cache, QueryProvider
- Story 2.5: Projection freshness (ConnectionStateProvider, retry backoff, command-complete invalidation)

All stories follow the pattern: implement → test → export from index.ts → build/lint/test pass.

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Interface | `I` prefix + PascalCase | `ICommandBus`, `IQueryBus`, `ISignalRHub` |
| Mock class | `Mock` prefix + PascalCase | `MockCommandBus`, `MockQueryBus`, `MockSignalRHub` |
| Config interface | PascalCase + `Config` | `MockCommandBusConfig`, `MockQueryBusConfig` |
| Behavior type | PascalCase | `MockSendBehavior` |
| Contract test fn | camelCase | `commandBusContractTests`, `queryBusContractTests` |
| Test fixtures | UPPER_SNAKE_CASE | `TEST_COMMAND`, `TEST_QUERY` |
| Test files | `.test.ts` suffix | `MockCommandBus.test.ts` |
| Contract test files | `.contract.test.ts` in `__contracts__/` | `commandBus.contract.test.ts` |

### References

- [Source: architecture.md § Contract Test Pattern, lines 870-914]
- [Source: architecture.md § Mock fidelity, line 96]
- [Source: architecture.md § CQRS transport abstraction, line 88]
- [Source: architecture.md § Ports-and-adapters pattern, lines 220-232]
- [Source: architecture.md § Test fixtures are public API, line 1531]
- [Source: architecture.md § File Naming, lines 660-670]
- [Source: architecture.md § Code Naming, lines 687-692]
- [Source: architecture.md § Package Internal Organization, lines 764-812]
- [Source: architecture.md § Architectural Boundaries, lines 1533-1576]
- [Source: architecture.md § RFC 9457 ProblemDetails, lines 485-511]
- [Source: architecture.md § Command Lifecycle, lines 415-430]
- [Source: epics.md § Story 2.6, lines 883-930]
- [Source: epics.md § Epic 2 overview, lines 312-318]
- [Source: prd.md § FR14: Mock implementations for testing]
- [Source: prd.md § FR15: Simulate projection update events in tests]
- [Source: prd.md § FR56: Consumer-driven contract tests at CQRS boundary]
- [Source: story 2-5 § Dev Notes — ConnectionStateProvider, commandEventBus, no TanStack Query]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Initial build failed on DTS due to TypeScript union narrowing on `MockSendBehavior` fallback from default behavior. Fixed by splitting behavior resolution into `behaviorType` switch with explicit property access per branch.
- Lint required import ordering: value imports before type imports, with blank line separating external from internal groups.

### Completion Notes List

- Task 1: Created `MockCommandBus` implementing `ICommandBus` with configurable delay (default 50ms), FIFO behavior queue, success/reject/timeout/publishFail/error modes, and call recording API.
- Task 2: Created `MockQueryBus` implementing `IQueryBus` with configurable delay (default 30ms), per-key response/error configuration, Zod schema validation, and call recording API.
- Task 3: Created `MockSignalRHub` implementing `ISignalRHub` with group join/leave tracking, projection changed event emission, connection state simulation (connect/disconnect/reconnect), and listener cleanup.
- Task 4: Created parameterized contract test suites (`commandBusContractTests`, `queryBusContractTests`) in `__contracts__/` directory, exportable for future real implementation testing.
- Task 5: Created comprehensive test suites for all three mocks — 42 new tests total (16 MockCommandBus, 14 MockQueryBus, 12 MockSignalRHub) including contract test execution.
- Task 6: Exported mocks from main `index.ts` (public API), created `testing.ts` entry point for contract test helpers, updated `tsup.config.ts` and `package.json` exports map.
- Task 7: All verification checks passed — build produces both `dist/index.js` and `dist/testing.js` with `.d.ts` files, all 251 tests pass, lint clean, full monorepo build succeeds, `dist/index.js` contains no vitest imports.
- Follow-up: MockCommandBus and MockQueryBus now clamp misconfigured non-positive delays to a minimum positive value, matching the contract that mocks must simulate real async work.

### Change Log

- 2026-03-19: Implemented Story 2.6 — MockCommandBus, MockQueryBus, MockSignalRHub, contract test suites, dual entry point (index + testing), all tests passing.

### File List

**New files:**
- `packages/cqrs-client/src/mocks/MockCommandBus.ts` — ICommandBus mock implementation
- `packages/cqrs-client/src/mocks/MockCommandBus.test.ts` — Unit + contract tests (16 tests)
- `packages/cqrs-client/src/mocks/MockQueryBus.ts` — IQueryBus mock implementation
- `packages/cqrs-client/src/mocks/MockQueryBus.test.ts` — Unit + contract tests (14 tests)
- `packages/cqrs-client/src/mocks/MockSignalRHub.ts` — ISignalRHub mock implementation
- `packages/cqrs-client/src/mocks/MockSignalRHub.test.ts` — Unit tests (12 tests)
- `packages/cqrs-client/src/mocks/__contracts__/commandBus.contract.test.ts` — Parameterized ICommandBus contract tests
- `packages/cqrs-client/src/mocks/__contracts__/queryBus.contract.test.ts` — Parameterized IQueryBus contract tests
- `packages/cqrs-client/src/testing.ts` — Contract test helpers entry point

**Modified files:**
- `packages/cqrs-client/src/index.ts` — Added mock exports (MockCommandBus, MockQueryBus, MockSignalRHub, ISignalRHub)
- `packages/cqrs-client/tsup.config.ts` — Added `src/testing.ts` entry point
- `packages/cqrs-client/package.json` — Added `./testing` exports map entry
- `_bmad-output/implementation-artifacts/2-6-mock-implementations-and-contract-tests.md` — Story status and completion notes updated post-review
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story 2.6 development_status synchronized with reviewed “done” state
