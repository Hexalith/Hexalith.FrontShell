# CQRS for Frontend Developers

A frontend-focused guide to commands, projections, and error handling in Hexalith modules. You never call backend APIs directly — the CQRS hooks handle everything.

## Commands

A **command** tells the backend to _do_ something — create, update, or delete an entity. Commands are fire-and-forget: you send the intent and the backend processes it asynchronously.

In your module, you send commands via `useSubmitCommand` (fire-and-forget) or `useCommandPipeline` (full lifecycle with status tracking). The hooks abstract the HTTP POST, auth header injection, correlation ID generation, and status polling.

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx
import { useCommandPipeline } from "@hexalith/cqrs-client";

const { send, status, error } = useCommandPipeline();

await send({
  commandType: "CreateExample", // Your command type name
  domain: "__MODULE_NAME__", // Your domain/aggregate root
  aggregateId: crypto.randomUUID(),
  payload: data, // Domain-specific command data
});
```

**When to use which hook:**

| Hook                 | Use case                                                                         |
| -------------------- | -------------------------------------------------------------------------------- |
| `useSubmitCommand`   | Fire-and-forget — you don't need to track the outcome                            |
| `useCommandPipeline` | Full lifecycle — you need status updates (sending, polling, completed, rejected) |
| `useCommandStatus`   | Poll the status of an existing command by its correlation ID                     |

## Projections

A **projection** is a read-optimized view of data. When commands are processed, the backend updates projections that represent the current state of your domain entities.

You query projections via `useQuery`. The hook abstracts the HTTP POST to the query API, auth headers, and ETag caching. Responses are validated at runtime against a Zod schema — if the backend returns unexpected data, you get a clear validation error instead of a silent crash.

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.tsx
import { useQuery } from "@hexalith/cqrs-client";
import { z } from "zod";

const ExampleListSchema = z.array(ExampleItemSchema);

const EXAMPLE_LIST_PARAMS = {
  domain: "__MODULE_NAME__",
  queryType: "ExampleList",
} as const;

const { data, isLoading, error, refetch } = useQuery(
  ExampleListSchema,
  EXAMPLE_LIST_PARAMS,
);
```

For single-entity queries, include `aggregateId`:

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleDetailPage.tsx
const params = {
  domain: "__MODULE_NAME__",
  queryType: "ExampleDetail",
  aggregateId: id,
};

const { data, isLoading, error, refetch } = useQuery(
  ExampleDetailSchema,
  params,
  { enabled: !!id },
);
```

### Real-time updates

For live projection updates (e.g., another user creates an entity), use `useProjectionSubscription` to subscribe via SignalR:

```typescript
import { useProjectionSubscription } from "@hexalith/cqrs-client";
```

The subscription notifies your component when projection data changes, so you can refetch or update the UI.

## Command lifecycle

When you send a command, it goes through these states:

```text
Submit → Received → Processing → EventsStored → EventsPublished → Completed
                                                                  ↘ Rejected
                                                                  ↘ PublishFailed
                                                                  ↘ TimedOut
```

**`useCommandPipeline` status states** (what your component sees):

| Status      | Description                                          |
| ----------- | ---------------------------------------------------- |
| `idle`      | No command has been sent                             |
| `sending`   | Command is being submitted to the backend            |
| `polling`   | Command submitted, polling for result                |
| `completed` | Backend confirmed the command succeeded              |
| `rejected`  | Backend rejected the command (domain rule violation) |
| `failed`    | Command failed before completion                     |
| `timedOut`  | Polling timed out before confirmation                |

**UI patterns for each status:**

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx
const isBusy = status === "sending" || status === "polling";
const statusMessage =
  status === "sending"
    ? "Sending command to the backend…"
    : status === "polling"
      ? "Waiting for command confirmation…"
      : status === "rejected"
        ? "The backend rejected the command. Review the details below and try again."
        : status === "failed"
          ? "The command failed before completion. Review the error and retry."
          : status === "timedOut"
            ? "The command timed out before confirmation. You can retry once the service is responsive."
            : null;
```

On success, show a toast and navigate:

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx
useEffect(() => {
  if (status !== "completed") {
    return;
  }
  toast({
    variant: "success",
    title: "Item created",
    description: "Your command completed successfully and the item is ready.",
  });
  navigate("..");
}, [navigate, status, toast]);
```

## Error handling

### Error hierarchy

The `@hexalith/cqrs-client` package exports a structured error hierarchy:

| Error class            | When it occurs                                         |
| ---------------------- | ------------------------------------------------------ |
| `HexalithError`        | Abstract base — all errors extend this                 |
| `ApiError`             | HTTP errors from the backend                           |
| `AuthError`            | 401 Unauthorized — token expired or invalid            |
| `ForbiddenError`       | 403 Forbidden — user lacks permission                  |
| `RateLimitError`       | 429 Too Many Requests                                  |
| `ValidationError`      | Zod validation failures (response didn't match schema) |
| `CommandRejectedError` | Domain rule rejected the command                       |
| `CommandTimeoutError`  | Command status polling timed out                       |

### Error boundary hierarchy

Errors are caught at multiple levels:

1. **Shell error boundary** — catches catastrophic errors that crash the entire app
2. **Module error boundary** — catches module-level errors, isolating failures from the shell and other modules
3. **Hook return values** — CQRS hooks surface expected errors (network failures, rejections) via their `error` return value

For expected errors (query failures, command rejections), handle them in your component:

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.tsx
import { ErrorDisplay } from "@hexalith/ui";

if (error) {
  return (
    <PageLayout title="__MODULE_DISPLAY_NAME__">
      <ErrorDisplay
        error={error}
        title="Failed to load items"
        onRetry={refetch}
      />
    </PageLayout>
  );
}
```

For command errors:

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx
{error && (
  <ErrorDisplay error={error} title="Command failed" />
)}
```

## Backend endpoint reference (read-only context)

These are the backend endpoints your hooks communicate with. **You never call these directly** — the CQRS hooks handle everything.

| Endpoint                       | Method | Purpose                        | Response                                    |
| ------------------------------ | ------ | ------------------------------ | ------------------------------------------- |
| `/api/v1/commands`             | POST   | Submit a command               | 202 + `{ correlationId }`                   |
| `/api/v1/commands/status/{id}` | GET    | Poll command status            | 200 + `CommandStatusResponse`               |
| `/api/v1/commands/validate`    | POST   | Pre-flight authorization check | 200 + `{ isAuthorized, reason? }`           |
| `/api/v1/queries`              | POST   | Query a projection             | 200 + `{ correlationId, payload }` + `ETag` |
| `/api/v1/queries/validate`     | POST   | Pre-flight query authorization | 200 + `{ isAuthorized, reason? }`           |

**Pre-flight validation** — use `useCanExecuteCommand` and `useCanExecuteQuery` to check if the current user is authorized before showing UI elements (e.g., hide the "Create" button if the user can't execute the create command).
