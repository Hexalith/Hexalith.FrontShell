# Story 6.5: Error Monitoring Integration

Status: done

## Story

As a platform operator (Ravi),
I want the shell to capture module error events and expose them for external monitoring,
So that I can integrate with observability tools (Sentry, OpenTelemetry) when they're configured.

## Acceptance Criteria

1. **AC1 — Structured Error Events with Full Context**
   - **Given** a module throws an error caught by the error boundary
   - **When** the shell captures the event
   - **Then** a structured error event is created with: `{ timestamp, moduleName, errorCode, severity, errorMessage, stackTrace, userId, tenantId, route, sessionId, buildVersion, source }`
   - **And** `errorCode` maps to the existing `ModuleErrorClassification` (`chunk-load-failure`, `network-error`, `render-error`)
   - **And** `severity` is derived from classification: `render-error` → `"error"`, others → `"warning"` (retryable conditions are warnings, code bugs are errors)
   - **And** `source` is `"error-boundary"` (distinguishes from global-handler events in AC6)
   - **And** `userId` comes from `useAuth().user?.sub` (or `"anonymous"` if unauthenticated)
   - **And** `tenantId` comes from `useTenant().activeTenant` (or `"none"`)
   - **And** `route` is `window.location.pathname`
   - **And** `sessionId` is a unique per-tab ID generated once at shell startup (UUID v4 or `crypto.randomUUID()`)
   - **And** `buildVersion` comes from `import.meta.env.VITE_APP_VERSION` (or `"dev"` if not set)

2. **AC2 — In-Memory Event Buffer**
   - **Given** the shell captures error events
   - **When** errors accumulate
   - **Then** the in-memory event buffer stores the last 100 events (FIFO eviction)
   - **And** the buffer is accessible via `getModuleErrorLog()` (already exists, update buffer size from 50 to 100)

3. **AC3 — External Monitoring Callback (`onModuleError`)**
   - **Given** the shell exposes an error event API
   - **When** an external monitoring tool is configured
   - **Then** it can subscribe to error events via a shell-level `onModuleError` callback
   - **And** the callback receives the structured error event object
   - **And** the `onModuleError` callback is configured in the shell's initialization (`App` props, not in module code or JSON config)
   - **And** the integration point is documented with example Sentry and console-logger configurations in code comments

4. **AC4 — Default Console Logging**
   - **Given** no monitoring integration is configured (no `onModuleError` callback)
   - **When** module errors occur
   - **Then** errors are logged to the browser console with structured formatting (already implemented via `console.error("[ModuleError]", event)`)
   - **And** the in-memory buffer still captures events for diagnostic purposes

5. **AC5 — Rate Limiting / Deduplication**
   - **Given** rate limiting is applied to error events
   - **When** a module enters a crash loop producing many errors
   - **Then** duplicate error events (same `moduleName` + same `errorCode`) are deduplicated within a 5-second window
   - **And** the buffer does not grow unbounded (capped at 100 events)
   - **And** deduplicated events update a `count` field on the existing event rather than creating new entries

