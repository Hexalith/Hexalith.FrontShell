# Add Command to Existing Module

<!-- Verified against bundle v0.1.0 -->

Add a new command to an existing Hexalith module. Produces: Zod command schema, form page, route addition, lazy import, and test file.

## Input Parameters

| Parameter | Format | Example |
| --- | --- | --- |
| Command name | PascalCase verb + entity | `CancelOrder` |
| Fields / payload | Field names with types | `reason: string (required), cancelledBy: string (optional)` |
| Domain name | kebab-case | `order-management` |
| Target module path | Relative to repo root | `modules/order-management` |

## Clarifying Questions

Before generating, ask the user about:

1. **Field types and validation** — Max lengths? Regex patterns? Required vs optional?
2. **Is this command destructive?** — Delete, cancel, disable, or remove operations require `<AlertDialog>` confirmation before sending.
3. **Status options** — If any field uses a fixed set of values, what are they?
4. **Success navigation** — After the command completes, navigate back to list (`".."`) or to a specific page?

## Knowledge Bundle References

| File | What to extract |
| --- | --- |
| [cqrs-hooks.md](../cqrs-hooks.md) | `useCommandPipeline` signature, status flow, `send()` parameters |
| [ui-components.md](../ui-components.md) | `Form`, `FormField`, `Input`, `Select`, `TextArea`, `AlertDialog`, `Button` props |
| [conventions.md](../conventions.md) | File naming, import ordering |
| [test-fixtures.md](../test-fixtures.md) | `MockCommandBus`, `renderWithProviders` |

## Generation Instructions

### 1. Zod Command Schema

Add to the existing schemas file (`src/schemas/{entity}Schemas.ts`):

```typescript
// Add below existing schemas
export const {CommandName}CommandSchema = z.object({
  // Only user-provided fields — no id, no timestamps
  reason: z.string().min(1, "Reason is required").max(500),
  // ... additional fields per input
});
export type {CommandName}Input = z.infer<typeof {CommandName}CommandSchema>;
```

### 2. Form Page (`src/pages/{CommandName}Page.tsx`)

```typescript
import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router";

import { useCommandPipeline } from "@hexalith/cqrs-client";
import {
  Button,
  ErrorDisplay,
  Form,
  FormField,
  Input,
  Inline,
  PageLayout,
  Select,
  TextArea,
  useToast,
} from "@hexalith/ui";

import { {CommandName}CommandSchema } from "../schemas/{entity}Schemas.js";
import type { {CommandName}Input } from "../schemas/{entity}Schemas.js";

export function {CommandName}Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { send, status, error } = useCommandPipeline();

  useEffect(() => {
    if (status !== "completed") return;
    toast({
      variant: "success",
      title: "{Domain action} completed",  // e.g., "Order cancelled"
      description: "The command completed successfully.",
    });
    navigate("..");
  }, [navigate, status, toast]);

  const handleSubmit = useCallback(
    async (data: {CommandName}Input) => {
      await send({
        commandType: "{CommandName}",
        domain: "{domain-name}",
        aggregateId: id ?? crypto.randomUUID(),
        payload: data,
      });
    },
    [id, send],
  );

  const handleCancel = useCallback(() => { navigate(".."); }, [navigate]);

  const isBusy = status === "sending" || status === "polling";
  const statusMessage =
    status === "sending" ? "Sending command..."
    : status === "polling" ? "Waiting for confirmation..."
    : status === "rejected" ? "The command was rejected. Review and try again."
    : status === "failed" ? "The command failed. Review the error and retry."
    : status === "timedOut" ? "The command timed out. Retry when the service is responsive."
    : null;

  return (
    <PageLayout title="{Action} {Entity}">
      {statusMessage && !error && <p>{statusMessage}</p>}
      {error && <ErrorDisplay error={error} title="Command failed" />}

      <Form schema={{CommandName}CommandSchema} onSubmit={handleSubmit}>
        {/* Map fields per field-type-to-component table in new-module.md */}
        <FormField name="reason">
          <TextArea label="Reason" placeholder="Provide a reason" rows={3} required />
        </FormField>

        <Inline gap="2">
          <Button variant="ghost" type="reset" onClick={handleCancel}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isBusy}>
            {status === "sending" ? "Sending..." : status === "polling" ? "Confirming..." : "{Action}"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
```

