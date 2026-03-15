# Story 2.1: CQRS Client Package & Error Hierarchy

Status: ready-for-dev

## Story

As a shell team developer,
I want to create the @hexalith/cqrs-client package with typed interfaces and a structured error hierarchy,
so that all CQRS communication has a consistent contract and error handling foundation.

## Acceptance Criteria

1. **Given** the `@hexalith/cqrs-client` package is created in `packages/cqrs-client/`
   **When** a developer inspects the public API
   **Then** `ICommandBus` interface exists with `send(command: SubmitCommandRequest): Promise<SubmitCommandResponse>` method
   **And** `IQueryBus` interface exists with `query<T>(request: SubmitQueryRequest, schema: ZodSchema<T>): Promise<T>` method
   **And** interface names use `I` prefix following .NET backend conventions

2. **Given** the error hierarchy is defined in `src/errors.ts`
   **When** a developer inspects the error types
   **Then** `HexalithError` abstract base class extends `Error` with abstract `code: string`
   **And** `ApiError` (statusCode, body), `ValidationError` (ZodIssue[]), `CommandRejectedError` (rejectionEventType, correlationId), `CommandTimeoutError` (duration, correlationId), `AuthError`, `ForbiddenError`, and `RateLimitError` subclasses exist
   **And** each error class has a unique `code` string identifier

3. **Given** the package types are defined in `src/core/types.ts`
   **When** a developer inspects them
   **Then** `SubmitCommandRequest`, `SubmitCommandResponse`, `CommandStatusResponse`, `SubmitQueryRequest`, `SubmitQueryResponse`, `ValidateCommandRequest`, `PreflightValidationResult`, and `ProblemDetails` types match the backend API payload shapes exactly (camelCase, matching field names)
   **And** `SubmitQueryRequest` includes optional `entityId: string` field for entity-scoped query routing
   **And** `CommandStatus` is a union type: `'Received' | 'Processing' | 'EventsStored' | 'EventsPublished' | 'Completed' | 'Rejected' | 'PublishFailed' | 'TimedOut'`
   **And** no TypeScript `enum` is used -- union types only

4. **Given** the error response parser is defined in `src/core/problemDetails.ts`
   **When** the HTTP client receives a 4xx or 5xx response
   **Then** the response body is parsed as RFC 9457 ProblemDetails
   **And** the parser maps HTTP status codes to the typed error hierarchy: 400->ValidationError, 401->AuthError, 403->ForbiddenError, 429->RateLimitError, others->ApiError
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

