# Story 2.1: CQRS Client Package & Error Hierarchy

Status: done

## Story

As a shell team developer,
I want to create the @hexalith/cqrs-client package with typed interfaces and a structured error hierarchy,
so that all CQRS communication has a consistent contract and error handling foundation.

## Acceptance Criteria

1. **Given** the `@hexalith/cqrs-client` package is created in `packages/cqrs-client/`
   **When** a developer inspects the public API
   **Then** `ICommandBus` interface exists with `send(command: SubmitCommandRequest): Promise<SubmitCommandResponse>` method
   **And** `IQueryBus` interface exists with `query<T>(request: SubmitQueryRequest, schema: z.ZodType<T>): Promise<T>` method
   **And** interface names use `I` prefix following .NET backend conventions

2. **Given** the error hierarchy is defined in `src/errors.ts`
   **When** a developer inspects the error types
   **Then** `HexalithError` abstract base class extends `Error` with abstract `code: string`
   **And** `ApiError` (statusCode, body), `ValidationError` (ZodIssue[]), `CommandRejectedError` (rejectionEventType, correlationId), `CommandTimeoutError` (duration, correlationId), `AuthError`, `ForbiddenError`, and `RateLimitError` subclasses exist
   **And** each error class has a unique `code` string identifier
   **And** `HexalithError` base class implements `toJSON()` returning `{ code, message, ...subclass fields }` for structured logging compatibility

3. **Given** the package types are defined in `src/core/types.ts`
   **When** a developer inspects them
   **Then** `SubmitCommandRequest`, `SubmitCommandResponse`, `CommandStatusResponse`, `SubmitQueryRequest`, `SubmitQueryResponse`, `ValidateCommandRequest`, `PreflightValidationResult`, and `ProblemDetails` types match the backend API payload shapes exactly (camelCase, matching field names)
   **And** `SubmitQueryRequest` includes optional `entityId: string` field for entity-scoped query routing
   **And** `CommandStatus` is a union type: `'Received' | 'Processing' | 'EventsStored' | 'EventsPublished' | 'Completed' | 'Rejected' | 'PublishFailed' | 'TimedOut'`
   **And** no TypeScript `enum` is used -- union types only

4. **Given** the error response parser is defined in `src/core/problemDetails.ts`
   **When** the HTTP client receives a 4xx or 5xx response
   **Then** the response body is parsed as RFC 9457 ProblemDetails
   **And** the parser maps HTTP status codes to the typed error hierarchy: 400->ApiError, 401->AuthError, 403->ForbiddenError, 429->RateLimitError, others->ApiError (note: `ValidationError` is reserved for Zod schema validation failures only, not backend 400s)
   **And** `correlationId` and `tenantId` from the ProblemDetails body are preserved in the error instance

5. **Given** the correlation ID utility is defined in `src/core/correlationId.ts`
   **When** the HTTP client sends a request without an existing correlation ID
   **Then** a ULID is generated via `ulidx` and set as the `X-Correlation-ID` header
   **And** ULIDs are lexicographically sortable and timestamp-embedded for debugging

6. **Given** the package is built with tsup
   **When** the build completes
   **Then** ESM output with `.d.ts` type declarations is produced
   **And** all co-located Vitest tests pass

## Tasks / Subtasks

