# Story 1.6: Tenant Switching & Status Bar

Status: done

<!-- Validated: 2026-03-13 — all source artifacts checked, codebase assumptions verified -->

## Story

As an end user,
I want to switch between tenants from the status bar and see operational context (connection health, last command status),
So that I always know which tenant I'm working in and whether the system is healthy.

## Scope Boundaries

### IN Scope

- `StatusBar.tsx` + CSS Module in `apps/shell/src/layout/` — full status bar component replacing the inline placeholder from Story 1.5
- Four status bar segments: tenant context (with switching dropdown), connection health indicator, last command status, and active module display
- Tenant switching: native HTML `<select>` dropdown reading `useTenant().availableTenants`, calling `switchTenant()` — Radix `<Select>` deferred to @hexalith/ui (Epic 3)
- Dirty form state detection: `FormDirtyProvider` context + `useFormDirty()` hook in `@hexalith/shell-api` for cross-component dirty tracking; confirmation dialog on tenant switch when form is dirty
- Connection health: `ConnectionHealthProvider` context + `useConnectionHealth()` hook in `@hexalith/shell-api` — MVP uses HTTP reachability (ping backend health endpoint on load, track success/failure of subsequent requests)
- Connection health visual states: green dot (connected), amber pulse (reconnecting), red dot + text (disconnected)
- Disconnection banner: non-dismissable banner above status bar appearing after 10 seconds of disconnection
- Last command status segment: hardcoded placeholder "—" with `aria-label="No recent commands"` (command bus is Epic 2 scope — hook created when needed, not as a stub)
- Active module segment: hardcoded "Welcome" (module registry is Epic 5 scope — hook created when needed; "Welcome" matches the welcome page content)
- Zero-tenant edge case: if `availableTenants` is empty, show "No tenant" text with disabled select
- Segment dividers: subtle vertical separators between the four segments
- Tenant name truncation at 20 characters with tooltip
- `aria-live` regions for dynamic status updates
- CSS Modules using design tokens exclusively
- Co-located Vitest tests; ATDD: failing tests written BEFORE implementation (Epic 1 mandate)

### OUT of Scope

- Radix `<Select>` for tenant dropdown (@hexalith/ui component — Epic 3; use native HTML `<select>` styled with design tokens)
- SignalR/WebSocket connection monitoring (Phase 2 — MVP uses HTTP reachability)
- Real command bus integration and live last command status (Epic 2 — Story 2.3)
- Module registry and dynamic active module display from manifests (Epic 5 — Stories 5.1-5.2)
- Command palette (Phase 1.5)
- Status bar responsive collapse at narrow viewports (Phase 2)
- `@hexalith/cqrs-client` import (not available yet)
- E2E / Playwright tests (Story 1.8+)

**MVP connection health note:** Connection health in this story is based on HTTP reachability — the shell attempts a lightweight health check against the backend URL on startup and tracks success/failure of subsequent API requests. SignalR-based real-time connection state is Phase 2. When SignalR is added later, the `ConnectionHealthProvider` interface remains the same — only the internal implementation changes.

**Placeholder segments note:** Last command status and active module are architectural placeholders. They render the correct visual segments with hardcoded content ("—" / "Welcome") — no stub hooks are created. Epic 2 and Epic 5 will create `useCommandStatus()` and `useActiveModule()` hooks when they're needed. This prevents layout shifts and establishes the visual contract. Labels are user-facing: "Welcome" matches the welcome page content, "—" is a minimal non-distracting placeholder.

## Dependencies

- **Story 1.1** (Monorepo Scaffold) — `apps/shell/` stub. **Done**
- **Story 1.2** (Design Tokens) — all spacing/color/typography/status tokens. **Done**
- **Story 1.3** (Auth Provider) — `AuthProvider`, `useAuth()`. **Done**
- **Story 1.4** (Tenant, Theme & Locale Providers) — `TenantProvider`, `useTenant()`, `switchTenant()`, `MockShellProvider`. **Done**
- **Story 1.5** (Shell Layout) — `ShellLayout` with inline status bar placeholder, CSS Grid with statusbar area. **Done**
- No external dependencies beyond workspace packages

**Prerequisite check:** Before starting Story 1.6, verify that Story 1.5 implementation files exist in `apps/shell/src/layout/` (ShellLayout.tsx, TopBar.tsx, Sidebar.tsx, ShellLayout.module.css) and `apps/shell/src/providers/ShellProviders.tsx`. If these files do not exist, Story 1.5 must be implemented first — do NOT proceed with 1.6 without them.

## Acceptance Criteria

| AC  | Summary                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | Status bar renders 4 segments: tenant context, connection health, last command status, active module                                        |
| #2  | Status bar is 28px tall, always visible, not collapsible, uses `--color-surface-secondary` background                                       |
| #3  | Tenant segment uses `--font-size-sm` + `--font-weight-medium` + `--color-text-primary` for readability                                      |
| #4  | Tenant dropdown displays all available tenants from `useTenant().availableTenants`; selection calls `switchTenant()`                        |
| #5  | If user has dirty form state, confirmation dialog appears before tenant switch: "Switching tenants will discard unsaved changes. Continue?" |
| #6  | Connection health shows green dot (connected), amber pulse (reconnecting), red dot + "Disconnected" text                                    |
| #7  | After 10 seconds of disconnection, a non-dismissable banner appears above the status bar                                                    |
| #8  | Tenant name truncates at 20 characters with full name on hover tooltip                                                                      |

**Detailed BDD:**

1. **Given** the status bar component is rendered at the bottom of the viewport
   **When** the user inspects it
   **Then** four segments are visible: tenant context, connection health, last command status, and active module
   **And** the status bar is 28px tall, always visible, not collapsible
   **And** the status bar uses `--color-surface-secondary` background and `--font-size-xs` for most segments
   **And** the tenant segment uses `--font-size-sm` + `--font-weight-medium` + `--color-text-primary` for readability

2. **Given** a user has access to multiple tenants
   **When** the user clicks the tenant segment in the status bar
   **Then** a dropdown displays all available tenants from `useTenant().availableTenants`
   **And** if the user has unsaved form data (dirty form state), a confirmation dialog appears: "Switching tenants will discard unsaved changes. Continue?" before updating `TenantProvider` context
   **And** if no unsaved state exists, selecting a different tenant updates `TenantProvider` context immediately
   **And** the tenant name truncates at 20 characters with full name on hover tooltip

3. **Given** the authentication service is unreachable
   **When** the shell detects the failure
   **Then** a diagnostic message is displayed to the user explaining the issue
   **And** the connection health segment shows a red dot with "Disconnected" text