6. **AC6 — Global Unhandled Error Capture**
   - **Given** errors may occur outside React error boundaries (e.g., async errors, promise rejections)
   - **When** a `window.onerror` or `window.onunhandledrejection` event fires
   - **Then** the error is captured as a structured event with `moduleName: "shell"` and `source: "global-handler"` (since we can't attribute it to a specific module)
   - **And** these events flow through the same `onModuleError` callback and buffer
   - **And** operators can filter by `source` to distinguish boundary-caught module errors from unattributed global errors

7. **AC7 — Tests**
   - **Given** unit tests cover the error monitoring system
   - **When** tests run
   - **Then** all existing `moduleErrorEvents.test.ts` tests continue to pass (no regressions)
   - **And** new tests cover: enriched event fields (userId, tenantId, route, sessionId, buildVersion, source, severity), `onModuleError` callback invocation, deduplication within 5-second window (using injected `now()` for deterministic timing), global error capture with `source: "global-handler"`, buffer size increase to 100, re-entrancy guard

## Tasks / Subtasks

- [x] **Task 1: Enrich `ModuleErrorEvent` interface** (AC: #1)
  - [x] 1.1 Update `apps/shell/src/errors/moduleErrorEvents.ts`:
    - Add `ErrorEventSource`, `ErrorSeverity` types and extend `ModuleErrorEvent` interface with new fields:

      ```typescript
      export type ErrorEventSource = "error-boundary" | "global-handler";
      export type ErrorSeverity = "warning" | "error";

      export function classifySeverity(
        classification: ModuleErrorClassification,
      ): ErrorSeverity {
        // chunk-load-failure and network-error are retryable → warning
        // render-error is a code bug → error
        return classification === "render-error" ? "error" : "warning";
      }

      export interface ModuleErrorEvent {
        timestamp: string;
        moduleName: string;
        classification: ModuleErrorClassification;
        errorCode: string; // same as classification, kept for external consumers
        severity: ErrorSeverity; // "warning" for retryable, "error" for code bugs
        errorMessage: string;
        stackTrace: string | undefined;
        componentStack: string | undefined;
        userId: string; // from auth context, "anonymous" if unauthenticated
        tenantId: string; // from tenant context, "none" if not set
        route: string; // window.location.pathname
        sessionId: string; // per-tab UUID, generated once at shell startup
        buildVersion: string; // from VITE_APP_VERSION env var
        source: ErrorEventSource; // "error-boundary" for ModuleErrorBoundary, "global-handler" for window error/rejection
        count: number; // dedup count, default 1
      }
      ```

    - Update `createModuleErrorEvent()` to accept a context parameter and source for the new fields:

      ```typescript
      export interface ErrorEventContext {
        userId: string;
        tenantId: string;
        sessionId: string;
        buildVersion: string;
      }

      export function createModuleErrorEvent(
        moduleName: string,
        error: Error,
        componentStack?: string,
        context?: ErrorEventContext,
        source: ErrorEventSource = "error-boundary",
      ): ModuleErrorEvent {
        const classification = classifyError(error); // call once, assign to both fields
        return {
          timestamp: new Date().toISOString(),
          moduleName,
          classification,
          errorCode: classification,
          severity: classifySeverity(classification),
          errorMessage: error.message,
          stackTrace: error.stack,
          componentStack: componentStack ?? undefined,
          userId: context?.userId ?? "anonymous",
          tenantId: context?.tenantId ?? "none",
          route: typeof window !== "undefined" ? window.location.pathname : "/",
          sessionId: context?.sessionId ?? "unknown",
          buildVersion: context?.buildVersion ?? "dev",
          source,
          count: 1,
        };
      }
      ```

    - **CRITICAL:** The `context` and `source` parameters are optional with sensible defaults so existing callers (ModuleErrorBoundary) don't break before being updated.

  - [x] 1.2 Update `MAX_ERROR_LOG_SIZE` from 50 to 100 (AC: #2)

- [x] **Task 2: Add session ID generation** (AC: #1)
  - [x] 2.1 Create `apps/shell/src/errors/sessionId.ts`:
    ```typescript
    // Generate once per tab — survives SPA navigation, lost on tab close/reload
    export const sessionId: string =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    ```

    - Module-level constant — evaluated once when the module loads
    - Fallback for environments where `crypto.randomUUID` isn't available (older browsers, test environments)

- [x] **Task 3: Add deduplication logic** (AC: #5)
  - [x] 3.1 Update `emitModuleErrorEvent()` in `moduleErrorEvents.ts`:

    ```typescript
    const DEDUP_WINDOW_MS = 5_000;

    // Re-entrancy guard: prevents infinite loop when onModuleError callback
    // throws async (rejected promise → global handler → emitModuleErrorEvent → callback → ...)
    let isEmitting = false;

    /** @internal — for testing only */
    export function _resetEmittingFlag(): void {
      isEmitting = false;
    }

    /** Inject `now` for deterministic dedup testing — avoids vi.useFakeTimers() flakiness */
    export function emitModuleErrorEvent(
      event: ModuleErrorEvent,
      onModuleError?: (event: ModuleErrorEvent) => void,
      now: () => number = Date.now,
    ): void {
      // Re-entrancy guard: break infinite callback → global handler → emit cycles
      if (isEmitting) return;
      isEmitting = true;

      try {
        // Dedup: check if same moduleName + errorCode exists within window
        const currentTime = now();
        const existing = moduleErrorLog.find(
          (e) =>
            e.moduleName === event.moduleName &&
            e.errorCode === event.errorCode &&
            currentTime - new Date(e.timestamp).getTime() < DEDUP_WINDOW_MS,
        );

        if (existing) {
          existing.count += 1;
          // Don't log to console or invoke callback for deduped events
          return;
        }

        // New event
        console.error("[ModuleError]", event);
        moduleErrorLog.push(event);
        if (moduleErrorLog.length > MAX_ERROR_LOG_SIZE) {
          moduleErrorLog.shift();
        }

        // Invoke external callback if configured
        if (onModuleError) {
          try {
            onModuleError(event);
          } catch {
            console.error("[ModuleError] onModuleError callback threw");
          }
        }
      } finally {
        isEmitting = false;
      }
    }
    ```

    - **CRITICAL:** The `onModuleError` callback is wrapped in try/catch — a failing monitoring integration must never crash the shell.
    - **TESTING:** The `now` parameter (defaults to `Date.now`) enables deterministic dedup tests without `vi.useFakeTimers()`. Tests pass a custom `now` function to control time precisely — no flaky timing issues.

- [x] **Task 4: Create `ErrorMonitoringProvider` React context** (AC: #1, #3, #6)
  - [x] 4.1 Create `apps/shell/src/errors/ErrorMonitoringProvider.tsx`:
    - This provider sits high in the component tree (inside ShellProviders, below AuthProvider/TenantProvider so it can read auth/tenant context)
    - It provides the `ErrorEventContext` to `ModuleErrorBoundary` via React context
    - It wires up `window.addEventListener("error", ...)` and `window.addEventListener("unhandledrejection", ...)` for global capture
    - It accepts an optional `onModuleError` callback prop (from RuntimeConfig)

    ```typescript
    import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
    import { useAuth, useTenant } from "@hexalith/shell-api";
    import { sessionId } from "./sessionId";
    import {
      createModuleErrorEvent,
      emitModuleErrorEvent,
      type ErrorEventContext,
      type ModuleErrorEvent,
    } from "./moduleErrorEvents";

    interface ErrorMonitoringContextValue {
      context: ErrorEventContext;
      emit: (event: ModuleErrorEvent) => void;
    }

    // Exported so ModuleErrorBoundary wrapper can use raw useContext() for optional access
    export const ErrorMonitoringContext = createContext<ErrorMonitoringContextValue | null>(null);

    /**
     * Strict version — throws if provider missing. Use in components that REQUIRE monitoring.
     * For ModuleErrorBoundary, use raw useContext() with null fallback instead (see Task 6).
     */
    export function useErrorMonitoring(): ErrorMonitoringContextValue {
      const ctx = useContext(ErrorMonitoringContext);
      if (!ctx) throw new Error("useErrorMonitoring must be used within ErrorMonitoringProvider");
      return ctx;
    }

    interface ErrorMonitoringProviderProps {
      onModuleError?: (event: ModuleErrorEvent) => void;
      children: React.ReactNode;
    }

    export function ErrorMonitoringProvider({
      onModuleError,
      children,
    }: ErrorMonitoringProviderProps): React.JSX.Element {
      const { user } = useAuth();
      const { activeTenant } = useTenant();
      const callbackRef = useRef(onModuleError);
      callbackRef.current = onModuleError;

      const buildVersion = import.meta.env.VITE_APP_VERSION ?? "dev";

      const context: ErrorEventContext = useMemo(
        () => ({
          userId: user?.sub ?? "anonymous",
          tenantId: activeTenant ?? "none",
          sessionId,
          buildVersion,
        }),
        [user?.sub, activeTenant, buildVersion],
      );

      const emit = useMemo(
        () => (event: ModuleErrorEvent) => emitModuleErrorEvent(event, callbackRef.current),
        [],
      );

      // Global error handlers (AC6) — source: "global-handler" distinguishes from boundary-caught errors
      useEffect(() => {
        const handleError = (e: ErrorEvent) => {
          if (e.error instanceof Error) {
            const event = createModuleErrorEvent("shell", e.error, undefined, context, "global-handler");
            emit(event);
          }
        };

        const handleRejection = (e: PromiseRejectionEvent) => {
          const error = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
          const event = createModuleErrorEvent("shell", error, undefined, context, "global-handler");
          emit(event);
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleRejection);
        return () => {
          window.removeEventListener("error", handleError);
          window.removeEventListener("unhandledrejection", handleRejection);
        };
      }, [context, emit]);

      const value = useMemo(() => ({ context, emit }), [context, emit]);

      return (
        <ErrorMonitoringContext.Provider value={value}>
          {children}
        </ErrorMonitoringContext.Provider>
      );
    }
    ```

    - **CRITICAL:** Use `useRef` for the callback to avoid re-registering global handlers when the callback reference changes.
    - **CRITICAL:** `useAuth()` and `useTenant()` must be available — this provider goes INSIDE `AuthProvider`/`TenantProvider` but OUTSIDE the router.

  - [x] 4.2 Create `apps/shell/src/errors/ErrorMonitoringProvider.test.tsx`:
    - Test that context provides correct userId, tenantId, sessionId, buildVersion
    - Test that global error handler captures window errors with `source: "global-handler"`
    - Test that global unhandledrejection handler captures promise rejections with `source: "global-handler"`
    - Test that `onModuleError` callback is invoked when events are emitted
    - Test that callback failure doesn't crash the provider
    - **Test that cleanup removes global listeners on unmount** (critical: leaked listeners across tests = flaky suite)
    - Use `renderWithProviders` pattern: wrap in `MockShellProvider` to provide auth/tenant context

- [x] **Task 5: Wire `ErrorMonitoringProvider` into the shell** (AC: #3, #4)
  - [x] 5.1 Update `apps/shell/src/providers/ShellProviders.tsx`:
    - Import `ErrorMonitoringProvider`
    - Add it inside the provider tree, after `TenantProvider` (needs auth and tenant context)
    - Accept `onModuleError` prop in `ShellProvidersProps` and pass it through

    ```typescript
    // In ShellProvidersProps:
    onModuleError?: (event: ModuleErrorEvent) => void;

    // In the component tree:
    <AuthProvider {...oidcConfig} tenantClaimName={tenantClaimName}>
      <TenantProvider>
        <ErrorMonitoringProvider onModuleError={onModuleError}>
          <InnerProviders backendUrl={backendUrl} signalRHub={signalRHub}>
            {children}
          </InnerProviders>
        </ErrorMonitoringProvider>
      </TenantProvider>
    </AuthProvider>
    ```

  - [x] 5.2 Add `onModuleError` as a prop on `App` component (NOT on `RuntimeConfig` — functions can't serialize to JSON):
    ```typescript
    interface AppProps {
      config: RuntimeConfig;
      onModuleError?: (event: ModuleErrorEvent) => void;
    }
    ```

    - Pass it through `App` → `ShellProviders` → `ErrorMonitoringProvider`
    - Do NOT modify `apps/shell/src/config/types.ts` — `RuntimeConfig` stays JSON-serializable
  - [x] 5.3 Update `apps/shell/src/App.tsx`:
    - Accept `onModuleError` in `AppProps`
    - Pass to `ShellProviders`:
      ```typescript
      <ShellProviders
        oidcConfig={oidcConfig}
        backendUrl={config.commandApiBaseUrl}
        tenantClaimName={config.tenantClaimName}
        onModuleError={onModuleError}
      >
      ```
  - [x] 5.4 Add example integration comment in `apps/shell/src/main.tsx`:

    ```typescript
    // Example: Sentry integration
    // import * as Sentry from "@sentry/browser";
    // const onModuleError = (event: ModuleErrorEvent) => {
    //   Sentry.captureException(new Error(event.errorMessage), {
    //     level: event.severity === "warning" ? "warning" : "error",
    //     tags: { module: event.moduleName, errorCode: event.errorCode, source: event.source },
    //     extra: { ...event },
    //   });
    // };
    //
    // Example: Console logger (default behavior)
    // const onModuleError = (event: ModuleErrorEvent) => {
    //   console.warn("[ExternalMonitor]", JSON.stringify(event));
    // };
    ```

  - [x] 5.5 **Checkpoint:** Run `pnpm turbo build` — verify clean compilation with new provider wired into the shell. Fix any import/type errors before proceeding to the boundary refactor in Task 6.

- [x] **Task 6: Update `ModuleErrorBoundary` to use monitoring context** (AC: #1, #3)
  - [x] 6.1 Update `apps/shell/src/errors/ModuleErrorBoundary.tsx`:
    - **CHALLENGE:** `ModuleErrorBoundary` is a class component (React error boundaries require class components). Class components cannot use hooks like `useErrorMonitoring()`.
    - **SOLUTION:** Create a wrapper that passes the monitoring context via props:

      ```typescript
      // Keep the class component but add context props
      interface ModuleErrorBoundaryProps {
        name: string;
        children: React.ReactNode;
        errorContext?: ErrorEventContext;
        onEmit?: (event: ModuleErrorEvent) => void;
      }

      // In componentDidCatch:
      override componentDidCatch(error: Error, info: React.ErrorInfo): void {
        try {
          const event = createModuleErrorEvent(
            this.props.name,
            error,
            info.componentStack ?? undefined,
            this.props.errorContext,
          );
          if (this.props.onEmit) {
            this.props.onEmit(event);
          } else {
            emitModuleErrorEvent(event);
          }
        } catch {
          console.error("[ModuleErrorBoundary] Failed to emit error event");
        }
      }
      ```

    - Create a functional wrapper component that uses **optional context** (raw `useContext`, NOT the throwing `useErrorMonitoring()`):

      ```typescript
      import { useContext } from "react";
      import { ErrorMonitoringContext } from "./ErrorMonitoringProvider";

      export function ModuleErrorBoundary({
        name,
        children,
      }: { name: string; children: React.ReactNode }): React.JSX.Element {
        // Raw useContext — returns null if ErrorMonitoringProvider is missing.
        // This is intentional: E2E tests, unit tests, and future shell variants
        // may not include the provider. The inner class falls back to direct
        // emitModuleErrorEvent() when onEmit is undefined.
        const monitoring = useContext(ErrorMonitoringContext);
        return (
          <ModuleErrorBoundaryInner
            name={name}
            errorContext={monitoring?.context}
            onEmit={monitoring?.emit}
          >
            {children}
          </ModuleErrorBoundaryInner>
        );
      }
      ```

    - **IMPORTANT:** Rename the class to `ModuleErrorBoundaryInner` and export the functional wrapper as `ModuleErrorBoundary` to preserve the public API. All existing import sites (`routeBuilder.ts`) continue to work without changes.
    - **CRITICAL — DO NOT use `useErrorMonitoring()` in the wrapper.** That hook throws when the provider is missing. The wrapper MUST use raw `useContext(ErrorMonitoringContext)` which returns `null` gracefully. This prevents crashes in:
      - E2E tests (where `ShellProviders.e2e.tsx` may not include `ErrorMonitoringProvider`)
      - Unit tests that render `ModuleErrorBoundary` directly
      - Any future shell variant that omits the provider
    - **FALLBACK behavior:** When `monitoring` is `null`, `errorContext` and `onEmit` are both `undefined`. The inner class component's `componentDidCatch` falls back to `emitModuleErrorEvent(event)` without context enrichment — same as current behavior. Zero regressions.

  - [x] 6.2 Update `apps/shell/src/errors/ModuleErrorBoundary.test.tsx`:
    - **Test strategy:** Existing tests should be updated to test the functional WRAPPER (`ModuleErrorBoundary`), not the inner class (`ModuleErrorBoundaryInner`). The wrapper is the public API — that's what `routeBuilder.ts` renders.
    - Update imports: `ModuleErrorBoundary` now refers to the functional wrapper
    - Add `_resetEmittingFlag()` and `_clearModuleErrorLog()` to `beforeEach` cleanup
    - Add test: render `ModuleErrorBoundary` WITH `ErrorMonitoringProvider` → trigger error → verify enriched event includes userId, tenantId, route, sessionId, buildVersion, `source: "error-boundary"`
    - Add test: render `ModuleErrorBoundary` WITHOUT `ErrorMonitoringProvider` → trigger error → verify fallback to direct `emitModuleErrorEvent()` with default context (userId: "anonymous", etc.) — **must NOT throw**
    - Add test: `onModuleError` callback is invoked when a boundary catches an error (wrap in provider with callback)

- [x] **Task 7: Update exports** (AC: #3)
  - [x] 7.1 Update `apps/shell/src/errors/index.ts`:
    - Add exports for new types and the provider:
      ```typescript
      export {
        ErrorMonitoringProvider,
        ErrorMonitoringContext,
        useErrorMonitoring,
      } from "./ErrorMonitoringProvider";
      export type { ErrorEventContext } from "./moduleErrorEvents";
      export { classifySeverity } from "./moduleErrorEvents";
      export { sessionId } from "./sessionId";
      ```
    - Ensure `ModuleErrorEvent` type export includes new fields (already exported)

- [x] **Task 8: Update existing tests and add new tests** (AC: #7)
  - [x] 8.1 Update `apps/shell/src/errors/moduleErrorEvents.test.ts`:
    - Add `_resetEmittingFlag()` alongside `_clearModuleErrorLog()` in `beforeEach`
    - Update `createModuleErrorEvent` tests to verify new fields
    - Add tests for context parameter (userId, tenantId, etc.)
    - Add deduplication tests (use injected `now()` parameter for deterministic timing):
      - Two events with same moduleName + errorCode within 5s (`now` returns same time) → second increments count, no new entry
      - Two events with same moduleName + errorCode after 5s (`now` returns time + 6000) → two separate entries
      - Two events with different moduleName → two separate entries regardless of timing
    - Update buffer cap test from 50 to 100
    - Add test for `onModuleError` callback parameter in `emitModuleErrorEvent`
    - Add test that callback failure is caught silently
    - Add re-entrancy guard test: calling `emitModuleErrorEvent` while already emitting returns immediately (use `_resetEmittingFlag()` in `beforeEach`)
    - Add `classifySeverity` tests: `render-error` → `"error"`, `chunk-load-failure` → `"warning"`, `network-error` → `"warning"`
  - [x] 8.2 Verify all existing tests still pass (the `context` parameter is optional, so existing test calls should work)

- [x] **Task 9: Verify integration** (AC: all)
  - [x] 9.1 Run `pnpm turbo build` — verify clean compilation
  - [x] 9.2 Run `pnpm turbo test` — verify all tests pass (unit)
  - [x] 9.3 Run `pnpm turbo lint` — verify no lint errors
  - [x] 9.4 Verify no module boundary violations — all changes are in `apps/shell/` only
  - [x] 9.5 Verify the `ModuleErrorEvent` type is exported from `apps/shell/src/errors/index.ts` for consumers

## Dev Notes

### What Already Exists

The error monitoring infrastructure is partially implemented. **DO NOT start from scratch — extend what's there.**

**Existing files in `apps/shell/src/errors/`:**

- `moduleErrorEvents.ts` — `ModuleErrorEvent` interface (6 fields), `classifyError()`, `createModuleErrorEvent()`, `emitModuleErrorEvent()`, `getModuleErrorLog()`, `_clearModuleErrorLog()`. Buffer capped at 50 (needs → 100).
- `moduleErrorEvents.test.ts` — 10 tests covering classification, display messages, event creation, emit/log, buffer cap, snapshot immutability.
- `ModuleErrorBoundary.tsx` — React class component that catches errors and calls `createModuleErrorEvent()` + `emitModuleErrorEvent()`. Uses `ErrorDisplay` from `@hexalith/ui`.
- `ModuleErrorBoundary.test.tsx` — Tests for error boundary rendering and event emission.
- `ShellErrorBoundary.tsx` — Top-level class component for catastrophic shell failures. Logs to console only.
- `ModuleRenderGuard.tsx` — Validates module rendering.
- `ModuleSkeleton.tsx` — Loading fallback.
- `index.ts` — Barrel exports for `ModuleErrorBoundary`, `ModuleRenderGuard`, `ShellErrorBoundary`, `ModuleSkeleton`, `classifyError`, `getModuleErrorLog`, `ModuleErrorEvent` type.

**Current `ModuleErrorEvent` shape (extend, don't replace):**

```typescript
{
  timestamp: string;
  moduleName: string;
  classification: ModuleErrorClassification; // "chunk-load-failure" | "network-error" | "render-error"
  errorMessage: string;
  stackTrace: string | undefined;
  componentStack: string | undefined;
}
```

**Current `emitModuleErrorEvent` behavior:**

- Logs to `console.error("[ModuleError]", event)`
- Pushes to in-memory array (FIFO, cap 50)
- No external callback support
- No deduplication
- No re-entrancy guard

**Shell auth context provides:**

- `useAuth().user?.sub` — user subject identifier (string)
- `useTenant().activeTenant` — current tenant ID (string | null)

**No `sessionId`, `buildVersion`, `source`, or `severity` field exists yet — must be created.**

### Architecture Compliance

**Error boundary hierarchy** [Source: architecture.md, Lines 473-483]:

```
Shell ErrorBoundary (catches catastrophic shell failures)
  └─ Module ErrorBoundary (per module, catches module failures)
       └─ Component renders normally
            └─ useCommandPipeline/useQuery surface errors via hook return value
```

**Error handling decision** [Source: architecture.md, Decision #10]:

> Typed error hierarchy + per-module error boundaries. Structured error types for API errors, validation errors, auth errors, network errors. Shell catches unhandled errors at module boundary.

**Deferred decision** [Source: architecture.md, Deferred Decisions]:

> Remote logging/monitoring: Focus on core platform first. Add structured logging (e.g., Sentry, OpenTelemetry) when production traffic exists — Phase 2.

This story bridges the gap: it doesn't add Sentry/OTel directly but creates the integration point (`onModuleError` callback) so that configuring monitoring later is a one-line change.

**Module boundary rules apply:** All changes are in `apps/shell/` — modules never interact with the monitoring integration.

**FR51 coverage:** "Shell captures module error events and exposes them for external monitoring integration."

### Library/Framework Requirements

- **No new dependencies required.** This story extends existing shell infrastructure.
- `crypto.randomUUID()` — available in all modern browsers and Node 19+. Fallback provided for older environments.
- `window.addEventListener("error", ...)` and `window.addEventListener("unhandledrejection", ...)` — standard Web APIs.
- **@hexalith/shell-api** — `useAuth`, `useTenant` (read-only access to auth/tenant context)
- **vitest** + `@testing-library/react` — for unit tests

### File Structure Requirements

**Files to CREATE:**

```
apps/shell/src/errors/
├── sessionId.ts                          # Per-tab session ID (module-level constant)
├── ErrorMonitoringProvider.tsx            # React context for error monitoring
└── ErrorMonitoringProvider.test.tsx       # Provider tests
```

**Files to MODIFY:**

```
apps/shell/src/errors/moduleErrorEvents.ts     # Enrich ModuleErrorEvent, add dedup, add callback
apps/shell/src/errors/moduleErrorEvents.test.ts # Update for new fields, add dedup tests
apps/shell/src/errors/ModuleErrorBoundary.tsx   # Wire to monitoring context
apps/shell/src/errors/ModuleErrorBoundary.test.tsx # Update for enriched events
apps/shell/src/errors/index.ts                  # Export new types/provider
apps/shell/src/providers/ShellProviders.tsx      # Add ErrorMonitoringProvider to tree
apps/shell/src/App.tsx                          # Accept and pass onModuleError callback
apps/shell/src/main.tsx                         # Add example integration comments
```

**Files to NOT TOUCH:**

- `apps/shell/src/errors/ShellErrorBoundary.tsx` — top-level boundary, separate concern. **Tech debt note:** Shell-level errors currently only go to `console.error`. A future story should wire `ShellErrorBoundary` through the same `onModuleError` callback with `source: "shell-boundary"`. Out of scope for this story (FR51 = module errors).
- `apps/shell/src/errors/ModuleRenderGuard.tsx` — no changes needed
- `apps/shell/src/errors/ModuleSkeleton.tsx` — no changes needed
- `apps/shell/src/config/loadRuntimeConfig.ts` — `onModuleError` is programmatic, not JSON config
- `packages/*` — no package changes needed
- `modules/*` — modules never interact with monitoring
- `.github/workflows/ci.yml` — no CI changes needed

### Testing Requirements

**Unit Tests (Vitest):**

- `moduleErrorEvents.test.ts`: enriched event fields (including `source`), dedup window (using injected `now()` for deterministic timing — no `vi.useFakeTimers()`), callback invocation, callback error handling, buffer cap 100
- `ErrorMonitoringProvider.test.tsx`: context values from auth/tenant, global error capture with `source: "global-handler"`, unhandledrejection capture, callback flow, **verify cleanup removes global listeners** (leaked listeners = flaky suite)
- `ModuleErrorBoundary.test.tsx`: enriched events via monitoring context with `source: "error-boundary"`, **fallback to direct emit without provider** (test with no `ErrorMonitoringProvider` wrapper — must NOT throw)
- Target ≥ 95% coverage (foundation package standard — this is shell infrastructure)

**sessionId in tests:** Do not assert specific `sessionId` values — assert non-empty string. The value is a module-level constant: stable within a test run but not deterministic across runs.

**Test pattern:**

```typescript
// Wrap in MockShellProvider to get auth/tenant context
import { MockShellProvider, createMockAuthContext, createMockTenantContext } from "@hexalith/shell-api";

function renderWithMonitoring(ui: React.ReactElement, onModuleError?: (e: ModuleErrorEvent) => void) {
  return render(
    <MockShellProvider
      authContext={createMockAuthContext({ user: { sub: "test-user", tenantClaims: ["t1"] } })}
      tenantContext={createMockTenantContext({ activeTenant: "t1" })}
    >
      <ErrorMonitoringProvider onModuleError={onModuleError}>
        {ui}
      </ErrorMonitoringProvider>
    </MockShellProvider>
  );
}
```

### Previous Story Intelligence

**Story 6-4 (ready-for-dev):** Creates TenantEditPage, Disable flow, E2E test infrastructure with Playwright. Key context:

- E2E provider swap uses `vite.config.e2e.ts` with resolve.alias — `ShellProviders.e2e.tsx` replaces `ShellProviders.tsx` at build time
- `ShellProviders.tsx` is the central provider composition point — adding `ErrorMonitoringProvider` here is the right approach
- **E2E note:** `ShellProviders.e2e.tsx` does NOT need `ErrorMonitoringProvider`. The `ModuleErrorBoundary` wrapper uses optional context (`useContext` returning `null`) and falls back to direct `emitModuleErrorEvent()`. E2E tests will work without enriched error events — this is acceptable since E2E error monitoring is not a test concern.

**Story 6-3 (done):** Created Tenants module. Dev notes:

- `renderWithProviders.tsx` utility wraps MockShellProvider + CqrsProvider + ToastProvider + MemoryRouter
- Tests use `MockShellProvider` from `@hexalith/shell-api` for auth/tenant context
- 22/22 tests passing, coverage > 80%

**Story 6-1 (done):** CI pipeline — coverage gates: 80% modules, 95% foundation packages

- Pre-existing: `CssLayerSmoke.test.ts` times out — ignore if encountered

### Git Intelligence

Recent commits show:

- `3c45472`: implement tenant management module with CRUD functionality
- `22f217b`: implement ShellErrorBoundary and module error handling
- `0771d18`: implement ModuleErrorBoundary and ModuleSkeleton components with tests

The `ModuleErrorBoundary` and `moduleErrorEvents` infrastructure was created in the error handling story. This story extends it with monitoring capabilities.

### Known Behaviors

**React dev-mode duplicate events:** In React development mode, `componentDidCatch` errors are re-thrown to the global `window.onerror` handler. This means a single module error produces TWO events: one with `source: "error-boundary"` (from `ModuleErrorBoundary`) and one with `source: "global-handler"` (from the re-throw). This is normal dev-mode behavior — production mode does NOT re-throw. Operators can filter by `source` to avoid double-counting. The dedup logic does NOT catch this because the events have different `moduleName` values (module name vs `"shell"`).

### Critical Anti-Patterns to Avoid

1. **DO NOT add Sentry or OpenTelemetry as dependencies** — this story creates the integration point, not the integration itself. External tools are configured by the operator via `onModuleError` callback.
2. **DO NOT modify modules** — error monitoring is shell-level infrastructure. Modules never interact with it.
3. **DO NOT make `RuntimeConfig` non-serializable** — `onModuleError` is a function and can't go in JSON config. It's a programmatic prop on `App`, not a config field.
4. **DO NOT use `window.onerror` assignment** — use `addEventListener` to avoid overwriting other handlers.
5. **DO NOT remove existing `console.error` logging** — it's the default behavior when no external callback is configured.
6. **DO NOT break the existing `ModuleErrorBoundary` public API** — the rename to `ModuleErrorBoundaryInner` + functional wrapper export must preserve the same import path and component name.
7. **DO NOT add monitoring dependencies to `@hexalith/shell-api` or `@hexalith/cqrs-client`** — this is shell-only infrastructure.
8. **DO NOT use `try/catch` around the monitoring callback at the call site** — the `emitModuleErrorEvent` function handles it internally.
9. **DO NOT store error events in localStorage/sessionStorage** — keep them in-memory only (GDPR: minimize persistent client-side data).
10. **DO NOT make `ErrorMonitoringProvider` required for the app to function** — the `ModuleErrorBoundary` wrapper uses raw `useContext(ErrorMonitoringContext)` (returns `null`) and falls back to direct `emitModuleErrorEvent()`. Never use the throwing `useErrorMonitoring()` hook in the wrapper — it crashes when the provider is missing (E2E tests, unit tests, future shell variants). Reserve `useErrorMonitoring()` for components that explicitly require the provider.

### Key Code Patterns to Follow

**Existing `emitModuleErrorEvent` pattern (extend, don't replace):**

```typescript
// Current — keep this working
emitModuleErrorEvent(event);

// New — add optional callback and now() parameters
emitModuleErrorEvent(event, onModuleError);

// In tests — inject deterministic timing
emitModuleErrorEvent(event, undefined, () => fakeTime);
```

**Source field pattern — distinguish error origins:**

```typescript
// ModuleErrorBoundary (default)
createModuleErrorEvent("Tenants", error, componentStack, context); // source defaults to "error-boundary"

// Global handlers
createModuleErrorEvent("shell", error, undefined, context, "global-handler");
```

**Provider nesting order (from App.tsx / ShellProviders.tsx):**

```
ShellErrorBoundary                    ← catches catastrophic failures
  └─ AuthProvider                     ← provides useAuth()
       └─ TenantProvider              ← provides useTenant()
            └─ ErrorMonitoringProvider ← reads auth/tenant, provides monitoring context
                 └─ CqrsProvider      ← CQRS hooks
                      └─ Router       ← routes
                           └─ ModuleErrorBoundary (per module) ← catches module errors
```

**Class component + hooks bridge pattern (OPTIONAL context — never throws):**

```typescript
// Class components can't use hooks — use a functional wrapper with raw useContext
function ModuleErrorBoundary({ name, children }: Props) {
  const monitoring = useContext(ErrorMonitoringContext); // null if provider missing — intentional
  return <ModuleErrorBoundaryInner name={name} errorContext={monitoring?.context} onEmit={monitoring?.emit}>{children}</ModuleErrorBoundaryInner>;
  // When monitoring is null: no enrichment, falls back to direct emitModuleErrorEvent()
}
```

**Import ordering:**

```typescript
// 1. React
// 2. External libraries
// 3. @hexalith packages (shell-api, cqrs-client, ui)
// 4. Relative imports
// 5. CSS modules (last)
```

### Project Structure Notes

- All changes are in `apps/shell/src/errors/` and `apps/shell/src/providers/` — shell infrastructure only
- No new packages or dependencies
- The `ErrorMonitoringProvider` follows the same pattern as other shell providers (AuthProvider, TenantProvider, ThemeProvider)
- The `sessionId` module is a simple constant — no React context needed, just a module-level value

### Architecture Decisions (from story elicitation)

| ADR   | Decision                                                            | Rationale                                                                                                             |
| ----- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| ADR-1 | `onModuleError` as `App` prop, not JSON config                      | Functions can't be serialized in JSON; programmatic prop keeps `RuntimeConfig` clean                                  |
| ADR-2 | `ErrorMonitoringProvider` inside auth/tenant providers              | Needs to read `useAuth().user?.sub` and `useTenant().activeTenant` for event enrichment                               |
| ADR-3 | Functional wrapper around class `ModuleErrorBoundary`               | React error boundaries require class components; hooks require functional components. Wrapper bridges the two.        |
| ADR-4 | In-memory buffer only, no persistence                               | GDPR data minimization — no PII in localStorage. Buffer survives SPA navigation, lost on tab close.                   |
| ADR-5 | 5-second dedup window with count increment                          | Prevents crash loops from flooding monitoring tools while preserving visibility into error frequency                  |
| ADR-6 | Global error handlers for async/promise errors                      | `componentDidCatch` only catches sync render errors. `window.onerror` + `unhandledrejection` capture the rest.        |
| ADR-7 | `source` field on events (`"error-boundary"` vs `"global-handler"`) | Operators need to distinguish module-boundary errors from unattributed async/global errors for filtering and alerting |
| ADR-8 | Injected `now()` parameter for dedup timing                         | Deterministic dedup tests without `vi.useFakeTimers()` — cleaner, no flaky timing. Default `Date.now` for production. |

### References

- [Source: epics.md, Lines 2082-2116] Story 6.5 acceptance criteria
- [Source: architecture.md, Lines 209] Decision #10: Typed error hierarchy + per-module error boundaries
- [Source: architecture.md, Lines 216] Deferred: Remote logging/monitoring → Phase 2
- [Source: architecture.md, Lines 473-483] Error boundary hierarchy
- [Source: architecture.md, Lines 1247-1251] Shell errors directory structure
- [Source: prd.md, FR51] Shell captures module error events and exposes them for external monitoring integration
- [Source: prd.md, Journey 7] Ravi deploys and monitors — error boundary telemetry
- [Source: apps/shell/src/errors/moduleErrorEvents.ts] Existing error event infrastructure
- [Source: apps/shell/src/errors/ModuleErrorBoundary.tsx] Existing error boundary implementation
- [Source: packages/shell-api/src/types.ts] AuthUser, TenantContextValue types

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Build checkpoint after Task 5 passed cleanly
- One lint error (import order in ErrorMonitoringProvider.tsx) — fixed immediately
- One test failure (buffer cap test hit deduplication) — fixed by using unique module names per iteration
- Code review follow-up: global `window.error` events without an `Error` object were not captured; fixed by normalizing message-only events into structured `global-handler` errors and adding regression coverage

### Completion Notes List

- **Task 1+3:** Extended `ModuleErrorEvent` with 9 new fields (errorCode, severity, userId, tenantId, route, sessionId, buildVersion, source, count). Added `ErrorEventContext` interface, `classifySeverity()`, deduplication logic (5s window), re-entrancy guard, `onModuleError` callback support, and injected `now()` for deterministic dedup testing. Buffer size increased from 50 to 100.
- **Task 2:** Created `sessionId.ts` — module-level constant using `crypto.randomUUID()` with fallback for older environments.
- **Task 4:** Created `ErrorMonitoringProvider` React context that reads auth/tenant context and wires up `window.addEventListener("error")` and `window.addEventListener("unhandledrejection")` for global capture. 8 tests covering context values, global error capture, callback invocation, callback failure safety, and listener cleanup on unmount.
- **Task 5:** Wired `ErrorMonitoringProvider` into `ShellProviders` (after TenantProvider, before InnerProviders). Added `onModuleError` prop to `App` and `ShellProviders`. Added example Sentry/console-logger comments in `main.tsx`.
- **Task 6:** Refactored `ModuleErrorBoundary` — renamed class to `ModuleErrorBoundaryInner`, created functional wrapper using raw `useContext(ErrorMonitoringContext)` (returns null gracefully). 3 new tests: enriched events via monitoring context, fallback without provider, callback invocation.
- **Task 7:** Updated `index.ts` barrel exports with `ErrorMonitoringProvider`, `ErrorMonitoringContext`, `useErrorMonitoring`, `classifySeverity`, `ErrorEventContext`, `sessionId`.
- **Task 8:** Updated `moduleErrorEvents.test.ts` — 8 new tests: classifySeverity, context parameters, source parameter, buffer cap 100, callback invocation, callback error handling, dedup within/after window, re-entrancy guard. All existing tests updated to work with new interface.
- **Task 9:** Verified build (clean), tests (224 pass, 0 fail), lint (0 errors), module boundary compliance (all changes in `apps/shell/`), and exports.
- **Review follow-up:** Fixed AC6 edge case for `window.onerror` events that provide only a message without an `Error` object. Added a regression test ensuring message-only global errors are captured as structured `source: "global-handler"` events.

### File List

**New files:**

- `apps/shell/src/errors/sessionId.ts`
- `apps/shell/src/errors/ErrorMonitoringProvider.tsx`
- `apps/shell/src/errors/ErrorMonitoringProvider.test.tsx`

**Modified files:**

- `apps/shell/src/errors/moduleErrorEvents.ts`
- `apps/shell/src/errors/moduleErrorEvents.test.ts`
- `apps/shell/src/errors/ModuleErrorBoundary.tsx`
- `apps/shell/src/errors/ModuleErrorBoundary.test.tsx`
- `apps/shell/src/errors/index.ts`
- `apps/shell/src/providers/ShellProviders.tsx`
- `apps/shell/src/App.tsx`
- `apps/shell/src/main.tsx`

### Change Log

- 2026-03-23: Implemented error monitoring integration (Story 6-5) — enriched ModuleErrorEvent with full context fields, added ErrorMonitoringProvider with global error capture, deduplication, rate limiting, onModuleError callback API, and comprehensive test coverage (224 tests pass).
- 2026-03-23: Code review follow-up — fixed message-only global `window.onerror` capture so all global errors flow through the structured monitoring pipeline.

## Senior Developer Review (AI)

### Review Date

- 2026-03-23

### Reviewer

- GitHub Copilot (GPT-5.4)

### Findings

- **Resolved:** AC6 edge case in `apps/shell/src/errors/ErrorMonitoringProvider.tsx` where `window` `error` events without an `Error` object were dropped.

### Fix Applied

- Normalized message-only `ErrorEvent` payloads into `Error` instances before creating the structured module error event.
- Added regression coverage in `apps/shell/src/errors/ErrorMonitoringProvider.test.tsx` for `window` `error` events without `e.error`.

### Outcome

- All identified high-severity review findings were fixed.
- Story is ready and moved to `done`.