- [ ] Task 1: Create type definitions (AC: #3)
  - [ ] Create `src/core/types.ts` with all backend API payload types
  - [ ] `SubmitCommandRequest` with fields: tenant, domain, aggregateId, commandType, payload, extensions?
  - [ ] `SubmitCommandResponse` with correlationId
  - [ ] `CommandStatusResponse` with status, statusCode, timestamp, aggregateId?, eventCount?, rejectionEventType?, failureReason?, timeoutDuration?
  - [ ] `SubmitQueryRequest` with tenant, domain, aggregateId, queryType, payload?, entityId?
  - [ ] `SubmitQueryResponse` with correlationId, payload
  - [ ] `ValidateCommandRequest` with tenant, domain, commandType, aggregateId?
  - [ ] `PreflightValidationResult` with isAuthorized, reason?
  - [ ] `ProblemDetails` with type, title, status, detail, instance, correlationId?, tenantId?
  - [ ] `CommandStatus` union type (8 states)
  - [ ] Write `src/core/types.test.ts` -- type assertion tests verifying field existence and types

- [ ] Task 2: Create error hierarchy (AC: #2)
  - [ ] Create `src/errors.ts` with abstract `HexalithError` base class
  - [ ] `ApiError` -- code: 'API_ERROR', constructor(statusCode: number, body?: unknown)
  - [ ] `ValidationError` -- code: 'VALIDATION_ERROR', constructor(issues: ZodIssue[])
  - [ ] `CommandRejectedError` -- code: 'COMMAND_REJECTED', constructor(rejectionEventType: string, correlationId: string)
  - [ ] `CommandTimeoutError` -- code: 'COMMAND_TIMEOUT', constructor(duration: string, correlationId: string)
  - [ ] `AuthError` -- code: 'AUTH_ERROR'
  - [ ] `ForbiddenError` -- code: 'FORBIDDEN'
  - [ ] `RateLimitError` -- code: 'RATE_LIMIT', constructor with retryAfter?: string
  - [ ] Write `src/errors.test.ts` -- verify inheritance, code values, instanceof checks, serialization

- [ ] Task 3: Create RFC 9457 ProblemDetails parser (AC: #4)
  - [ ] Create `src/core/problemDetails.ts` with `parseProblemDetails(response: Response): Promise<HexalithError>`
  - [ ] Map HTTP status codes: 400->ValidationError, 401->AuthError, 403->ForbiddenError, 429->RateLimitError, others->ApiError
  - [ ] Preserve correlationId and tenantId from ProblemDetails body in error instances
  - [ ] Handle 429 Retry-After header extraction
  - [ ] Handle non-JSON error responses gracefully (fallback to ApiError)
  - [ ] Write `src/core/problemDetails.test.ts` -- test all mappings, edge cases, malformed bodies

- [ ] Task 4: Create correlation ID utility (AC: #5)
  - [ ] Create `src/core/correlationId.ts` with `generateCorrelationId(): string`
  - [ ] Use `ulidx` library for ULID generation
  - [ ] Add `ulidx` to package.json dependencies
  - [ ] Write `src/core/correlationId.test.ts` -- verify ULID format, lexicographic ordering, uniqueness

- [ ] Task 5: Create bus interfaces (AC: #1)
  - [ ] Create `src/core/ICommandBus.ts` with `send(command: SubmitCommandRequest): Promise<SubmitCommandResponse>`
  - [ ] Create `src/core/IQueryBus.ts` with `query<T>(request: SubmitQueryRequest, schema: ZodSchema<T>): Promise<T>`
  - [ ] Write interface assertion tests in `src/core/ICommandBus.test.ts` and `src/core/IQueryBus.test.ts`

- [ ] Task 6: Update package barrel export and dependencies (AC: #6)
  - [ ] Update `src/index.ts` with grouped exports (types, errors, interfaces, utilities)
  - [ ] Add `zod` and `ulidx` to package.json dependencies
  - [ ] Verify `pnpm build` produces ESM + .d.ts
  - [ ] Verify `pnpm test` passes all tests
  - [ ] Verify `pnpm lint` passes

## Dev Notes

### Architecture Compliance

- **REST client**: Native `fetch` API (NOT ky -- ky was removed per sprint change proposal 2026-03-15). The fetch client itself is NOT part of this story (that's Story 2.2). This story only defines the types and interfaces.
- **No TypeScript enums**: Use union types exclusively. `CommandStatus` is a union of 8 string literals matching backend exactly.
- **I-prefix for interfaces**: `ICommandBus`, `IQueryBus` -- follows .NET backend conventions per architecture document.
- **camelCase JSON**: All type fields match backend JSON payload shapes exactly -- no transformation layer.
- **Error hierarchy**: Abstract base `HexalithError extends Error` with abstract `code: string`. Each subclass has a unique code identifier.
- **RFC 9457 ProblemDetails**: The backend error response format. Parser maps HTTP status to typed error classes.
- **ULID correlation IDs**: `ulidx` library generates lexicographically sortable, timestamp-embedded IDs for `X-Correlation-ID` header.

### Critical Constraints

- **DO NOT create the fetch client** (`createFetchClient`) -- that's Story 2.2. This story creates the types, interfaces, errors, and utilities that Story 2.2 will consume.
- **DO NOT create React hooks** (`useCommandPipeline`, `useQuery`, etc.) -- those are Stories 2.3-2.4. This story establishes the contract layer.
- **DO NOT add `@tanstack/react-query`** -- this dependency was removed per sprint change proposal. ETag-based caching replaces it (Story 2.8).
- **DO NOT add `ky`** -- this dependency was removed per sprint change proposal. Native fetch replaces it (Story 2.2).
- **Zod is a dependency** of this package (for `ZodSchema<T>` in `IQueryBus` interface and `ZodIssue[]` in `ValidationError`). Add it to `package.json` dependencies.
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

| Element | Convention | Example |
|---------|-----------|---------|
| Interfaces | I-prefix + PascalCase | `ICommandBus`, `IQueryBus` |
| Types (data shapes) | PascalCase, no prefix | `SubmitCommandRequest`, `ProblemDetails` |
| Error classes | PascalCase | `CommandRejectedError`, `RateLimitError` |
| Union types | PascalCase type, literal string values | `type CommandStatus = 'Received' \| ...` |
| Utility functions | camelCase | `generateCorrelationId`, `parseProblemDetails` |
| Files | camelCase.ts | `problemDetails.ts`, `correlationId.ts` |
| Tests | co-located .test.ts | `errors.test.ts`, `problemDetails.test.ts` |
| Constants | UPPER_SNAKE_CASE | `CORRELATION_ID_HEADER` |

### Backend API Type Reference

These types MUST match the backend exactly (camelCase, same field names):

```typescript
// Command submission
interface SubmitCommandRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  commandType: string;       // Fully qualified .NET type name
  payload: unknown;          // Domain-specific command data
  extensions?: Record<string, string>;
}

// Command response (202 Accepted)
interface SubmitCommandResponse {
  correlationId: string;     // GUID from backend
}

// Command status polling
interface CommandStatusResponse {
  correlationId: string;
  status: CommandStatus;
  statusCode: number;
  timestamp: string;         // ISO 8601
  aggregateId?: string;
  eventCount?: number;       // Only on Completed
  rejectionEventType?: string;  // Only on Rejected
  failureReason?: string;    // Only on PublishFailed
  timeoutDuration?: string;  // Only on TimedOut, ISO 8601 duration
}

// Query submission
interface SubmitQueryRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  queryType: string;
  payload?: unknown;
  entityId?: string;          // Entity-scoped query routing
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
  payload: unknown;          // Projection data
}

type CommandStatus =
  | 'Received'
  | 'Processing'
  | 'EventsStored'
  | 'EventsPublished'
  | 'Completed'
  | 'Rejected'
  | 'PublishFailed'
  | 'TimedOut';
```

### Error Hierarchy Reference

```typescript
abstract class HexalithError extends Error {
  abstract readonly code: string;
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

| HTTP Status | Maps To | Notes |
|-------------|---------|-------|
| 400 | `ValidationError` | Zod issues from ProblemDetails detail field |
| 401 | `AuthError` | Triggers silent refresh or OIDC redirect |
| 403 | `ForbiddenError` | Tenant not authorized |
| 404 | `ApiError` | Resource not found |
| 409 | `ApiError` | Conflict (non-replayable command replay) |
| 429 | `RateLimitError` | Preserve Retry-After header value |
| 503 | `ApiError` | Service unavailable |
| Other 4xx/5xx | `ApiError` | Fallback |

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
- **Type assertion tests**: Verify type shapes compile correctly (compile-time validation)
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

`zod` is needed for `ZodSchema<T>` in `IQueryBus` and `ZodIssue[]` in `ValidationError`.
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

### Debug Log References

### Completion Notes List

### File List