4. **Given** the connection health changes state
   **When** the status transitions
   **Then** connected shows a green dot (quiet register), reconnecting shows an amber pulse (neutral), disconnected shows a red dot + text (urgent register)
   **And** after 10 seconds of disconnection, a non-dismissable banner appears above the status bar
   **And** MVP connection health is based on HTTP reachability (successful/failed API requests), not WebSocket/SignalR state — SignalR is deferred to Phase 2

_FRs covered: FR35, FR38_

## Tasks / Subtasks

### ATDD Phase

- [x] Task 0: Write failing acceptance tests from ACs (AC: #1-#8)
  - [x] 0.1 `layout/StatusBar.test.tsx` — tests for AC #1, #2, #3, #8: four segments render, styling, truncation
  - [x] 0.2 `layout/StatusBar.test.tsx` — tests for AC #4: tenant dropdown renders all tenants, calls switchTenant on selection
  - [x] 0.3 `layout/StatusBar.test.tsx` — tests for AC #5: dirty form state triggers confirmation dialog
  - [x] 0.4 `layout/StatusBar.test.tsx` — tests for AC #6: connection health states render correct indicators
  - [x] 0.5 `layout/StatusBar.test.tsx` — tests for AC #7: disconnection banner appears after 10 seconds
  - [x] 0.6 `providers/ConnectionHealthProvider.test.tsx` — tests for connection health context and state management
  - [x] 0.7 `providers/FormDirtyProvider.test.tsx` — tests for form dirty state tracking
  - [x] 0.8 Verify `pnpm --filter @hexalith/shell test` — all new tests fail (red phase)

### Implementation Phase

- [x] Task 1: Create ConnectionHealthProvider in `@hexalith/shell-api` (AC: #6, #7)
  - [x] 1.1 Create `packages/shell-api/src/connection/ConnectionHealthContext.tsx`
  - [x] 1.2 Define `ConnectionHealth` type: `'connected' | 'reconnecting' | 'disconnected'`
  - [x] 1.3 Define `ConnectionHealthContextValue`: `{ health: ConnectionHealth; lastChecked: Date | null; checkNow: () => void }`
  - [x] 1.4 Implement `ConnectionHealthProvider`: initial health check on mount via `fetch` HEAD request to backend URL, periodic re-check every 30 seconds, pause polling when `document.visibilityState === 'hidden'`, on visibility change to `'visible'` fire an immediate health check (don't wait for next interval — gives instant feedback when user returns to tab)
  - [x] 1.5 On fetch failure: set health to `'reconnecting'`, retry with plain exponential backoff (2s, 4s, 8s, 16s, 30s cap — no jitter needed, single client per tab)
  - [x] 1.6 After 3 consecutive failures: set health to `'disconnected'`
  - [x] 1.7 On fetch success after failure: set health back to `'connected'`
  - [x] 1.8 Create `useConnectionHealth()` hook with context guard error
  - [x] 1.9 Create `packages/shell-api/src/connection/ConnectionHealthContext.test.tsx`
  - [x] 1.10 Export from `packages/shell-api/src/index.ts`
  - [x] 1.11 Add `createMockConnectionHealthContext()` factory to testing utilities

- [x] Task 2: Create FormDirtyProvider in `@hexalith/shell-api` (AC: #5)
  - [x] 2.1 Create `packages/shell-api/src/form/FormDirtyContext.tsx`
  - [x] 2.2 Define `FormDirtyContextValue`: `{ isDirty: boolean; setDirty: (dirty: boolean) => void; dirtyFormId: string | null; setDirtyFormId: (id: string | null) => void }`
  - [x] 2.3 Implement `FormDirtyProvider`: simple React state wrapping dirty tracking
  - [x] 2.4 Create `useFormDirty()` hook with context guard error
  - [x] 2.5 Create `packages/shell-api/src/form/FormDirtyContext.test.tsx`
  - [x] 2.6 Export from `packages/shell-api/src/index.ts`
  - [x] 2.7 Add `createMockFormDirtyContext()` factory to testing utilities
  - [x] 2.8 Update `MockShellProvider` to include `FormDirtyProvider` mock context

- [x] Task 3: Create StatusBar component (AC: #1, #2, #3, #8)
  - [x] 3.1 Create `apps/shell/src/layout/StatusBar.tsx`
  - [x] 3.2 Render four segments in a flexbox row with vertical dividers
  - [x] 3.3 Segment 1 — Tenant: display `useTenant().activeTenant` with 20-char truncation + `title` attribute for tooltip
  - [x] 3.4 Segment 2 — Connection Health: display `useConnectionHealth().health` with colored dot + text label
  - [x] 3.5 Segment 3 — Last Command: hardcoded "—" with `aria-label="No recent commands"` (Epic 2 will replace with real hook)
  - [x] 3.6 Segment 4 — Active Module: hardcoded "Welcome" (Epic 5 will replace with real hook; matches welcome page content)
  - [x] 3.12 Zero-tenant handling: if `availableTenants.length === 0`, show "No tenant" text with disabled select instead of dropdown
  - [x] 3.7 Status bar container: height 28px, `var(--color-surface-secondary)` background, `border-block-start: 1px solid var(--color-border-default)`
  - [x] 3.8 Tenant segment typography: `var(--font-size-sm)`, `var(--font-weight-medium)`, `var(--color-text-primary)`
  - [x] 3.9 Other segments typography: `var(--font-size-xs)`, `var(--color-text-secondary)`
  - [x] 3.10 `role="status"` and `aria-label="Application status bar"` on the status bar container
  - [x] 3.11 Create `StatusBar.module.css` with design tokens only

- [x] Task 4: Implement tenant switching dropdown (AC: #4, #5)
  - [x] 4.1 Add native HTML `<select>` element within the tenant segment (styled with design tokens — Radix Select deferred to Epic 3)
  - [x] 4.2 Populate `<option>` elements from `useTenant().availableTenants`
  - [x] 4.3 On change: if `useFormDirty().isDirty`, show confirmation dialog BEFORE calling `switchTenant()`
  - [x] 4.4 If user confirms: call `useTenant().switchTenant(newTenant)`, then call `useFormDirty().setDirty(false)`
  - [x] 4.5 If user cancels: revert `<select>` value to current `activeTenant` (no switch) — use controlled component pattern: `useState<string>` for displayed value, `useEffect` syncs with `activeTenant`, `onChange` intercepts for dirty check before updating
  - [x] 4.6 `aria-label="Switch tenant"` on the select element
  - [x] 4.8 Zero tenants: if `availableTenants.length === 0`, render disabled select with "No tenant" text (no dropdown interaction)
  - [x] 4.7 Style select to match status bar design tokens: transparent background, no border, matching font

- [x] Task 5: Implement connection health indicator (AC: #6)
  - [x] 5.1 Create colored dot element: 8px circle, uses `--color-status-success` (green), `--color-status-warning` (amber), `--color-status-danger` (red)
  - [x] 5.2 Connected state: green dot, text "Connected" (visually muted)
  - [x] 5.3 Reconnecting state: amber dot with CSS `animation: pulse 1.5s ease-in-out infinite`, text "Reconnecting..."
  - [x] 5.4 Disconnected state: red dot (static), text "Disconnected"
  - [x] 5.5 Add `@media (prefers-reduced-motion: reduce)` to disable pulse animation
  - [x] 5.6 `aria-live="polite"` on the connection health segment for screen reader announcements

- [x] Task 6: Implement disconnection banner (AC: #7)
  - [x] 6.1 Create `DisconnectionBanner.tsx` in `apps/shell/src/layout/` (or inline in StatusBar — decide based on complexity)
  - [x] 6.2 Track disconnection duration: start timer when health becomes `'disconnected'`, clear when health returns to `'connected'` or `'reconnecting'`
  - [x] 6.3 After 10 seconds of `'disconnected'`: render banner above status bar
  - [x] 6.4 Banner text: "Connection lost. Changes may not be saved. Reconnecting..."
  - [x] 6.5 Banner styling: `var(--color-status-danger)` background (or darkened variant), `var(--color-text-inverse)` text, non-dismissable (no close button)
  - [x] 6.6 Banner position: render within the statusbar grid area using flex column layout — the statusbar area becomes `display: flex; flex-direction: column;` with `[DisconnectionBanner?] + [StatusBar]`. This avoids changing the CSS Grid template from Story 1.5. No absolute positioning needed.
  - [x] 6.7 `aria-live="assertive"` on the banner for immediate screen reader announcement
  - [x] 6.8 Auto-hide with 200ms fade-out when connection restores
  - [x] 6.9 `@media (prefers-reduced-motion: reduce)`: instant show/hide, no fade

- [x] Task 7: Update ShellLayout to use StatusBar component
  - [x] 7.1 Replace inline status bar placeholder `<div>` in ShellLayout with `<StatusBar />` component
  - [x] 7.2 Remove useTenant() call from ShellLayout (StatusBar handles it internally)
  - [x] 7.3 Ensure ShellLayout CSS grid statusbar area still works with the component
  - [x] 7.4 Update ShellLayout.test.tsx: replace status bar placeholder assertions with StatusBar component assertions

- [x] Task 8: Update provider hierarchy
  - [x] 8.1 Add `ConnectionHealthProvider` to `ShellProviders.tsx`: wrap AFTER TenantProvider, BEFORE ThemeProvider (or alternatively inside ShellLayout, since it only needs to be available to shell layout components)
  - [x] 8.2 Add `FormDirtyProvider` to `ShellProviders.tsx`: wrap inside ConnectionHealthProvider
  - [x] 8.3 Provider order: AuthProvider → TenantProvider → ConnectionHealthProvider → FormDirtyProvider → ThemeProvider → LocaleProvider. **Rationale:** ConnectionHealth after Tenant because future health checks may need tenant context for scoped endpoints; before Theme because it has no styling dependency. FormDirty after ConnectionHealth because it's a simple state wrapper with no dependencies on anything above.
  - [x] 8.4 Update MockShellProvider to include mock connection health and form dirty contexts
  - [x] 8.5 Update ShellProviders.test.tsx: verify new providers in hierarchy
  - [x] 8.6 Backend URL for health check: add hardcoded dev constant to App.tsx (alongside OIDC config) and pass to ShellProviders as new `backendUrl` prop:
    ```typescript
    // apps/shell/src/App.tsx — add alongside OIDC_DEV_CONFIG
    // Story 1.7 replaces this with runtime /config.json loading
    const BACKEND_DEV_URL = "http://localhost:5000";
    ```
  - [x] 8.7 Update `ShellProvidersProps` to accept `backendUrl: string` and pass it to `ConnectionHealthProvider`

### Validation Phase

- [x] Task 9: Green phase
  - [x] 9.1 `pnpm --filter @hexalith/shell-api test` — all tests pass (87/87, including 13 ConnectionHealth + 7 FormDirty)
  - [x] 9.2 `pnpm --filter @hexalith/shell test` — all tests pass (65/65, including 27 StatusBar)
  - [x] 9.3 `pnpm --filter @hexalith/shell-api build` — builds without errors
  - [x] 9.4 `pnpm --filter @hexalith/shell build` — builds without errors
  - [x] 9.5 `pnpm --filter @hexalith/shell lint` — no ESLint violations
  - [x] 9.6 Skipped (manual): `pnpm dev` browser verification deferred because this remediation pass validated the affected behavior through automated tests/build/lint only
  - [x] 9.7 Verify all CSS uses design tokens — no hardcoded pixel/color/font values

## Dev Notes

### Critical Implementation Checklist

**StatusBar Component (layout/StatusBar.tsx):**

- [ ] Flexbox row: `display: flex; align-items: center; gap: 0;` — segments separated by dividers, not gap
- [ ] Container: height 28px, `var(--color-surface-secondary)` background, `border-block-start: 1px solid var(--color-border-default)`
- [ ] Four segments, each with internal padding `var(--spacing-3)` horizontal
- [ ] Vertical dividers between segments: `1px solid var(--color-border-default)`, full height
- [ ] `role="status"` on outer container — screen readers announce it as a status region
- [ ] `aria-label="Application status bar"` on the container
- [ ] Uses hooks: `useTenant()`, `useConnectionHealth()`, `useFormDirty()`
- [ ] Explicit `React.JSX.Element` return type (DTS generation — Story 1.3 learning)

**Tenant Segment:**

- [ ] Shows `activeTenant` with 20-char truncation: `activeTenant.length > 20 ? activeTenant.slice(0, 20) + '...' : activeTenant`
- [ ] Full name in `title` attribute for native browser tooltip on hover
- [ ] Typography: `var(--font-size-sm)` + `var(--font-weight-medium)` + `var(--color-text-primary)` (promoted readability)
- [ ] `<select>` for switching: transparent background, no visible border, matching font, `cursor: pointer`
- [ ] Select options show FULL tenant names (no truncation in dropdown): `availableTenants.map(t => <option key={t} value={t}>{t}</option>)` — only the displayed selected label truncates at 20 chars
- [ ] If only one tenant available: select is disabled (no switching needed)
- [ ] If zero tenants available (`availableTenants.length === 0`): show "No tenant" text, select is disabled
- [ ] **Controlled component pattern (CRITICAL):** Use `useState<string>` for the displayed select value, NOT the raw `activeTenant`. Sync with `useEffect(() => { setDisplayedTenant(activeTenant ?? ''); }, [activeTenant]);`. On `onChange`, intercept: check dirty state → confirm → call `switchTenant` OR revert `setDisplayedTenant` back. This prevents the native select from visually showing the wrong tenant if the user cancels the confirmation dialog.

**Connection Health Segment:**

- [ ] Dot indicator: 8px `border-radius: 50%` circle
- [ ] Green: `var(--color-status-success)`, label "Connected"
- [ ] Amber: `var(--color-status-warning)`, label "Reconnecting...", pulsing animation
- [ ] Red: `var(--color-status-danger)`, label "Disconnected"
- [ ] Typography: `var(--font-size-xs)` + `var(--color-text-secondary)` (standard for non-tenant segments)
- [ ] `aria-live="polite"` on segment — announces state changes to screen readers

**Pulse Animation:**

```css
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.reconnectingDot {
  animation: pulse 1.5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .reconnectingDot {
    animation: none;
  }
}
```

**Disconnection Banner:**

- [ ] Renders conditionally: only when `health === 'disconnected'` for > 10 seconds
- [ ] Position: rendered inside the statusbar grid area using flex column (`flex-direction: column`). Banner sits above StatusBar. No CSS Grid template changes needed — the statusbar area wrapper becomes a flex container with `[banner?] + [statusbar]`
- [ ] Full-width, auto-height based on content
- [ ] Background: `var(--color-status-danger)`, text: `var(--color-text-inverse, white)`
- [ ] No close button (non-dismissable)
- [ ] `aria-live="assertive"` — immediately announced to screen readers
- [ ] Text: "Connection lost. Cannot reach the backend service. Changes may not be saved. Reconnecting..."
- [ ] Fade transition: 200ms opacity + `@media (prefers-reduced-motion: reduce)` to disable

**Confirmation Dialog (Tenant Switch with Dirty Form):**

- [ ] Use `window.confirm()` for MVP — simple, accessible, no Radix Dialog dependency needed
- [ ] Message: "Switching tenants will discard unsaved changes. Continue?"
- [ ] If confirmed (true): proceed with `switchTenant(newTenant)`, reset dirty state
- [ ] If cancelled (false): revert select value, no switch
- [ ] Alternative for later: Radix AlertDialog when @hexalith/ui is available (Epic 3)
- [ ] **Known UX debt:** `window.confirm()` is a browser-native dialog that cannot be styled. It looks jarring in a premium app. This is an acceptable MVP trade-off — zero dependencies, natively accessible, synchronous flow. Tracked for replacement in Epic 3 when @hexalith/ui provides `AlertDialog`.

### ConnectionHealthProvider Design

```typescript
// packages/shell-api/src/connection/ConnectionHealthContext.tsx

export type ConnectionHealth = "connected" | "reconnecting" | "disconnected";

export interface ConnectionHealthContextValue {
  health: ConnectionHealth;
  lastChecked: Date | null;
  checkNow: () => void;
}

// MVP implementation:
// 1. On mount: fetch HEAD to backend health URL
// 2. On success: health = 'connected'
// 3. On failure (TypeError only — AbortError is not a failure): health = 'reconnecting', start retry with exponential backoff
// 4. After 3 consecutive failures: health = 'disconnected'
// 5. On any success after failure: health = 'connected', reset failure count
// 6. Periodic re-check every 30 seconds (clearInterval on unmount)
// 7. Pause polling when document.visibilityState === 'hidden'
//    On visibility change to 'visible': fire immediate health check (don't wait for next interval)
//    — prevents battery drain when tab is background, gives instant feedback on return
//
// The backend URL is passed as a prop (backendUrl: string)
// Story 1.7 will provide this from runtime /config.json
// For now, ShellProviders passes a hardcoded dev URL

export function ConnectionHealthProvider({
  backendUrl,
  children,
}: {
  backendUrl: string;
  children: React.ReactNode;
}): React.JSX.Element {
  // implementation
}

export function useConnectionHealth(): ConnectionHealthContextValue {
  const ctx = useContext(ConnectionHealthContext);
  if (!ctx)
    throw new Error(
      "useConnectionHealth must be used within ConnectionHealthProvider",
    );
  return ctx;
}
```

**Health Check Strategy:**

- Use `fetch(backendUrl, { method: 'HEAD', mode: 'cors' })` — lightweight, no body
- Timeout: 5 seconds per request (use `AbortController`)
- Plain exponential backoff on failure: `min(baseDelay * 2^attempt, maxDelay)` → 2s, 4s, 8s, 16s, 30s cap
- `baseDelay = 2000ms`, `maxDelay = 30000ms`
- No jitter — only one shell instance per browser tab, no thundering herd risk
- Pause polling when tab is in background: listen for `document.addEventListener('visibilitychange', ...)`, check `document.visibilityState === 'hidden'` to skip scheduled checks, resume on `'visible'`
- **Cleanup (CRITICAL):** `useEffect` return must: `clearInterval(intervalId)`, `controller.abort()` for any in-flight fetch, remove `visibilitychange` listener. All three. Missing any one causes leaks or console errors on unmount.

**Connection health semantics (CRITICAL):**

- **ANY HTTP response (including 4xx, 5xx) means "server is reachable" → health = 'connected'.** Do NOT check `response.ok`. A 503 Service Unavailable proves the TCP connection succeeded — the server exists and responds. Only a `TypeError` thrown by `fetch` (DNS failure, network error, CORS block, timeout) means the server is unreachable.
- **AbortError is NOT a connection failure.** When `AbortController.abort()` is called (on unmount or timeout), `fetch` rejects with `{ name: 'AbortError' }`. In the catch handler: `if (error.name === 'AbortError') return;` — skip silently, do NOT increment failure count.
- **Timing cascade:** First failure → 'reconnecting'. After 3 consecutive failures with exponential backoff (2s + 4s + 8s ≈ 14s) → 'disconnected'. Banner delay: +10 seconds. **Total time from first failure to banner: ~24 seconds.**

**Local dev behavior note:** In local development without a backend running, the health check fails immediately on mount. The status bar shows "Disconnected" and the banner appears after ~24 seconds. This is EXPECTED behavior, not a bug. The dev agent should NOT add a bypass for this — it validates that the connection health system works correctly. Story 1.7 introduces runtime `/config.json` where `commandApiBaseUrl` can be configured per environment.

### FormDirtyProvider Design

```typescript
// packages/shell-api/src/form/FormDirtyContext.tsx

export interface FormDirtyContextValue {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  dirtyFormId: string | null;
  setDirtyFormId: (id: string | null) => void;
}

// Simple React state wrapper
// Modules call setDirty(true) when form data changes, setDirty(false) on save/reset
// StatusBar reads isDirty to gate tenant switching
// dirtyFormId is optional metadata for debugging (which form is dirty)
```

### Provider Hierarchy (Updated)

```
<StrictMode>
  <App>
    <ShellProviders oidcConfig={OIDC_DEV_CONFIG} backendUrl={BACKEND_DEV_URL}>
      <AuthProvider {...oidcConfig}>
        <TenantProvider>
          <ConnectionHealthProvider backendUrl={backendUrl}>
            <FormDirtyProvider>
              <ThemeProvider>
                <LocaleProvider>
                  <AuthGate>
                    <RouterProvider router={router}>
                      <ShellLayout>
                        <header><TopBar /></header>
                        <nav><Sidebar /></nav>
                        <main><Outlet /></main>
                        <div class="statusbarArea">  ← flex column wrapper in statusbar grid area
                          <DisconnectionBanner />   ← conditionally rendered above StatusBar
                          <StatusBar />             ← replaces inline placeholder
                        </div>
                      </ShellLayout>
                    </RouterProvider>
                  </AuthGate>
                </LocaleProvider>
              </ThemeProvider>
            </FormDirtyProvider>
          </ConnectionHealthProvider>
        </TenantProvider>
      </AuthProvider>
    </ShellProviders>
  </App>
</StrictMode>
```

### File Structure

```
apps/shell/src/
├── layout/
│   ├── ShellLayout.tsx                   (MODIFIED — replace inline statusbar with <StatusBar />)
│   ├── ShellLayout.module.css            (MODIFIED — statusbar area becomes flex column for banner)
│   ├── ShellLayout.test.tsx              (MODIFIED — update statusbar assertions)
│   ├── StatusBar.tsx                     (NEW — full status bar component)
│   ├── StatusBar.module.css              (NEW)
│   ├── StatusBar.test.tsx                (NEW)
│   ├── DisconnectionBanner.tsx           (NEW — conditional disconnection warning)
│   ├── DisconnectionBanner.module.css    (NEW)
│   ├── DisconnectionBanner.test.tsx      (NEW)
│   ├── TopBar.tsx                        (UNCHANGED)
│   ├── Sidebar.tsx                       (UNCHANGED)
│   └── ...
├── providers/
│   ├── ShellProviders.tsx                (MODIFIED — add ConnectionHealthProvider + FormDirtyProvider)
│   └── ShellProviders.test.tsx           (MODIFIED — verify new providers)
└── ...

packages/shell-api/src/
├── connection/                           (NEW)
│   ├── ConnectionHealthContext.tsx        (NEW — provider + hook)
│   └── ConnectionHealthContext.test.tsx   (NEW)
├── form/                                 (NEW)
│   ├── FormDirtyContext.tsx              (NEW — provider + hook)
│   └── FormDirtyContext.test.tsx          (NEW)
├── testing/
│   ├── MockShellProvider.tsx             (MODIFIED — add mock connection health + form dirty)
│   ├── createMockConnectionHealthContext.ts (NEW)
│   └── createMockFormDirtyContext.ts     (NEW)
└── index.ts                             (MODIFIED — export new providers + hooks + types)
```

**Modified files summary:**

- `apps/shell/src/layout/ShellLayout.tsx` — replace inline statusbar div with `<StatusBar />`, add `<DisconnectionBanner />`
- `apps/shell/src/layout/ShellLayout.module.css` — statusbar area becomes flex column wrapper: `.statusbarArea { display: flex; flex-direction: column; }` to accommodate conditional DisconnectionBanner above StatusBar
- `apps/shell/src/layout/ShellLayout.test.tsx` — update statusbar assertions
- `apps/shell/src/providers/ShellProviders.tsx` — add ConnectionHealthProvider + FormDirtyProvider to hierarchy
- `apps/shell/src/providers/ShellProviders.test.tsx` — verify new providers render
- `packages/shell-api/src/index.ts` — export new providers, hooks, types, and mock factories
- `packages/shell-api/src/testing/MockShellProvider.tsx` — add mock connection health and form dirty contexts

### Architecture Compliance

| Package            | May Import From                                                                     | MUST NOT Import From                                                 |
| ------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| apps/shell         | react, react-dom, react-router, @hexalith/shell-api, @hexalith/ui (CSS tokens only) | @hexalith/cqrs-client (not yet), direct oidc-client-ts, @radix-ui/\* |
| packages/shell-api | react                                                                               | @radix-ui/\*, oidc-client-ts (already encapsulated in auth/)         |

| Consumer                     | Uses                                                     | Story |
| ---------------------------- | -------------------------------------------------------- | ----- |
| StatusBar                    | `useTenant()`, `useConnectionHealth()`, `useFormDirty()` | 1.6   |
| DisconnectionBanner          | `useConnectionHealth()`                                  | 1.6   |
| ShellProviders               | `ConnectionHealthProvider`, `FormDirtyProvider`          | 1.6   |
| Future: CommandStatusSegment | Hook TBD (Epic 2 creates when needed)                    | 2.3+  |
| Future: ActiveModuleSegment  | Hook TBD (Epic 5 creates when needed)                    | 5.1+  |

### Security

- StatusBar reads from existing auth/tenant contexts — no new token handling
- ConnectionHealthProvider uses `fetch` with `mode: 'cors'` — respects CORS policies
- Health check endpoint is a HEAD request — no sensitive data in response
- `AbortController` prevents request leaks on component unmount
- Confirmation dialog prevents accidental data loss on tenant switch
- No new credentials or secrets introduced

### Testing

**Framework:** Vitest + `@testing-library/react` + jsdom (same as Stories 1.3-1.5). Call `cleanup()` in `afterEach`.

**Mocking strategy:** Use `MockShellProvider` (updated with connection health + form dirty mocks) for StatusBar tests. For provider-specific tests, mock individual dependencies.

**Test cases:**

| #   | Test                                                                                              | AC  |
| --- | ------------------------------------------------------------------------------------------------- | --- |
| 1   | StatusBar renders four segments (tenant, connection, command, module)                             | #1  |
| 2   | StatusBar has 28px height, correct background color class                                         | #2  |
| 3   | StatusBar has `role="status"` and `aria-label`                                                    | #1  |
| 4   | Tenant segment uses promoted typography class                                                     | #3  |
| 5   | Tenant segment displays active tenant name                                                        | #4  |
| 6   | Tenant segment truncates names > 20 chars with `title` tooltip                                    | #8  |
| 7   | Tenant segment shows "No tenant selected" when activeTenant is null                               | #4  |
| 8   | Tenant dropdown renders all available tenants as options                                          | #4  |
| 9   | Selecting a different tenant calls switchTenant() when form is clean                              | #4  |
| 10  | Selecting a different tenant shows confirmation dialog when form is dirty                         | #5  |
| 11  | Confirming dialog on dirty form calls switchTenant() and resets dirty                             | #5  |
| 12  | Cancelling dialog on dirty form does NOT call switchTenant()                                      | #5  |
| 13  | Tenant select is disabled when only one tenant available                                          | #4  |
| 14  | Connection health shows green dot and "Connected" text                                            | #6  |
| 15  | Connection health shows amber dot with pulse and "Reconnecting..." text                           | #6  |
| 16  | Connection health shows red dot and "Disconnected" text                                           | #6  |
| 17  | Connection health segment has `aria-live="polite"`                                                | #6  |
| 18  | DisconnectionBanner appears after 10 seconds of 'disconnected' state                              | #7  |
| 19  | DisconnectionBanner does NOT appear before 10 seconds                                             | #7  |
| 20  | DisconnectionBanner disappears when connection restores                                           | #7  |
| 21  | DisconnectionBanner has `aria-live="assertive"`                                                   | #7  |
| 22  | DisconnectionBanner has no close button (non-dismissable)                                         | #7  |
| 23  | Last command segment shows "—" placeholder with aria-label "No recent commands"                   | #1  |
| 24  | Active module segment shows "Welcome" default                                                     | #1  |
| 25  | Segment dividers render between all four segments                                                 | #1  |
| 26  | ConnectionHealthProvider returns 'connected' on successful health check                           | #6  |
| 27  | ConnectionHealthProvider returns 'reconnecting' on first failure                                  | #6  |
| 28  | ConnectionHealthProvider returns 'disconnected' after 3 failures                                  | #6  |
| 29  | ConnectionHealthProvider recovers to 'connected' on success after failure                         | #6  |
| 30  | FormDirtyProvider tracks dirty state changes                                                      | #5  |
| 31  | Pulse animation has `prefers-reduced-motion: reduce` override                                     | #6  |
| 32  | Tenant segment shows "No tenant" with disabled select when availableTenants is empty              | #4  |
| 33  | ConnectionHealthProvider pauses polling when tab is hidden, resumes on visible                    | #6  |
| 34  | ConnectionHealthProvider cleans up interval, abort controller, and visibility listener on unmount | #6  |
| 35  | Controlled select reverts displayed value when confirmation is cancelled                          | #5  |
| 36  | ConnectionHealthProvider treats AbortError as no-op (not a failure)                               | #6  |
| 37  | ConnectionHealthProvider treats HTTP 503 response as 'connected' (server reachable)               | #6  |
| 38  | ConnectionHealthProvider fires immediate check on tab visibility return                           | #6  |
| 39  | Dropdown options show full tenant names (no truncation in option list)                            | #4  |

**Key test patterns:**

```typescript
// StatusBar tests — use MockShellProvider with connection health + form dirty mocks
import {
  MockShellProvider,
  createMockAuthContext,
  createMockTenantContext,
  createMockConnectionHealthContext,
  createMockFormDirtyContext
} from '@hexalith/shell-api';

function renderStatusBar(overrides?: {
  tenantContext?: Partial<TenantContextValue>;
  connectionHealth?: Partial<ConnectionHealthContextValue>;
  formDirty?: Partial<FormDirtyContextValue>;
}) {
  return render(
    <MockShellProvider
      tenantContext={createMockTenantContext(overrides?.tenantContext)}
      connectionHealthContext={createMockConnectionHealthContext(overrides?.connectionHealth)}
      formDirtyContext={createMockFormDirtyContext(overrides?.formDirty)}
    >
      <StatusBar />
    </MockShellProvider>
  );
}

// Test tenant truncation
it('truncates tenant name at 20 characters with tooltip', () => {
  renderStatusBar({
    tenantContext: { activeTenant: 'A Very Long Tenant Name That Exceeds Limit' },
  });
  const tenantLabel = screen.getByText('A Very Long Tenant N...');
  expect(tenantLabel).toHaveAttribute('title', 'A Very Long Tenant Name That Exceeds Limit');
});

// Test dirty form confirmation
it('shows confirmation dialog when switching tenant with dirty form', async () => {
  const switchTenant = createMockFn();
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

  renderStatusBar({
    tenantContext: {
      activeTenant: 'tenant-a',
      availableTenants: ['tenant-a', 'tenant-b'],
      switchTenant,
    },
    formDirty: { isDirty: true },
  });

  const select = screen.getByLabelText('Switch tenant');
  fireEvent.change(select, { target: { value: 'tenant-b' } });

  expect(confirmSpy).toHaveBeenCalledWith(
    'Switching tenants will discard unsaved changes. Continue?'
  );
  expect(switchTenant.callCount).toBe(0); // cancelled — no switch

  confirmSpy.mockRestore();
});

// Test disconnection banner timing
// NOTE: Wrap timer advances in act() to avoid React state update warnings
it('shows disconnection banner after 10 seconds', async () => {
  vi.useFakeTimers();

  renderStatusBar({
    connectionHealth: { health: 'disconnected' },
  });

  expect(screen.queryByText(/Connection lost/)).not.toBeInTheDocument();

  await act(async () => {
    vi.advanceTimersByTime(10_000);
  });

  expect(screen.getByText(/Connection lost/)).toBeInTheDocument();
  expect(screen.getByText(/Connection lost/).closest('[aria-live]'))
    .toHaveAttribute('aria-live', 'assertive');

  vi.useRealTimers();
});

// ConnectionHealthProvider tests — mock fetch AND AbortController
// CRITICAL: Mock global.fetch in beforeEach, restore in afterEach
// AbortController is available in jsdom but verify — if not, polyfill in test setup
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

it('sets health to connected on successful health check', async () => {
  const { result } = renderHook(() => useConnectionHealth(), {
    wrapper: ({ children }) => (
      <ConnectionHealthProvider backendUrl="http://localhost:5000">
        {children}
      </ConnectionHealthProvider>
    ),
  });

  await waitFor(() => {
    expect(result.current.health).toBe('connected');
  });
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:5000',
    expect.objectContaining({ method: 'HEAD' })
  );
});
```

### Previous Story Intelligence

**From Story 1.5 (Shell Layout):**

- ShellLayout uses CSS Grid with `grid-template-areas: "header header" "sidebar main" "statusbar statusbar"`
- Inline status bar placeholder: `<div>` in statusbar grid area showing `Tenant: {activeTenant}`
- Status bar area styled: height 28px, `var(--color-surface-secondary)` background, `border-block-start: 1px solid var(--color-border-default)`
- Tenant text in placeholder uses promoted typography: `var(--font-size-sm)` + `var(--font-weight-medium)` + `var(--color-text-primary)`
- `aria-label="Status bar"` on placeholder div
- ShellLayout calls `useTenant()` for the placeholder — StatusBar component will take over this responsibility

**From Stories 1.3-1.4 (Providers):**

- Context+Provider pattern: context and provider in same file, hook in same file with context guard
- Explicit `React.JSX.Element` return types for DTS generation
- `MockShellProvider` wraps all mock contexts — must be extended for new providers
- `createMockFn<TArgs, TReturn>()` helper used instead of `vi.fn` in some test utilities
- `cleanup()` in `afterEach` is mandatory
- Provider nesting order matters — Auth first (reads OIDC), Tenant second (reads auth claims)

**Codebase facts:**

- `packages/shell-api/src/index.ts` exports Auth, Tenant, Theme, Locale providers + hooks + types + testing utilities
- `TenantProvider` already implements `useTenant()` with `activeTenant`, `availableTenants`, `switchTenant()`
- `switchTenant()` validates tenant exists before switching
- All design tokens are in `packages/ui/src/tokens/` — colors, spacing, typography, motion
- Status color tokens exist: `--color-status-success`, `--color-status-warning`, `--color-status-danger`
- Shell app dependencies already include: `@hexalith/shell-api`, `react-router`, `@testing-library/react`, `@testing-library/jest-dom`
- No new npm dependencies needed for Story 1.6

### Git Intelligence

Recent commits: `536092c feat(shell): implement shell application layout and authentication flow` — this is Story 1.5 implementation. Story 1.6 builds directly on this foundation. No merge conflicts expected since we're adding new files and modifying the StatusBar area only.

### CSS Module Pattern

```css
/* StatusBar.module.css */
.statusBar {
  display: flex;
  align-items: center;
  height: 28px;
  background: var(--color-surface-secondary);
  border-block-start: 1px solid var(--color-border-default);
}

.segment {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding-inline: var(--spacing-3);
  height: 100%;
}

.segment + .segment {
  border-inline-start: 1px solid var(--color-border-default);
}

/* Use explicit class concatenation in JSX: className={`${styles.segment} ${styles.tenantSegment}`} */
/* Avoids CSS Module `composes` which has inconsistent bundler support */
.tenantSegment {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.defaultSegment {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.tenantSelect {
  appearance: none;
  background: transparent;
  border: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.tenantSelect:disabled {
  cursor: default;
  opacity: 0.7;
}

.healthDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Use explicit class concatenation: className={`${styles.healthDot} ${styles.healthDotConnected}`} */
.healthDotConnected {
  background: var(--color-status-success);
}

.healthDotReconnecting {
  background: var(--color-status-warning);
  animation: pulse 1.5s ease-in-out infinite;
}

.healthDotDisconnected {
  background: var(--color-status-danger);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .healthDotReconnecting {
    animation: none;
  }
}
```

```css
/* DisconnectionBanner.module.css */
.banner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-status-danger);
  color: white;
  font-size: var(--font-size-sm);
  text-align: center;
  transition: opacity 200ms ease-out;
}

/* Use explicit class concatenation: className={`${styles.banner} ${styles.bannerHidden}`} */
.bannerHidden {
  opacity: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .banner {
    transition: none;
  }
}
```

**CSS Rules (same as Story 1.5):**

- Use logical properties: `border-block-start` not `border-top`, `border-inline-start` not `border-left`, `padding-inline` not `padding-left/right`
- All values from design tokens — no hardcoded `#hex`, `px`, or font values
- CSS Modules scoping prevents class name collisions
- No `!important` — CSS Modules specificity is sufficient
- CSS Module styles are intentionally UN-layered — they win over `@layer` styles per CSS spec

### Accessibility

- [ ] StatusBar: `role="status"` + `aria-label="Application status bar"`
- [ ] Connection health segment: `aria-live="polite"` — announces state changes
- [ ] Disconnection banner: `aria-live="assertive"` — immediately announced
- [ ] Tenant select: `aria-label="Switch tenant"`, keyboard accessible (Tab, Enter, Arrow keys natively)
- [ ] All text content (no icon-only elements) — "Connected", "Reconnecting...", "Disconnected" are text labels
- [ ] Focus ring on tenant select: `outline: 2px solid var(--color-accent-default); outline-offset: 2px` (or design token equivalent)
- [ ] Pulse animation disabled via `prefers-reduced-motion: reduce`
- [ ] Tab order: tenant select is focusable in logical order within the status bar

### Project Structure Notes

- StatusBar replaces the inline placeholder in ShellLayout's statusbar grid area — no structural change to the CSS Grid
- DisconnectionBanner may need a new grid row between main and statusbar, OR can be absolutely positioned relative to ShellLayout — prefer absolute positioning to avoid CSS Grid row changes
- New providers (ConnectionHealthProvider, FormDirtyProvider) follow the same pattern established in Stories 1.3-1.4
- `@hexalith/shell-api` barrel exports grow — maintain alphabetical organization with category comments

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6] — Story user statement, ACs, FRs covered (FR35, FR38)
- [Source: _bmad-output/planning-artifacts/architecture.md#StatusBar] — StatusBar position in shell layout, shell-owned chrome
- [Source: _bmad-output/planning-artifacts/architecture.md#TenantProvider] — Tenant context design, switchTenant, cache invalidation
- [Source: _bmad-output/planning-artifacts/architecture.md#ConnectionHealth] — MVP HTTP reachability, Phase 2 SignalR deferral
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#StatusBar] — Status bar segments, visual design, emotional registers
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Behavior] — Disconnection banner, non-dismissable, 10-second delay
- [Source: _bmad-output/planning-artifacts/prd.md#FR35] — Tenant switching requirement
- [Source: _bmad-output/planning-artifacts/prd.md#FR38] — Connection state and status bar requirement
- [Source: _bmad-output/implementation-artifacts/1-5-shell-application-layout-and-auth-flow.md] — ShellLayout CSS Grid, inline statusbar placeholder, provider patterns, CSS Module patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed fake timer + waitFor deadlock in ConnectionHealthProvider tests by avoiding `waitFor` with `vi.useFakeTimers()` and using `vi.advanceTimersByTimeAsync` + `act()` instead
- Fixed `getByText` duplicate matches for tenant name appearing in both `<span>` and `<option>` — used `getAllByText` instead
- Fixed `toBeInTheDocument()` not available in shell app test setup (no `@testing-library/jest-dom` imported) — used `toBeTruthy()` / `toBeNull()` matching existing patterns

### Completion Notes List

- ✅ ConnectionHealthProvider: HTTP reachability-based health checking with exponential backoff (2s/4s/8s/16s/30s cap), visibility-aware polling (pauses when hidden, immediate check on return), AbortController cleanup on unmount, treats any HTTP response as "connected" (reachable)
- ✅ FormDirtyProvider: Simple React state wrapper for cross-component dirty form tracking with formId metadata
- ✅ StatusBar: 4 segments (tenant, connection health, command placeholder, module placeholder) with CSS Module design token styling, role="status", aria-label, 28px height
- ✅ Tenant switching: Controlled `<select>` with dirty form confirmation via `window.confirm()`, 20-char truncation with title tooltip, disabled when single or zero tenants
- ✅ Connection health indicator: colored dots (green/amber/red) with text labels, pulse animation on reconnecting with `prefers-reduced-motion` support, `aria-live="polite"`
- ✅ Disconnection banner: 10-second delay, non-dismissable, `aria-live="assertive"`, 200ms fade-out on restore, `prefers-reduced-motion` support
- ✅ Provider hierarchy: Auth → Tenant → ConnectionHealth → FormDirty → Theme → Locale
- ✅ MockShellProvider updated with ConnectionHealthContext and FormDirtyContext support
- ✅ All CSS uses design tokens — no hardcoded colors/fonts/spacing in the remediated files; banner text now uses `var(--color-text-inverse, white)` fallback
- ✅ Senior review remediation: timeout-driven `AbortError`s now count as failures, the status bar area can grow to fit the banner, disconnect copy is diagnostic, and the missing `statusbarArea` CSS class is present

## Senior Developer Review (AI)

### Review Outcome

- **Result:** Approved after remediation
- **Severity addressed:** 1 high, 3 medium

### Findings Resolved

- Timeouts in `ConnectionHealthProvider` now transition through failure states correctly instead of being silently ignored as generic aborts.
- The shell status-bar grid row now auto-sizes so the disconnection banner is rendered without clipping.
- The banner copy now explicitly states that the backend service cannot be reached, satisfying the diagnostic-message requirement.
- `StatusBar.module.css` now includes the previously referenced `statusbarArea` wrapper class.

### Validation Performed

- `pnpm --filter @hexalith/shell-api test` ✅ (87/87)
- `pnpm --filter @hexalith/shell test` ✅ (65/65)
- `pnpm --filter @hexalith/shell-api build` ✅
- `pnpm --filter @hexalith/shell build` ✅
- `pnpm --filter @hexalith/shell lint` ✅
- Manual `pnpm dev` browser verification intentionally skipped in this automated remediation pass

### Change Log

- 2026-03-13: Story 1.6 implementation — Tenant switching & status bar with connection health, form dirty tracking, and disconnection banner
- 2026-03-13: Senior review remediation — fixed timeout handling in connection health, allowed the status bar area to grow for the disconnection banner, added missing `statusbarArea` styling, improved disconnect diagnostics, and added regression coverage for timeout-driven disconnection

### File List

**New files:**

- `packages/shell-api/src/connection/ConnectionHealthContext.tsx` — ConnectionHealthProvider + useConnectionHealth hook
- `packages/shell-api/src/connection/ConnectionHealthContext.test.tsx` — 12 tests for health check lifecycle
- `packages/shell-api/src/form/FormDirtyContext.tsx` — FormDirtyProvider + useFormDirty hook
- `packages/shell-api/src/form/FormDirtyContext.test.tsx` — 7 tests for dirty state tracking
- `packages/shell-api/src/testing/createMockConnectionHealthContext.ts` — Mock factory
- `packages/shell-api/src/testing/createMockFormDirtyContext.ts` — Mock factory
- `apps/shell/src/layout/StatusBar.tsx` — Full status bar component with 4 segments
- `apps/shell/src/layout/StatusBar.module.css` — CSS Module with design tokens
- `apps/shell/src/layout/StatusBar.test.tsx` — 27 tests covering AC #1-#8
- `apps/shell/src/layout/DisconnectionBanner.tsx` — Conditional disconnection warning
- `apps/shell/src/layout/DisconnectionBanner.module.css` — CSS Module with fade transition

**Modified files:**

- `packages/shell-api/src/types.ts` — Added ConnectionHealth, ConnectionHealthContextValue, FormDirtyContextValue types
- `packages/shell-api/src/index.ts` — Added exports for new providers, hooks, types, and mock factories
- `packages/shell-api/src/testing/MockShellProvider.tsx` — Added ConnectionHealthContext + FormDirtyContext providers
- `apps/shell/src/layout/ShellLayout.tsx` — Replaced inline statusbar placeholder with `<StatusBar />`, removed useTenant() import
- `apps/shell/src/layout/ShellLayout.module.css` — Statusbar area changed to flex column for banner + statusbar
- `apps/shell/src/layout/ShellLayout.test.tsx` — Updated statusbar assertions for StatusBar component
- `apps/shell/src/layout/DisconnectionBanner.tsx` — Updated disconnect message to explicitly identify backend reachability failure
- `apps/shell/src/layout/DisconnectionBanner.module.css` — Replaced hardcoded banner text color with `var(--color-text-inverse, white)` fallback
- `apps/shell/src/layout/StatusBar.module.css` — Added missing `statusbarArea` wrapper class used by `StatusBar.tsx`
- `apps/shell/src/providers/ShellProviders.tsx` — Added ConnectionHealthProvider + FormDirtyProvider, added backendUrl prop
- `apps/shell/src/providers/ShellProviders.test.tsx` — Added verification for new providers in hierarchy
- `apps/shell/src/App.tsx` — Added BACKEND_DEV_URL constant, passed backendUrl to ShellProviders
- `apps/shell/src/App.test.tsx` — Added mocks for ConnectionHealthProvider, FormDirtyProvider, and their hooks
- `packages/shell-api/src/connection/ConnectionHealthContext.tsx` — Treats timeout-triggered aborts as failures while still ignoring cleanup aborts
- `packages/shell-api/src/connection/ConnectionHealthContext.test.tsx` — Added regression test covering three consecutive request timeouts
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story status to done
