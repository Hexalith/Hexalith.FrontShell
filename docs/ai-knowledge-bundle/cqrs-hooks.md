# CQRS Hook API Reference

Source: `packages/cqrs-client/src/`

All hooks are imported from `@hexalith/cqrs-client`. Requires `<CqrsProvider>` in the component tree.

## Error Hierarchy

All hooks return errors as `HexalithError` subclasses (source: `errors.ts`):

| Error Class            | Code               | When                            | Handling                                             |
| ---------------------- | ------------------ | ------------------------------- | ---------------------------------------------------- |
| `ApiError`             | `API_ERROR`        | HTTP errors, network failures   | Infrastructure error — bubble to `<ErrorBoundary>`   |
| `AuthError`            | `AUTH_ERROR`       | Authentication required/expired | Thrown during render — caught by auth error boundary |
| `ValidationError`      | `VALIDATION_ERROR` | Zod schema validation failure   | Business error — show inline with `<ErrorDisplay>`   |
| `CommandRejectedError` | `COMMAND_REJECTED` | Backend rejected the command    | Business error — show inline                         |
| `CommandTimeoutError`  | `COMMAND_TIMEOUT`  | Command processing timed out    | Show inline with retry option                        |
| `ForbiddenError`       | `FORBIDDEN`        | Insufficient permissions        | Business error — show inline                         |
| `RateLimitError`       | `RATE_LIMIT`       | Too many requests               | Thrown during render — caught by error boundary      |

---

## useSubmitCommand

Submits a single command to the backend. Does NOT track status — use `useCommandPipeline` for full lifecycle.

Source: `commands/useSubmitCommand.ts`

```typescript
function useSubmitCommand(): UseSubmitCommandResult;

interface UseSubmitCommandResult {
  submit: (
    command: SubmitCommandInput,
  ) => Promise<SubmitCommandResponse | null>;
  correlationId: string | null;
  error: HexalithError | null;
}

interface SubmitCommandInput {
  domain: string;
  aggregateId: string;
  commandType: string;
  payload: unknown;
  extensions?: Record<string, string>;
}

interface SubmitCommandResponse {
  correlationId: string;
}
```

**Usage:**

```tsx
import { useSubmitCommand } from "@hexalith/cqrs-client";

function DeleteButton({ id }: { id: string }) {
  const { submit, error } = useSubmitCommand();

  const handleDelete = async () => {
    await submit({
      domain: "orders",
      aggregateId: id,
      commandType: "DeleteOrder",
      payload: { orderId: id },
    });
  };

  return (
    <>
      <Button onClick={handleDelete}>Delete</Button>
      {error && <ErrorDisplay error={error} />}
    </>
  );
}
```

---

## useCommandStatus

Polls backend for command processing status after submission. Used internally by `useCommandPipeline`.

Source: `commands/useCommandStatus.ts`

```typescript
function useCommandStatus(correlationId: string | null): UseCommandStatusResult;

interface UseCommandStatusResult {
  status: PipelineStatus;
  response: CommandStatusResponse | null;
  error: HexalithError | null;
}

type PipelineStatus =
  | "idle" // No command submitted
  | "sending" // Submitting to backend
  | "polling" // Waiting for processing
  | "completed" // Success
  | "rejected" // Backend rejected
  | "failed" // Infrastructure failure
  | "timedOut"; // Processing timed out
```

Polls every 1000ms. Stops on terminal statuses: `Completed`, `Rejected`, `PublishFailed`, `TimedOut`.

---

## useCommandPipeline

Full command lifecycle: submit + status polling + event bus notification. **This is the recommended hook for commands.**

Source: `commands/useCommandPipeline.ts`

```typescript
function useCommandPipeline(): UseCommandPipelineResult;

interface UseCommandPipelineResult {
  send: (command: SubmitCommandInput) => Promise<void>;
  status: PipelineStatus;
  error: HexalithError | null;
  correlationId: string | null;
  replay: (() => Promise<void>) | null; // Non-null when status is 'failed' or 'timedOut'
}
```

**Status transitions:** `idle → sending → polling → completed | rejected | failed | timedOut`