**Destructive commands:** If the command is destructive, wrap the submit button in an `<AlertDialog>`:

```typescript
import { AlertDialog } from "@hexalith/ui";

// Replace the direct submit button with:
<AlertDialog
  title="Confirm {Action}"
  description="This action cannot be undone. Are you sure you want to {action} this {entity}?"
  confirmLabel="{Action}"
  onConfirm={() => formRef.current?.requestSubmit()}
>
  <Button variant="destructive">{Action}</Button>
</AlertDialog>
```

### 3. Route Addition

**Update `src/manifest.ts`** — add the new route:
```typescript
routes: [
  { path: "/" },
  { path: "/detail/:id" },
  { path: "/create" },
  { path: "/{command-path}/:id" },  // e.g., "/cancel/:id"
],
```

**Update `src/routes.tsx`** — add lazy import and route entry:
```typescript
const {CommandName}Page = lazy(() =>
  import("./pages/{CommandName}Page.js").then((m) => ({ default: m.{CommandName}Page })),
);

// Add to routes array:
{
  path: "/{command-path}/:id",
  element: <{Entity}Suspense><{CommandName}Page /></{Entity}Suspense>,
},
```

### 4. Update Index Exports

**Update `src/index.ts`** — add type and schema re-exports:
```typescript
export type { {CommandName}Input } from "./schemas/{entity}Schemas.js";
export { {CommandName}CommandSchema } from "./schemas/{entity}Schemas.js";
```

### 5. Test File (`src/pages/{CommandName}Page.test.tsx`)

```typescript
import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MockCommandBus } from "@hexalith/cqrs-client";

import { renderWithProviders } from "../testing/renderWithProviders";
import { {CommandName}Page } from "./{CommandName}Page";

describe("{CommandName}Page", () => {
  it("renders the form", () => {
    renderWithProviders(<{CommandName}Page />, { initialRoute: "/{command-path}/test-id" });
    expect(screen.getByText("{Action} {Entity}")).toBeInTheDocument();
  });

  it("shows sending status on submit", async () => {
    const slowBus = new MockCommandBus({ delay: 500, defaultBehavior: "success" });
    renderWithProviders(<{CommandName}Page />, {
      commandBus: slowBus,
      initialRoute: "/{command-path}/test-id",
    });
    // Fill and submit form, verify status message appears
  });

  it("shows error on command failure", async () => {
    const failBus = new MockCommandBus({ delay: 30, defaultBehavior: "reject" });
    renderWithProviders(<{CommandName}Page />, {
      commandBus: failBus,
      initialRoute: "/{command-path}/test-id",
    });
    // Fill and submit form, verify error display
  });
});
```

## Quality Checklist

- [ ] Zod command schema validates all user-provided fields
- [ ] Form page handles all status states: sending, polling, rejected, failed, timedOut
- [ ] `useEffect` watches `status === "completed"` for success toast + navigation
- [ ] `isBusy` derived from status disables submit button
- [ ] Destructive commands use `<AlertDialog>` for confirmation
- [ ] New route added to both `manifest.ts` and `routes.tsx`
- [ ] Lazy import added in `routes.tsx` with `.then(m => ({ default: m.PageName }))`
- [ ] Type and schema re-exports added to `index.ts`
- [ ] All user-facing text uses domain-specific language
- [ ] Import order follows conventions: react → react-router → @hexalith/cqrs-client → @hexalith/ui → types → relative
- [ ] No inline styles, no direct Radix imports, no TypeScript enums

## Anti-Patterns

1. **DO NOT** use `useSubmitCommand` for new commands — prefer `useCommandPipeline` (full lifecycle)
2. **DO NOT** forget `aggregateId` in `send()` — use route param `id` for entity commands, `crypto.randomUUID()` for create commands
3. **DO NOT** skip error/status display — every command page needs status feedback
4. **DO NOT** hardcode route paths — keep manifest and routes.tsx in sync
5. **DO NOT** render UUID fields in forms — they come from route params or auto-generation