- [x] Task 1: Create type definitions (AC: #3)
  - [x] Create `src/core/types.ts` with all backend API payload types
  - [x] `SubmitCommandRequest` with fields: tenant, domain, aggregateId, commandType, payload, extensions?
  - [x] `SubmitCommandResponse` with correlationId
  - [x] `CommandStatusResponse` with status, statusCode, timestamp, aggregateId?, eventCount?, rejectionEventType?, failureReason?, timeoutDuration?
  - [x] `SubmitQueryRequest` with tenant, domain, aggregateId, queryType, payload?, entityId?
  - [x] `SubmitQueryResponse` with correlationId, payload
  - [x] `ValidateCommandRequest` with tenant, domain, commandType, aggregateId?
  - [x] `PreflightValidationResult` with isAuthorized, reason?
  - [x] `ProblemDetails` with type, title, status, detail, instance, correlationId?, tenantId?
  - [x] `CommandStatus` union type (8 states)
  - [x] Write `src/core/types.test.ts` -- type assertion tests verifying field existence and types

- [x] Task 2: Create error hierarchy (AC: #2)
  - [x] Create `src/errors.ts` with abstract `HexalithError` base class including `toJSON()` method that serializes `code`, `message`, and subclass-specific fields (JS `Error` properties are not enumerable -- `JSON.stringify(new Error('x'))` returns `'{}'` without this)
  - [x] `ApiError` -- code: 'API_ERROR', constructor(statusCode: number, body?: unknown)
  - [x] `ValidationError` -- code: 'VALIDATION_ERROR', constructor(issues: ZodIssue[])
  - [x] `CommandRejectedError` -- code: 'COMMAND_REJECTED', constructor(rejectionEventType: string, correlationId: string)
  - [x] `CommandTimeoutError` -- code: 'COMMAND_TIMEOUT', constructor(duration: string, correlationId: string)
  - [x] `AuthError` -- code: 'AUTH_ERROR'
  - [x] `ForbiddenError` -- code: 'FORBIDDEN'
  - [x] `RateLimitError` -- code: 'RATE_LIMIT', constructor with retryAfter?: string
  - [x] Write `src/errors.test.ts` -- verify inheritance, code values, instanceof checks, `toJSON()` serialization (ensure `JSON.stringify(error)` includes code + message + subclass fields)

- [x] Task 3: Create RFC 9457 ProblemDetails parser (AC: #4)
  - [x] Create `src/core/problemDetails.ts` with `parseProblemDetails(response: Response): Promise<HexalithError>`
  - [x] Map HTTP status codes: 400->ApiError, 401->AuthError, 403->ForbiddenError, 429->RateLimitError, others->ApiError (ValidationError is Zod-only)
  - [x] Preserve correlationId and tenantId from ProblemDetails body in error instances
  - [x] Handle 429 Retry-After header extraction
  - [x] Handle non-JSON error responses gracefully: if `response.json()` throws (HTML from nginx 502, empty body, connection reset), fall back to `ApiError(response.status, await response.text().catch(() => null))`
  - [x] Write `src/core/problemDetails.test.ts` -- test all mappings, edge cases, malformed bodies

- [x] Task 4: Create correlation ID utility (AC: #5)
  - [x] Create `src/core/correlationId.ts` with `generateCorrelationId(): string`
  - [x] Use `ulidx` library for ULID generation
  - [x] Add `ulidx` to package.json dependencies
  - [x] Write `src/core/correlationId.test.ts` -- verify ULID format, lexicographic ordering, uniqueness

- [x] Task 5: Create bus interfaces (AC: #1)
  - [x] Create `src/core/ICommandBus.ts` with `send(command: SubmitCommandRequest): Promise<SubmitCommandResponse>`
  - [x] Create `src/core/IQueryBus.ts` with `query<T>(request: SubmitQueryRequest, schema: z.ZodType<T>): Promise<T>`
  - [x] Write type-level tests using vitest `expectTypeOf` in `src/core/ICommandBus.test.ts` and `src/core/IQueryBus.test.ts` (interfaces are compile-time only -- use `expectTypeOf<ICommandBus>().toHaveProperty('send')`, NOT runtime assertions)

- [x] Task 6: Update package barrel export and dependencies (AC: #6)
  - [x] Update `src/index.ts` with grouped exports (types, errors, interfaces, utilities)
  - [x] Add `zod` and `ulidx` to package.json dependencies
  - [x] Verify `pnpm build` produces ESM + .d.ts
  - [x] Verify `pnpm test` passes all tests
  - [x] Verify `pnpm lint` passes

## Dev Notes

### Architecture Compliance

- **REST client**: Native `fetch` API (NOT ky -- ky was removed per sprint change proposal 2026-03-15). The fetch client itself is NOT part of this story (that's Story 2.2). This story only defines the types and interfaces.
- **No TypeScript enums**: Use union types exclusively. `CommandStatus` is a union of 8 string literals matching backend exactly.
- **I-prefix for interfaces**: `ICommandBus`, `IQueryBus` -- follows .NET backend conventions per architecture document.
- **camelCase JSON**: All type fields match backend JSON payload shapes exactly -- no transformation layer.
- **Error hierarchy**: Abstract base `HexalithError extends Error` with abstract `code: string`. Each subclass has a unique code identifier.
- **RFC 9457 ProblemDetails**: The backend error response format. Parser maps HTTP status to typed error classes.
- **ULID correlation IDs**: `ulidx` library generates lexicographically sortable, timestamp-embedded IDs for `X-Correlation-ID` header.
- **Two correlation ID systems coexist**: (1) **Request correlation ID** -- ULID generated by FrontShell, sent as `X-Correlation-ID` header, used for distributed tracing. (2) **Response correlation ID** -- GUID generated by backend, returned in `SubmitCommandResponse.correlationId`, used for command lifecycle tracking. These are NOT the same ID. Do not conflate them.
- **Error serialization**: `HexalithError` base class MUST implement `toJSON()` because JavaScript `Error` properties are not enumerable -- `JSON.stringify(new Error('x'))` returns `'{}'`. Without `toJSON()`, structured logging and state serialization silently lose error data.

### Critical Constraints

- **DO NOT create the fetch client** (`createFetchClient`) -- that's Story 2.2. This story creates the types, interfaces, errors, and utilities that Story 2.2 will consume.
- **DO NOT create React hooks** (`useCommandPipeline`, `useQuery`, etc.) -- those are Stories 2.3-2.4. This story establishes the contract layer.
- **DO NOT add `@tanstack/react-query`** -- this dependency was removed per sprint change proposal. ETag-based caching replaces it (Story 2.8).
- **DO NOT add `ky`** -- this dependency was removed per sprint change proposal. Native fetch replaces it (Story 2.2).
- **Zod is a dependency** of this package (for `z.ZodType<T>` in `IQueryBus` interface and `ZodIssue[]` in `ValidationError`). Add it to `package.json` dependencies. Use `z.ZodType<T>` (not `ZodSchema<T>`) -- it's the stable generic across Zod 3.x versions.
- **Zod singleton**: Zod MUST be a single instance across the workspace. If multiple Zod versions resolve, `instanceof ZodError` checks fail silently. pnpm strict dependencies help, but verify with `pnpm why zod` that only one version is resolved.
- **ProblemDetails parser** receives a `Response` object (native fetch) and returns the appropriate `HexalithError` subclass -- it does NOT throw. The caller (Story 2.2's fetch client) decides when to throw.

### File Structure (Target)

```
packages/cqrs-client/
├── src/
│   ├── index.ts              # Public API barrel -- grouped exports
│   ├── errors.ts             # HexalithError hierarchy (7 error classes)
│   ├── core/
│   │   ├── types.ts          # All backend API payload types + CommandStatus union
│   │   ├── types.test.ts     # Type assertion tests
│   │   ├── problemDetails.ts # RFC 9457 parser -> HexalithError mapping
│   │   ├── problemDetails.test.ts
│   │   ├── correlationId.ts  # ULID generation via ulidx
│   │   ├── correlationId.test.ts
│   │   ├── ICommandBus.ts    # Interface: send(command) -> Promise<response>
│   │   ├── ICommandBus.test.ts
│   │   ├── IQueryBus.ts      # Interface: query<T>(request, schema) -> Promise<T>
│   │   └── IQueryBus.test.ts
│   └── errors.test.ts
├── tsup.config.ts            # Already configured: entry: ['src/index.ts'], format: ['esm'], dts: true
├── tsconfig.json             # Already configured: extends react-library
├── vitest.config.ts          # Already configured
├── eslint.config.js          # Already configured
└── package.json              # Add: zod, ulidx to dependencies
```

### Naming Conventions

| Element             | Convention                             | Example                                        |
| ------------------- | -------------------------------------- | ---------------------------------------------- |
| Interfaces          | I-prefix + PascalCase                  | `ICommandBus`, `IQueryBus`                     |
| Types (data shapes) | PascalCase, no prefix                  | `SubmitCommandRequest`, `ProblemDetails`       |
| Error classes       | PascalCase                             | `CommandRejectedError`, `RateLimitError`       |
| Union types         | PascalCase type, literal string values | `type CommandStatus = 'Received' \| ...`       |
| Utility functions   | camelCase                              | `generateCorrelationId`, `parseProblemDetails` |
| Files               | camelCase.ts                           | `problemDetails.ts`, `correlationId.ts`        |
| Tests               | co-located .test.ts                    | `errors.test.ts`, `problemDetails.test.ts`     |
| Constants           | UPPER_SNAKE_CASE                       | `CORRELATION_ID_HEADER`                        |

### Backend API Type Reference

These types MUST match the backend exactly (camelCase, same field names):

```typescript
// Command submission
interface SubmitCommandRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  commandType: string; // Fully qualified .NET type name, e.g. "Hexalith.Orders.Commands.PlaceOrder, Hexalith.Orders" — module developer provides this as-is
  payload: unknown; // Domain-specific command data
  extensions?: Record<string, string>;
}

// Command response (202 Accepted)
interface SubmitCommandResponse {
  correlationId: string; // GUID from backend
}

// Command status polling
interface CommandStatusResponse {
  correlationId: string;
  status: CommandStatus;
  statusCode: number;
  timestamp: string; // ISO 8601
  aggregateId?: string;
  eventCount?: number; // Only on Completed
  rejectionEventType?: string; // Only on Rejected
  failureReason?: string; // Only on PublishFailed
  timeoutDuration?: string; // Only on TimedOut, ISO 8601 duration
}

// Query submission
interface SubmitQueryRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  queryType: string;
  payload?: unknown;
  entityId?: string; // Entity-scoped query routing
}

// Pre-flight validation
interface ValidateCommandRequest {
  tenant: string;
  domain: string;
  commandType: string;
  aggregateId?: string;
}

interface PreflightValidationResult {
  isAuthorized: boolean;
  reason?: string;
}

// RFC 9457 Problem Details (error response)
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  correlationId?: string;
  tenantId?: string;
}

// Query response
interface SubmitQueryResponse {
  correlationId: string;
  payload: unknown; // Projection data
}

type CommandStatus =
  | "Received"
  | "Processing"
  | "EventsStored"
  | "EventsPublished"
  | "Completed"
  | "Rejected"
  | "PublishFailed"
  | "TimedOut";
```

### Error Hierarchy Reference

```typescript
abstract class HexalithError extends Error {
  abstract readonly code: string;

  toJSON(): Record<string, unknown> {
    return { code: this.code, message: this.message };
    // Subclasses override to include their specific fields
  }
}

class ApiError extends HexalithError {
  readonly code = 'API_ERROR';
  constructor(public readonly statusCode: number, public readonly body?: unknown) { ... }
}

class ValidationError extends HexalithError {
  readonly code = 'VALIDATION_ERROR';
  constructor(public readonly issues: ZodIssue[]) { ... }
}

class CommandRejectedError extends HexalithError {
  readonly code = 'COMMAND_REJECTED';
  constructor(
    public readonly rejectionEventType: string,
    public readonly correlationId: string
  ) { ... }
}

class CommandTimeoutError extends HexalithError {
  readonly code = 'COMMAND_TIMEOUT';
  constructor(
    public readonly duration: string,    // ISO 8601 duration
    public readonly correlationId: string
  ) { ... }
}

class AuthError extends HexalithError {
  readonly code = 'AUTH_ERROR';
}

class ForbiddenError extends HexalithError {
  readonly code = 'FORBIDDEN';
}

class RateLimitError extends HexalithError {
  readonly code = 'RATE_LIMIT';
  constructor(public readonly retryAfter?: string) { ... }
}
```

### ProblemDetails HTTP Status Mapping

| HTTP Status   | Maps To          | Notes                                                                             |
| ------------- | ---------------- | --------------------------------------------------------------------------------- |
| 400           | `ApiError`       | Backend bad request -- `ValidationError` is reserved for Zod schema failures only |
| 401           | `AuthError`      | Triggers silent refresh or OIDC redirect                                          |
| 403           | `ForbiddenError` | Tenant not authorized                                                             |
| 404           | `ApiError`       | Resource not found                                                                |
| 409           | `ApiError`       | Conflict (non-replayable command replay)                                          |
| 429           | `RateLimitError` | Preserve Retry-After header value                                                 |
| 503           | `ApiError`       | Service unavailable                                                               |
| Other 4xx/5xx | `ApiError`       | Fallback                                                                          |

### Barrel Export Pattern (src/index.ts)

Follow the shell-api pattern -- grouped exports with category comments:

```typescript
// Types
export type { SubmitCommandRequest, SubmitCommandResponse, ... } from './core/types';
export type { CommandStatus } from './core/types';
export type { ProblemDetails } from './core/types';

// Interfaces
export type { ICommandBus } from './core/ICommandBus';
export type { IQueryBus } from './core/IQueryBus';

// Errors
export { HexalithError, ApiError, ValidationError, ... } from './errors';

// Utilities
export { generateCorrelationId } from './core/correlationId';
export { parseProblemDetails } from './core/problemDetails';
```

### Testing Strategy

- **Co-located tests**: Every `.ts` file gets a `.test.ts` sibling
- **Type-level tests**: Use vitest `expectTypeOf` to verify interface shapes at compile time (e.g., `expectTypeOf<ICommandBus>().toHaveProperty('send')`) -- NOT runtime assertions on interfaces
- **Error class tests**: Verify inheritance chain, `instanceof` checks, unique `code` values, `message` formatting
- **ProblemDetails tests**: Mock `Response` objects with various status codes and body shapes, verify correct error class instantiation, test edge cases (non-JSON body, missing fields, malformed ProblemDetails)
- **CorrelationId tests**: Verify ULID format (`/^[0-9A-HJKMNP-TV-Z]{26}$/i`), lexicographic ordering (later IDs sort after earlier IDs), uniqueness across calls
- **No DOM testing needed**: This story is pure TypeScript -- no React components. `vitest.config.ts` does NOT need `environment: 'jsdom'`

### Dependencies to Add

```json
{
  "dependencies": {
    "@hexalith/shell-api": "workspace:*",
    "zod": "^3.24.0",
    "ulidx": "^2.4.0"
  }
}
```

`zod` is needed for `z.ZodType<T>` in `IQueryBus` and `ZodIssue[]` in `ValidationError`.
`ulidx` is needed for ULID correlation ID generation. Zero dependencies, TypeScript-native.

### Project Structure Notes

- Package lives at `packages/cqrs-client/` in the Turborepo monorepo
- Build config (tsup, tsconfig, vitest, eslint) already exists and is correctly configured
- Only `src/index.ts` needs content (currently `export {}`)
- Source files go in `src/core/` (internal utilities and interfaces) and `src/` (errors, barrel)
- `src/core/` is NOT an `internal/` directory -- these exports ARE public API
- The `internal/` directory (for non-exported utilities like the fetch client) will be created in Story 2.2

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] -- Backend payload types, error hierarchy, RFC 9457 mapping
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] -- Naming conventions, file organization, test patterns
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] -- Acceptance criteria, BDD scenarios
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-15.md] -- ProblemDetails, entityId, ULID, fetch-not-ky changes
- [Source: _bmad-output/planning-artifacts/research/technical-hexalith-eventstore-interaction-patterns-research-2026-03-15.md] -- Backend API endpoint inventory, payload schemas, SignalR contract

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- All 80 tests pass (6 test files)
- ESM build produces dist/index.js (4.50 KB) and dist/index.d.ts (4.16 KB)
- Lint passes with zero errors after auto-fix of import ordering
- Full monorepo regression suite: 324 tests pass across 27 test files

### Completion Notes List

- Task 1: Created `src/core/types.ts` with all 9 backend API types + CommandStatus union. 21 type assertion tests verify field existence and types.
- Task 2: Created `src/errors.ts` with HexalithError abstract base class and 7 subclasses. Base `toJSON()` now serializes subclass fields and dynamically attached metadata for structured logging. 24 tests verify inheritance, unique codes, instanceof checks, and JSON serialization.
- Task 3: Created `src/core/problemDetails.ts` with RFC 9457 parser. It now reads the response body once as text, parses JSON from that buffer when possible, preserves correlationId/tenantId, extracts Retry-After, and handles non-JSON responses without losing body text. 24 tests cover mappings, structured metadata serialization, and real Response body-stream fallback.
- Task 4: Created `src/core/correlationId.ts` using ulidx for ULID generation. Exports CORRELATION_ID_HEADER constant. 5 tests verify format, ordering, and uniqueness.
- Task 5: Created ICommandBus and IQueryBus interfaces with I-prefix convention. 6 type-level tests using expectTypeOf.
- Task 6: Updated barrel export with grouped categories (Types, Interfaces, Errors, Utilities). Added zod and ulidx dependencies. Build, test, and lint all pass.

### Change Log

- 2026-03-16: Implemented Story 2.1 — created @hexalith/cqrs-client package with typed CQRS interfaces, 7-class error hierarchy, RFC 9457 ProblemDetails parser, and ULID correlation ID utility. 77 tests, 0 regressions.
- 2026-03-16: Fixed code review findings — preserved dynamic error metadata during serialization and changed ProblemDetails parsing to read response bodies once, eliminating real Fetch text-fallback loss. 80 tests, lint, and build pass.

### File List

- packages/cqrs-client/src/index.ts (modified — barrel exports)
- packages/cqrs-client/src/errors.ts (new — error hierarchy)
- packages/cqrs-client/src/errors.test.ts (new — 24 tests)
- packages/cqrs-client/src/core/types.ts (new — backend API types)
- packages/cqrs-client/src/core/types.test.ts (new — 21 type tests)
- packages/cqrs-client/src/core/problemDetails.ts (new — RFC 9457 parser)
- packages/cqrs-client/src/core/problemDetails.test.ts (new — 24 tests)
- packages/cqrs-client/src/core/correlationId.ts (new — ULID generation)
- packages/cqrs-client/src/core/correlationId.test.ts (new — 5 tests)
- packages/cqrs-client/src/core/ICommandBus.ts (new — interface)
- packages/cqrs-client/src/core/ICommandBus.test.ts (new — 3 type tests)
- packages/cqrs-client/src/core/IQueryBus.ts (new — interface)
- packages/cqrs-client/src/core/IQueryBus.test.ts (new — 3 type tests)
- packages/cqrs-client/package.json (modified — added zod, ulidx deps)

## Senior Developer Review (AI)

### Outcome

Approved after fixes

### Summary

- All acceptance criteria are implemented and verified.
- The two medium-severity review findings were fixed in `src/errors.ts` and `src/core/problemDetails.ts`.
- Package validation succeeded after the fixes: `pnpm --filter @hexalith/cqrs-client lint`, `test`, and `build` all passed locally with 80 tests green.

### Findings

1. **Resolved — ProblemDetails non-JSON fallback now preserves real Fetch response bodies**  
   `parseProblemDetails()` now reads the response body once as text and parses JSON from that buffered text when possible, so HTML/plain-text error bodies are preserved even with real body-stream semantics.

2. **Resolved — Structured serialization now preserves dynamic metadata fields**  
   `HexalithError.toJSON()` now serializes all enumerable subclass fields and dynamically attached metadata such as `correlationId` and `tenantId`, so `JSON.stringify(error)` matches the structured-logging contract.

3. **Low — Git working tree note remains informational only**  
   The current working tree still primarily reflects story/sprint metadata plus lockfile changes, which is consistent with the implementation already existing on `main` before this fix pass.

### Recommended Next Step

- Story 2.1 is complete. Proceed to Story 2.2.