On completion, emits a `CommandCompletedEvent` via the command event bus, which triggers automatic refetch for any `useQuery` hooks watching the same domain.

**Usage:**

```tsx
import { useEffect } from "react";

import { useCommandPipeline } from "@hexalith/cqrs-client";
import { useToast } from "@hexalith/ui";

function CreateOrderForm({ schema }: { schema: z.ZodType }) {
  const { send, status, error, replay } = useCommandPipeline();
  const { toast } = useToast();

  useEffect(() => {
    if (status === "completed") {
      toast({ variant: "success", title: "Order created" });
    }
  }, [status, toast]);

  const handleSubmit = async (data: unknown) => {
    await send({
      domain: "orders",
      aggregateId: crypto.randomUUID(),
      commandType: "CreateOrder",
      payload: data,
    });
  };

  return (
    <>
      <Form schema={schema} onSubmit={handleSubmit} />
      {error && <ErrorDisplay error={error} />}
      {replay && <Button onClick={replay}>Retry</Button>}
    </>
  );
}
```

---

## useQuery

Queries projection data with ETag caching, Zod validation, and automatic real-time updates.

Source: `queries/useQuery.ts`

```typescript
function useQuery<T>(
  schema: z.ZodType<T>,
  queryParams: QueryParams,
  options?: QueryOptions,
): UseQueryResult<T>;

interface QueryParams {
  domain: string;
  queryType: string;
  aggregateId?: string;
  entityId?: string;
}

interface QueryOptions {
  enabled?: boolean; // Default: true
  refetchInterval?: number; // Background polling in ms. undefined = no polling
  refetchOnWindowFocus?: boolean; // Default: true
}

interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isRefreshing: boolean; // Stale-while-revalidate: showing cached data while refetching
  error: HexalithError | null;
  refetch: () => void;
}
```

**Key behaviors:**

- **Stale-while-revalidate:** Serves cached data immediately, revalidates in background if stale (>5 min)
- **ETag caching:** Sends `If-None-Match` header, handles 304 responses
- **Zod validation:** Validates response payload against schema. Returns `ValidationError` on mismatch.
- **Retry with backoff:** Retries transient errors (5xx, network) with exponential backoff (1s, 3s, 5s, 10s, 30s) and +-25% jitter. Does NOT retry client errors (4xx, validation, auth).
- **Connection recovery:** Automatically refetches when connection state transitions from disconnected → connected
- **Domain invalidation:** Auto-refetches when a command completes on the same domain (via `useCommandPipeline` event bus)
- **SignalR integration:** Subscribes to real-time projection changes via `useProjectionSubscription` (no-op if no `SignalRProvider`)

**Critical: Schema and queryParams must be stable references.** Define Zod schemas at module scope. Use `useMemo` for dynamic `queryParams`. Inline objects cause infinite re-fetches.

**Usage:**

```tsx
import { useQuery } from "@hexalith/cqrs-client";
import { z } from "zod";

const TenantListSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(["active", "disabled"]),
  }),
);

type TenantList = z.infer<typeof TenantListSchema>;

const QUERY_PARAMS = { domain: "tenants", queryType: "GetAllTenants" };

function TenantListPage() {
  const { data, isLoading, error } = useQuery(TenantListSchema, QUERY_PARAMS);

  if (isLoading) return <Skeleton variant="table-rows" />;
  if (error) return <ErrorDisplay error={error} />;
  if (!data?.length) return <EmptyState title="No tenants" />;

  return <Table data={data} columns={columns} />;
}
```

---

## useCanExecuteCommand

Pre-flight authorization check for commands. Validates permission before showing UI.

Source: `validation/useCanExecute.ts`

```typescript
function useCanExecuteCommand(
  params: CanExecuteCommandParams,
): UseCanExecuteResult;

interface CanExecuteCommandParams {
  domain: string;
  commandType: string;
  aggregateId?: string;
}

interface UseCanExecuteResult {
  isAuthorized: boolean;
  reason: string | undefined;
  isLoading: boolean;
  error: HexalithError | null;
}
```

Caches results per tenant+endpoint+params. Throws `AuthError` and `RateLimitError` during render (caught by error boundary).

**Usage:**

```tsx
const { isAuthorized, isLoading } = useCanExecuteCommand({
  domain: "orders",
  commandType: "DeleteOrder",
});

if (isLoading) return <Skeleton variant="button" />;
if (!isAuthorized) return null; // Hide button if unauthorized

return <Button onClick={handleDelete}>Delete</Button>;
```

---

## useCanExecuteQuery

Pre-flight authorization check for queries. Same API as `useCanExecuteCommand`.

Source: `validation/useCanExecute.ts`

```typescript
function useCanExecuteQuery(params: CanExecuteQueryParams): UseCanExecuteResult;

interface CanExecuteQueryParams {
  domain: string;
  queryType: string;
  aggregateId?: string;
}
```

---

## useProjectionSubscription

Subscribes to real-time projection change notifications via SignalR.

Source: `notifications/useProjectionSubscription.ts`

```typescript
function useProjectionSubscription(
  projectionType: string,
  tenantId: string,
): void;
```

- No-op if no `SignalRProvider` is in the tree — queries continue via polling.
- Ref-counted group management: only one `JoinGroup` call per unique projection+tenant, regardless of how many components subscribe.
- Max 50 simultaneous groups — excess subscriptions fall back to polling with a console warning.
- Debounced `LeaveGroup` (50ms) handles React StrictMode mount/unmount/mount cycles.
- On projection change, triggers domain invalidation → `useQuery` refetches.

Typically not called directly — `useQuery` calls it internally.

---

## useConnectionState

Monitors connection health to the backend.

Source: `connection/ConnectionStateProvider.tsx`

```typescript
function useConnectionState(): {
  state: ConnectionState;
  transport: TransportType;
};

type ConnectionState = "connected" | "reconnecting" | "disconnected";
type TransportType = "polling" | "signalr";
```

Transitions: 1 failure → `reconnecting`, 3+ consecutive failures → `disconnected`, 1 success → `connected`.

**Usage:**

```tsx
const { state, transport } = useConnectionState();

if (state === "disconnected") {
  return <Alert variant="warning">Connection lost. Data may be stale.</Alert>;
}
```

---

## useCqrs

Provider context hook. Returns the CQRS infrastructure (fetch client, event bus). Used internally by command/query hooks.

Source: `CqrsProvider.tsx`

```typescript
function useCqrs(caller?: string): CqrsContextValue;
```

Module developers rarely call this directly — use `useSubmitCommand`, `useCommandPipeline`, or `useQuery` instead.

---

## useQueryClient

Provider context hook. Returns the query client infrastructure (fetch client, ETag cache, domain invalidation). Used internally by `useQuery`.

Source: `queries/QueryProvider.tsx`

```typescript
function useQueryClient(): QueryClientContextValue;
```

---

## useSignalRHub

Provider context hook. Returns the SignalR hub instance from context. Used internally by `useProjectionSubscription`.

Source: `notifications/SignalRProvider.tsx`

```typescript
function useSignalRHub(): ISignalRHub | null;
```

Returns `null` if no `SignalRProvider` is in the tree.

---

## Zod Schema Integration Pattern

Zod schemas serve dual purpose: TypeScript type derivation and runtime response validation.

```typescript
// 1. Define schema at module scope (stable reference)
const OrderSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "shipped", "delivered"]),
  total: z.number(),
});

// 2. Derive TypeScript type from schema
type Order = z.infer<typeof OrderSchema>;

// 3. Pass schema to useQuery for automatic validation
const { data } = useQuery(OrderSchema, queryParams);
// data is typed as Order | undefined
```

**Schema naming convention:** `PascalCase` + `Schema` suffix (e.g., `TenantViewSchema`, `OrderListSchema`).

## Anti-Patterns

| Don't                                            | Do                                       |
| ------------------------------------------------ | ---------------------------------------- |
| `try/catch` around hooks                         | Read `error` from hook return value      |
| Call `fetch` directly                            | Use `useQuery` or `useSubmitCommand`     |
| Create Zod schemas inside components             | Define schemas at module scope           |
| Pass inline objects as `queryParams`             | Use `useMemo` or module-scope constants  |
| Import from `@hexalith/cqrs-client/commands/...` | Import from `@hexalith/cqrs-client` root |
