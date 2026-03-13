# Story 1.3: Shell API — Authentication Provider

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a module developer,
I want to access authenticated user information through shell-provided context,
So that I never handle tokens directly and authentication is completely invisible to my module code.

## Scope Boundaries

### IN Scope

- `AuthProvider` component in `packages/shell-api/src/auth/AuthProvider.tsx` — wraps `react-oidc-context`
- `useAuth` hook in `packages/shell-api/src/auth/useAuth.ts` — returns typed `{ user, isAuthenticated, isLoading }`
- Auth types in `packages/shell-api/src/types.ts` — `AuthContextValue` (`user`, `isAuthenticated`, `isLoading`, `error`), `AuthUser` with `sub` and tenant claims
- OIDC configuration consumed from props (runtime `/config.json` integration happens in Story 1.7; shell app wiring in Story 1.5)
- Silent token refresh via iframe — non-destructive to React tree
- Descriptive error when `useAuth()` called outside `AuthProvider`
- Token remains accessible internally via `react-oidc-context` for future HTTP request injection by `@hexalith/cqrs-client` (Story 2.2 defines the access pattern)
- Named exports `AuthProvider` and `useAuth` from `packages/shell-api/src/index.ts`
- Co-located Vitest tests for AuthProvider and useAuth
- **ATDD:** Failing acceptance tests written from ACs BEFORE implementation (Epic 1 mandate from Story 1.3 onward)

### OUT of Scope

- TenantProvider, ThemeProvider, LocaleProvider (Story 1.4)
- Shell application wiring / provider hierarchy composition (Story 1.5)
- Runtime `/config.json` loading (Story 1.7) — this story receives OIDC config as props
- Logout flow UI (Story 1.5) — AuthProvider exposes `signoutRedirect` but shell app uses it
- HTTP client token injection via ky (Story 2.2)
- MockShellProvider / createMockAuthContext test utilities — only create what's needed for THIS story's tests; full test utilities come with Story 1.4
- Status bar connection health (Story 1.6)
- Any UI components — this is a pure provider/hook package story

## Dependencies

- **Story 1.1** (Monorepo Scaffold) — provides `packages/shell-api/` stub with `package.json`, `tsup.config.ts`, `vitest.config.ts`, empty `src/index.ts`. **Status: done**
- **Story 1.2** (Design Tokens) — no direct dependency, but runs in parallel track. **Status: review**
- **No blocking dependencies** — this story can proceed immediately

## Acceptance Criteria

1. **Given** the `@hexalith/shell-api` package is created with `AuthProvider` and `useAuth` hook
   **When** a module developer calls `useAuth()` inside a component wrapped by `AuthProvider`
   **Then** the hook returns `{ user, isAuthenticated, isLoading }` with typed user information including `sub` (user ID) and tenant claims
   **And** the `AuthProvider` wraps `react-oidc-context` with `oidc-client-ts` for provider-agnostic OIDC

2. **Given** the user is not authenticated
   **When** the `AuthProvider` detects no valid session
   **Then** the user is redirected to the OIDC provider login page

3. **Given** the user has an active session with an expiring token
   **When** silent token refresh occurs via iframe
   **Then** the refresh is non-destructive: no navigation, no page reload, no React tree remount
   **And** in-progress form data, scroll position, and component state survive the refresh

4. **Given** a module developer calls `useAuth()` outside of `AuthProvider`
   **When** the hook is invoked
   **Then** it throws a descriptive error: "useAuth must be used within AuthProvider"

5. **Given** the `@hexalith/shell-api` package is built
   **When** inspecting the public API
   **Then** `AuthProvider` and `useAuth` are named exports from `src/index.ts`
   **And** the auth token is available internally for injection into HTTP requests (not exposed to modules)
   **And** the package has co-located Vitest tests that pass

## Tasks / Subtasks

- [x] Task 0: Write failing acceptance tests from ACs (ATDD — mandatory from Story 1.3 onward) (AC: #1-#5)
  - [x] 0.1 Create `packages/shell-api/src/auth/AuthProvider.test.tsx` with test cases for all 5 ACs — tests MUST fail before implementation
  - [x] 0.2 Verify `pnpm test` runs and tests fail as expected (red phase)
- [x] Task 1: Add dependencies to `@hexalith/shell-api` (AC: #1)
  - [x] 1.1 Add `oidc-client-ts` and `react-oidc-context` as `peerDependencies` AND `devDependencies` in `packages/shell-api/package.json`
  - [x] 1.2 Add `@testing-library/react` and `@testing-library/jest-dom` as devDependencies for tests
  - [x] 1.3 Run `pnpm install` to resolve dependencies
- [x] Task 2: Define auth types (AC: #1, #5)
  - [x] 2.1 Create `packages/shell-api/src/types.ts` with `AuthContextValue` interface (`user`, `isAuthenticated`, `isLoading`, `error`) and `AuthUser` type (including `sub`, tenant claims)
  - [x] 2.2 Ensure `AuthUser` includes `tenantClaims: string[]` derived from `user.profile['eventstore:tenant']` — Story 1.4 TenantProvider reads this
- [x] Task 3: Implement AuthProvider component (AC: #1, #2, #3)
  - [x] 3.1 Create `packages/shell-api/src/auth/AuthProvider.tsx` wrapping `react-oidc-context` `AuthProvider`
  - [x] 3.2 Configure `automaticSilentRenew: true` and `validateSubOnSilentRenew: true` for iframe-based silent refresh
  - [x] 3.3 Implement `onSigninCallback` to clean up URL after OIDC redirect (prevent auth params in URL)
  - [x] 3.4 Map `react-oidc-context` state to our `AuthContextValue` — thin facade, NOT re-implementation:
    - 3.4a Validate `user.profile.sub` exists before mapping to `AuthUser`. If missing, log `"OIDC token missing required 'sub' claim — backend will reject all requests. Check OIDC provider configuration."` and set `user` to `null` / `isAuthenticated` to `false`. Surface via `error` field (Story 1.5 shows diagnostics). Do NOT crash the app.
    - 3.4b Normalize tenant claims: `user.profile['eventstore:tenant']` missing → `[]`, string → `[string]`, array → as-is
    - 3.4c Multi-tab logout is handled by oidc-client-ts `monitorSession` (default: `true`) — no additional code needed
- [x] Task 4: Implement useAuth hook (AC: #1, #4)
  - [x] 4.1 Create `packages/shell-api/src/auth/useAuth.ts` consuming auth context
  - [x] 4.2 Implement `null` check with descriptive error throw: "useAuth must be used within AuthProvider"
  - [x] 4.3 Return typed `AuthContextValue` with `user`, `isAuthenticated`, `isLoading`, `error`
- [x] Task 5: Update barrel exports (AC: #5)
  - [x] 5.1 Update `packages/shell-api/src/index.ts` to export `AuthProvider`, `useAuth`, and public types (`AuthContextValue`, `AuthUser`). Do NOT export `AuthContext` — it's internal.
  - [x] 5.2 Do NOT export `AuthContext` or internal auth internals — only public types and components
- [x] Task 6: Green phase — make tests pass (AC: #1-#5)
  - [x] 6.1 Run `pnpm test` — all acceptance tests from Task 0 should now pass
  - [x] 6.2 Run `pnpm build` — package builds successfully with new exports
  - [x] 6.3 Run `pnpm lint` — no ESLint violations
- [x] Task 7: Verify integration (AC: #1-#5)
  - [x] 7.1 Verify `pnpm build` produces `dist/index.js` and `dist/index.d.ts` with correct exports
  - [x] 7.2 Verify `AuthProvider` and `useAuth` are in the public type declarations
  - [x] 7.3 Verify `oidc-client-ts` and `react-oidc-context` are NOT re-exported (opaque to consumers)

## Dev Notes

### Technical Requirements

- **Package:** `@hexalith/shell-api` in `packages/shell-api/`
- **ATDD Mandate:** Epic 1 requires all stories from 1.3 onward to begin with failing acceptance tests written from ACs before implementation. Write tests FIRST, verify they fail, then implement.
- **Facade Pattern:** `AuthProvider` is a thin wrapper around `react-oidc-context`. Do NOT re-implement OIDC logic. Delegate to the library and map its state to our typed interface.
- **CRITICAL — Do NOT create a separate React context:** Do NOT wrap `react-oidc-context` in a custom `AuthContext` that caches state. Instead, have `useAuth()` call `react-oidc-context`'s `useAuth()` internally and map the result on every render. This ensures re-renders happen automatically when `react-oidc-context` updates after silent refresh. Creating a separate context that snapshots the initial state will cause stale user data after token refresh.
- **Token Opacity:** Auth tokens MUST NOT be exposed in the public API. Module developers call `useAuth()` and get `{ user, isAuthenticated, isLoading }`. The raw token is only accessible internally for `@hexalith/cqrs-client` to inject into HTTP headers (Story 2.2).
- **Silent Refresh:** `oidc-client-ts` handles silent refresh automatically via iframe when `automaticSilentRenew: true`. React context updates via `react-oidc-context` events — no page reload, no remount.
- **Session Storage:** `oidc-client-ts` defaults to `sessionStorage` for token storage. This is correct (more secure than localStorage, cleared on tab close). Do NOT change to localStorage.
- **tsup Externalization:** tsup auto-externalizes `peerDependencies` — no manual `external` array needed. Since `oidc-client-ts` and `react-oidc-context` are `peerDependencies` (matching `react`/`react-dom` pattern), tsup excludes them from the bundle automatically. **No changes to `tsup.config.ts` are required** — the existing config from Story 1.1 works as-is:

```typescript
// packages/shell-api/tsup.config.ts — NO CHANGES NEEDED (Story 1.1 stub is correct)
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  // peerDependencies (react, react-dom, oidc-client-ts, react-oidc-context)
  // are auto-externalized by tsup — no manual 'external' array needed
});
```

- **AuthProvider Props (ADR-3 — Passthrough):** `AuthProvider` accepts `UserManagerSettings` as spread props and forwards them directly to `react-oidc-context`'s `AuthProvider`. Do NOT create a custom `AuthConfig` subset type — the shell app (Story 1.5) is the only consumer and it's internal. Passthrough keeps it simple and ensures all `oidc-client-ts` settings (including `silent_redirect_uri`, `post_logout_redirect_uri`, etc.) are available without maintaining a mapping layer.
- **Redirect Testing:** Unit tests mock `react-oidc-context` and verify our wrapper behavior. Actual OIDC redirect flow testing requires E2E (Playwright, Story 1.5+). Do NOT try to test real OIDC redirects in Vitest.
- **File Separation Pattern & AuthContext Export Boundary:**
  - `AuthProvider.tsx` defines `const AuthContext = createContext<AuthContextValue | null>(null)` and exports it as a **named file-level export** (`export const AuthContext`). It also exports the `AuthProvider` component.
  - `useAuth.ts` imports `AuthContext` from `'./AuthProvider'` (file-level import, NOT from barrel) and exports the `useAuth` hook.
  - **CRITICAL DISTINCTION:** `AuthContext` is a file-level export (so `useAuth.ts` can import it from `./AuthProvider`), but it is **NOT re-exported from `src/index.ts`**. The barrel only exports `AuthProvider`, `useAuth`, `AuthContextValue`, and `AuthUser`. This keeps `AuthContext` internal — module developers cannot access it directly, only through `useAuth()`.
  - If a developer adds `AuthContext` to `src/index.ts`, the export verification test (AC #5) will catch it.
- **AC #3 Testing Boundary:** Unit tests verify that React tree identity survives a simulated token refresh (e.g., `useRef` value persists across re-renders triggered by user update events). Full verification of form data, scroll position, and component state survival requires E2E testing (Story 1.5+). Note this boundary in test comments.

### Concrete Type Definitions

```typescript
// packages/shell-api/src/types.ts

/** Mapped user profile — token-free, safe for public API */
interface AuthUser {
  sub: string; // User ID (JWT sub claim — backend requires this)
  tenantClaims: string[]; // From JWT 'eventstore:tenant' (multi-value array)
  name?: string; // Display name (OIDC profile claim, optional)
  email?: string; // Email (OIDC profile claim, optional)
}

/** Public auth context — returned by useAuth() */
interface AuthContextValue {
  user: AuthUser | null; // null when not authenticated
  isAuthenticated: boolean; // true when valid session exists
  isLoading: boolean; // true during initial auth check and silent refresh
  error: Error | null; // Auth error from react-oidc-context (signin failure, silent renew error)
  signoutRedirect: () => Promise<void>; // Triggers OIDC logout redirect — consumed by Story 1.5
  signinRedirect: () => Promise<void>; // Triggers OIDC login redirect — consumed by Story 1.5
}
```

**Note:** `signoutRedirect` and `signinRedirect` are included now so Story 1.5 can consume them directly without modifying this package. These are thin wrappers around `react-oidc-context` methods.

### Architecture Compliance

**React Context Provider Pattern (from architecture.md — MANDATORY for all shell contexts):**

```typescript
// 1. Context + Provider in same file
// 2. Named export for Provider
// 3. Named export for hook
// 4. Hook throws if used outside Provider

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // ... wraps react-oidc-context AuthProvider
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Rule:** Context value type is always a named interface. The `null` check + throw pattern is mandatory.

**Package Dependency Rules (from architecture.md):**

| Package             | May Import From                           | MUST NOT Import From                |
| ------------------- | ----------------------------------------- | ----------------------------------- |
| @hexalith/shell-api | React, oidc-client-ts, react-oidc-context | @hexalith/cqrs-client, @hexalith/ui |

**Import Boundary Enforcement:**

- `oidc-client-ts` is already blocked by `packages/eslint-config/module-boundaries.js` for module code — only `@hexalith/shell-api` may import it
- `react-oidc-context` should NOT be re-exported — modules use `useAuth()` only

**Auth Architecture Decisions (from architecture.md):**

| Decision          | Choice                                         | Rationale                                                                                     |
| ----------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| OIDC library      | oidc-client-ts + react-oidc-context            | Provider-agnostic. Same build deploys against Keycloak or Entra ID via runtime `/config.json` |
| Token storage     | Session storage (oidc-client-ts default)       | Survives page refresh, cleared on tab close. More secure than localStorage                    |
| Token injection   | ky `beforeRequest` hook (Story 2.2)            | Centralized in shell — modules never see tokens                                               |
| User ID source    | JWT `sub` claim                                | Backend rejects tokens without `sub` claim                                                    |
| Tenant claims     | JWT `eventstore:tenant` claim (multi-value)    | Backend uses this for tenant authorization. Shell reads it for tenant switcher                |
| Silent refresh    | oidc-client-ts automatic silent renew (iframe) | Transparent to modules. Auth context updates via React context                                |
| OIDC provider URL | Runtime `/config.json` (Story 1.7)             | Same build deploys against Keycloak (dev) or Entra ID (prod)                                  |

**OIDC Authentication Flow:**

```
Browser                    Shell (oidc-client-ts)           OIDC Provider
───────                    ─────────────────────            ──────────────
App loads           →      Check session storage
                           Token valid?
                    ←      Yes: render app
                    ←      No: redirect to OIDC provider   →   Login page
User logs in                                               ←   Auth code
                    ←      Exchange code for tokens         →   Token endpoint
                           Store tokens
                           Render app
Silent refresh      →      iframe silent renew              →   /authorize (prompt=none)
                    ←      New tokens                       ←   New auth code
```

**Error Hierarchy (from architecture.md):**

```typescript
class AuthError extends HexalithError {
  code = "AUTH_ERROR"; // 401 — triggers silent refresh or redirect
}
```

This error type is defined in `@hexalith/cqrs-client` (Story 2.1). For THIS story, `AuthProvider` surfaces errors via the `react-oidc-context` error state. The `AuthError` class comes later.

**Provider Nesting Order (from architecture.md — for context, implemented in Story 1.5):**

1. QueryClientProvider (outermost)
2. **AuthProvider** (this story)
3. TenantProvider (reads tenant claims from JWT — Story 1.4)
4. ThemeProvider (Story 1.4)
5. LocaleProvider (innermost — Story 1.4)

**Shell-API File Structure (from architecture.md):**

```
packages/shell-api/
├── src/
│   ├── index.ts                 # Public API barrel
│   ├── types.ts                 # AuthContextValue, AuthUser (this story) + future: ModuleManifest, NavigationItem
│   ├── auth/
│   │   ├── AuthProvider.tsx     # Wraps react-oidc-context
│   │   ├── AuthProvider.test.tsx
│   │   └── useAuth.ts
│   ├── tenant/                  # Story 1.4
│   ├── theme/                   # Story 1.4
│   ├── locale/                  # Story 1.4
│   ├── manifest/                # Story 1.4 (types) + Story 4.5 (validation)
│   └── testing/                 # Grows across stories
│       ├── MockShellProvider.tsx # Wraps all mock contexts (grows with each provider story)
│       ├── createMockAuthContext.ts   # Configurable mock (this story creates minimal version for tests)
│       └── createMockTenantContext.ts # Story 1.4
├── tsup.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

**Naming Conventions (from architecture.md):**

- `PascalCase.tsx` for React components (AuthProvider.tsx)
- `camelCase.ts` for hooks/utils (useAuth.ts)
- `.test.tsx` for Vitest (co-located next to source)
- `.spec.tsx` reserved for Playwright (NOT used here)
- Barrel exports: only at package root `src/index.ts` — no sub-folder barrels

### Library & Framework Requirements

**Dependencies to ADD to `packages/shell-api/package.json`:**

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "oidc-client-ts": "^3.0.0",
    "react-oidc-context": "^3.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0",
    "oidc-client-ts": "^3.0.0",
    "react-oidc-context": "^3.0.0"
  }
}
```

**Note:** `oidc-client-ts` and `react-oidc-context` are `peerDependencies` (shell app provides the single instance) AND `devDependencies` (needed for local development/testing). This matches the established pattern for `react`/`react-dom`. The shell app (`apps/shell/package.json`) must add them as direct dependencies.

**react-oidc-context API (from web research):**

```typescript
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from "react-oidc-context";
import type { User, UserManagerSettings } from "oidc-client-ts";

// AuthProvider accepts UserManagerSettings as spread props:
// authority, client_id, redirect_uri, scope, automaticSilentRenew, etc.
// OR a pre-configured UserManager instance via userManager prop

// useAuth() returns AuthContextProps which includes:
// - user: User | null | undefined
// - isAuthenticated: boolean
// - isLoading: boolean
// - error: ErrorContext | undefined
// - signinRedirect(): Promise<void>
// - signoutRedirect(): Promise<void>
// - signinSilent(): Promise<User | null>
// - events: UserManagerEvents
// - settings: UserManagerSettings

// User.profile contains OIDC claims including:
// - sub: string (user ID)
// - Custom claims like 'eventstore:tenant' (multi-value)
```

**Key UserManagerSettings for this story:**

- `authority`: OIDC provider URL (passed as prop, sourced from `/config.json` in Story 1.7)
- `client_id`: OIDC client identifier
- `redirect_uri`: Where to return after login
- `scope`: `"openid profile"` (minimum)
- `automaticSilentRenew`: `true` — enables iframe-based silent refresh
- `silent_redirect_uri`: URL for silent refresh iframe callback (optional, uses redirect_uri if not set)
- `post_logout_redirect_uri`: Where to go after logout

**onSigninCallback Pattern (IMPORTANT — clean URL after redirect):**

```typescript
onSigninCallback: () => {
  // Remove OIDC auth params from URL after successful sign-in
  window.history.replaceState({}, document.title, window.location.pathname);
};
```

Without this, auth params (`code`, `state`, etc.) remain in the URL after login redirect.

**NOT to install:**

- `keycloak-js` — replaced by oidc-client-ts (ADR in architecture.md)
- `@auth0/auth0-react` — not provider-agnostic
- `next-auth` — not relevant (not using Next.js)
- Any CSS-in-JS libraries

### File Structure Requirements

**New files (this story):**

```
packages/shell-api/
├── src/
│   ├── index.ts                    (MODIFIED — replace empty export with AuthProvider, useAuth, types)
│   ├── types.ts                    (NEW — AuthContextValue, AuthUser interfaces)
│   └── auth/
│       ├── AuthProvider.tsx         (NEW — wraps react-oidc-context)
│       ├── AuthProvider.test.tsx    (NEW — acceptance tests, written FIRST)
│       └── useAuth.ts              (NEW — hook with null-check throw)
```

**Modified files:**

```
packages/shell-api/package.json     (MODIFIED — add oidc-client-ts, react-oidc-context, testing deps)
packages/shell-api/vitest.config.ts (MODIFIED — add jsdom environment for React component tests)
```

**Vitest config update required:**

```typescript
// packages/shell-api/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    environment: "jsdom", // Required for React component testing
    passWithNoTests: true,
  },
});
```

### Security Considerations

- **PKCE:** oidc-client-ts uses PKCE by default (code_challenge + code_verifier). Do NOT disable it.
- **validateSubOnSilentRenew:** Set to `true` to ensure user identity doesn't change during silent refresh (critical for multi-tenant)
- **Token opacity:** NEVER log, serialize, or expose `user.access_token` or `user.id_token` in the public API. Only `user.profile` (claims) is surfaced via `AuthUser`.
- **State parameter:** oidc-client-ts validates the OIDC `state` parameter automatically — prevents CSRF on callback
- **CSP headers:** Configured at hosting layer (Story 1.7), not in this story. The `silent_redirect_uri` iframe requires `frame-src 'self'` in CSP.
- **No token logging:** Do not add `console.log` or debug statements that output token values. Profile claims only.
- **Silent refresh buffer:** Set `accessTokenExpiringNotificationTimeInSeconds: 60` (oidc-client-ts default, but be explicit) — triggers refresh 60s before expiry, handles tab-sleep scenarios where iframe may be throttled.
- **Callback error handling:** If `onSigninCallback` throws (e.g., corrupted state parameter), the error should surface via `react-oidc-context` error state — do NOT add a try/catch that swallows it. Let it propagate so the shell app (Story 1.5) can redirect to a clean login.
- **Token revocation on signout:** Note for Story 1.5 — consider `revokeTokensOnSignout: true` when wiring logout to prevent token reuse after signout.
- **Multi-tab session:** `oidc-client-ts` `monitorSession` (default: `true`) monitors session via iframe check. When user logs out in one tab, `UserUnloaded` fires in all tabs → `isAuthenticated` becomes `false`. No additional code needed — just don't disable `monitorSession`.
- **Tenant claim normalization:** JWT `eventstore:tenant` claim may be missing (new user), a single string, or an array. The AuthUser mapping MUST normalize to `string[]` in all cases. See Task 3.5.
- **Graceful session expiry (note for Story 1.5):** When silent refresh fails and `isAuthenticated` transitions from `true` to `false`, the shell app should show a warning ("Your session has expired. Save your work before continuing.") with a "Re-authenticate" button rather than immediately redirecting to OIDC login. This prevents Elena (power user) from losing form data during long sessions. The `AuthContextValue.error` field with source `'renewSilent'` signals this scenario.

### Testing Requirements

- **ATDD (Red-Green-Refactor):** Write acceptance tests FIRST from ACs. Verify they fail. Then implement. Then verify they pass.
- **Framework:** Vitest with `@testing-library/react` for component rendering
- **Environment:** jsdom (add to vitest.config.ts)
- **Co-location:** Tests live next to source (`auth/AuthProvider.test.tsx`)
- **Coverage target:** ≥95% for foundation packages

**Test Cases (map to ACs):**

1. **AC #1 — useAuth returns typed state:** Render component with AuthProvider, verify `useAuth()` returns `{ user, isAuthenticated, isLoading }` with correct types
2. **AC #2 — Redirect when not authenticated:** Verify `signinRedirect` is called when no valid session exists (mock react-oidc-context)
3. **AC #3 — Silent refresh is non-destructive:** Verify that token refresh events update context state WITHOUT remounting the React tree (check component identity survives refresh)
4. **AC #4 — Error outside provider:** Render `useAuth()` hook via `renderHook` WITHOUT wrapping in AuthProvider, verify it throws "useAuth must be used within AuthProvider". Use an error boundary or `expect(() => ...).toThrow()` pattern — see below.
5. **AC #5 — Public API exports:** Verify `AuthProvider` and `useAuth` are importable from the package barrel (`src/index.ts`). Verify `AuthContextValue` and `AuthUser` types are exported. Verify `AuthContext` is NOT exported.
6. **Tenant claim normalization:** Three cases for `user.profile['eventstore:tenant']` mapping:
   - `undefined` (missing claim) → `tenantClaims: []`
   - `"single-tenant"` (string) → `tenantClaims: ["single-tenant"]`
   - `["tenant-a", "tenant-b"]` (array) → `tenantClaims: ["tenant-a", "tenant-b"]`
7. **Sub claim validation:** When `user.profile.sub` is missing/undefined, verify `AuthUser` maps to `null` and `isAuthenticated` is `false`. Verify a descriptive error is surfaced via the `error` field.

**Error-outside-provider test pattern:**

```typescript
// Use renderHook to test hook throw behavior cleanly
it("throws when used outside AuthProvider", () => {
  // Suppress React error boundary console noise
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => renderHook(() => useAuth())).toThrow(
    "useAuth must be used within AuthProvider",
  );
  spy.mockRestore();
});
```

**Export verification approach:**

```typescript
// Verify public API surface — import from barrel
import { AuthProvider, useAuth } from "../index";
import type { AuthContextValue, AuthUser } from "../index";

it("exports AuthProvider and useAuth from barrel", () => {
  expect(AuthProvider).toBeDefined();
  expect(useAuth).toBeDefined();
});

// Verify AuthContext is NOT exported (internal only)
it("does not export AuthContext from barrel", async () => {
  const barrel = await import("../index");
  expect("AuthContext" in barrel).toBe(false);
});
```

**Testing Pattern (mock react-oidc-context for unit tests):**

```typescript
// Mock the underlying library, test OUR wrapper behavior
vi.mock('react-oidc-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { profile: { sub: 'test-user', 'eventstore:tenant': ['tenant-a'] } },
    isAuthenticated: true,
    isLoading: false,
    signinRedirect: vi.fn(),
    signoutRedirect: vi.fn(),
  }),
}));
```

### Previous Story Intelligence (from Stories 1-1 and 1-2)

**From Story 1-1 (done):**

- `packages/shell-api/` exists as stub: `package.json` (private, peerDeps: react), `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`, `src/index.ts` (`export {}`)
- tsup config: `entry: ['src/index.ts'], format: ['esm'], dts: true, clean: true`
- Vitest 3.x with `passWithNoTests: true` — already configured
- ESLint config in `packages/eslint-config/module-boundaries.js` already blocks `oidc-client-ts` imports in module code — good, this story's package IS allowed to import it
- Package topology declared: `@hexalith/cqrs-client` has workspace dependency on `@hexalith/shell-api`; `@hexalith/ui` has peer dep on `@hexalith/shell-api`
- Turborepo v2.8.16 with pnpm 10.25.0

**From Story 1-2 (review):**

- `packages/ui/` now has token CSS files, Stylelint scanner, contrast matrix
- tsup config split pattern: index entry (with DTS) + separate entry (external deps, no DTS) — may be relevant if tsup needs to handle react-oidc-context as external
- Font imports in `apps/shell/src/main.tsx` via JS imports — pattern for importing CSS in shell app
- Stylelint scanner has `external: ["stylelint"]` in tsup config — establishes pattern for marking peer/external deps in tsup
- `turbo.json` has `lint:styles` task with `dependsOn: ["^build"]` — Stylelint needs built scanner

**Key Learnings:**

- tsup may need `external` config if dependencies shouldn't be bundled (see Story 1-2 pattern with `external: ["stylelint"]`)
- For `@hexalith/shell-api`, `react`, `react-dom`, `oidc-client-ts`, and `react-oidc-context` should likely be `external` in tsup to avoid bundling — consumers provide them. However, since oidc-client-ts and react-oidc-context are `dependencies` (not peer), tsup's default behavior (bundle deps, externalize peerDeps) may be appropriate. Test both approaches.
- Vitest configs added `passWithNoTests: true` to prevent exit code 1 when no tests exist

### Git Intelligence

**No code implementation commits on main branch.** All 9 commits are planning artifacts and framework setup. Stories 1-1 and 1-2 were likely implemented on feature branches.

**Recent file patterns:**

- Story files at: `_bmad-output/implementation-artifacts/{epic}-{story}-{slug}.md`
- Source code at: `packages/{package-name}/src/`
- Config files at package root: `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`

### Latest Tech Information

**react-oidc-context (latest stable — v3.x):**

- `AuthProvider` accepts `UserManagerSettings` as spread props OR a `userManager` prop
- `useAuth()` returns `AuthContextProps` extending `AuthState` (`user`, `isAuthenticated`, `isLoading`, `error`)
- `useAutoSignin()` hook available for automatic sign-in on mount
- `onSigninCallback` prop cleans up URL after OIDC redirect
- `hasAuthParams()` utility checks for auth params in URL
- `AuthProvider` handles the OIDC callback automatically when mounted at the redirect URI

**oidc-client-ts (latest stable — v3.x):**

- `UserManager` is the core class for managing OIDC sessions
- `UserManagerSettings` configures `authority`, `client_id`, `redirect_uri`, `scope`, `automaticSilentRenew`, `silent_redirect_uri`
- `User.profile` contains OIDC claims (sub, email, custom claims like `eventstore:tenant`)
- Session storage is the default `userStore` — more secure than localStorage
- Silent refresh uses iframe: loads `/authorize?prompt=none` in hidden iframe, exchanges code for new tokens
- `validateSubOnSilentRenew: true` ensures the same user after refresh
- `events` includes `addUserLoaded`, `addUserUnloaded`, `addSilentRenewError`, `addAccessTokenExpiring`

**@testing-library/react (latest stable — v16.x):**

- Works with React 19
- `render()`, `screen`, `waitFor()` for component testing
- `renderHook()` for testing custom hooks in isolation

### Project Structure Notes

- **Alignment:** All file paths match architecture.md specification exactly
- **Package boundary:** Auth code lives in `packages/shell-api/src/auth/` — NOT in `apps/shell/`
- **Barrel export rule:** Only `src/index.ts` exports publicly — no `auth/index.ts` barrel
- **tsup bundles from `src/index.ts`** — only publicly exported items appear in `dist/`
- **Internal token access (deferred):** Story 2.2 will define how `@hexalith/cqrs-client` accesses the auth token for ky `beforeRequest` hook injection. For this story, the token remains accessible via `react-oidc-context`'s `useAuth().user?.access_token` within the shell workspace. No internal accessor type needed yet (YAGNI).

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — React Context Provider Pattern, Auth Architecture Decisions, Package Dependency Rules, OIDC flow, Error hierarchy, Shell-API file structure, Provider nesting order]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1 overview (ATDD mandate from 1.3), Story 1.3 ACs, cross-story dependencies, FR30/FR31/FR33/FR36]
- [Source: _bmad-output/planning-artifacts/prd.md — FR30 (auth via IdP), FR31 (shell manages tokens), FR33 (module access to auth context), FR36 (token injection into requests)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Auth is OIDC provider-agnostic via oidc-client-ts + react-oidc-context]
- [Source: react-oidc-context docs — AuthProvider props, useAuth return type, onSigninCallback, hasAuthParams]
- [Source: oidc-client-ts docs — UserManager, UserManagerSettings, User.profile, silent refresh iframe flow, session storage default]
- [Source: Story 1-1 — shell-api stub structure, package.json, tsup config, ESLint module-boundaries blocking oidc-client-ts in modules]
- [Source: Story 1-2 — tsup external pattern, vitest jsdom pattern, Stylelint scanner as prior art for custom tooling in packages/]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- ESLint `no-restricted-imports` rule blocked `oidc-client-ts` import in shell-api. Fixed by overriding the rule in `packages/shell-api/eslint.config.js` (shell-api is the designated wrapper package).
- TypeScript DTS build failed with "inferred type cannot be named" — fixed by adding explicit `React.JSX.Element` return type and `@types/react` devDependency.
- `@testing-library/react` auto-cleanup not working with jsdom in vitest — added explicit `cleanup()` in `afterEach`.

### Completion Notes List

- Implemented thin facade `AuthProvider` wrapping `react-oidc-context` with `AuthContextBridge` inner component
- `useAuth()` hook in separate file (`useAuth.ts`) imports `AuthContext` from `AuthProvider.tsx` (file-level, not barrel)
- `AuthContext` exported from file but NOT from barrel — enforced by test
- Tenant claim normalization: undefined→[], string→[string], array→as-is
- Sub claim validation: missing sub → user=null, isAuthenticated=false, descriptive error surfaced
- `automaticSilentRenew: true` and `validateSubOnSilentRenew: true` set as defaults
- `accessTokenExpiringNotificationTimeInSeconds: 60` now set explicitly for silent renew timing resilience
- Unauthenticated users are redirected via `signinRedirect()` once loading completes and no session exists
- Missing `sub` claims now log the required diagnostic message and avoid redirect loops
- Tenant claim arrays now filter non-string values instead of blindly casting
- `onSigninCallback` cleans URL after OIDC redirect
- 16 acceptance tests covering all 5 ACs + provider defaults + redirect behavior + tenant normalization + sub validation
- No regressions in shell-api package; pre-existing `@hexalith/ui` test failure (Story 1-2) unrelated

### File List

**New files:**

- `packages/shell-api/src/types.ts` — AuthContextValue, AuthUser interfaces
- `packages/shell-api/src/auth/AuthProvider.tsx` — AuthProvider component wrapping react-oidc-context
- `packages/shell-api/src/auth/useAuth.ts` — useAuth hook with null-check throw
- `packages/shell-api/src/auth/AuthProvider.test.tsx` — 13 acceptance tests for all ACs

**Modified files:**

- `packages/shell-api/src/index.ts` — barrel exports for AuthProvider, useAuth, types
- `packages/shell-api/package.json` — added oidc-client-ts, react-oidc-context, testing deps, @types/react
- `packages/shell-api/vitest.config.ts` — added jsdom environment
- `packages/shell-api/eslint.config.js` — override oidc-client-ts import restriction for this package
- `pnpm-lock.yaml` — lockfile updated for added shell-api auth/testing dependencies

## Senior Developer Review (AI)

### Reviewer

Jerome on 2026-03-13

### Outcome

Approved after fixes.

### Review Summary

- Verified AC #2 by implementing automatic `signinRedirect()` when loading completes without a valid session.
- Added explicit `accessTokenExpiringNotificationTimeInSeconds: 60` to align the implementation with the story's security notes.
- Implemented the required missing-`sub` diagnostic logging and guarded against redirecting when token claims are invalid.
- Hardened tenant claim normalization to discard non-string values instead of trusting arbitrary arrays.
- Strengthened the acceptance tests to assert redirect behavior, provider default configuration, exact missing-`sub` error messaging, and logging behavior.

### Verification Evidence

- `pnpm --filter @hexalith/shell-api test` ✅ (16/16 tests passing)
- `pnpm --filter @hexalith/shell-api build` ✅
- `pnpm --filter @hexalith/shell-api lint` ✅

## Change Log

- 2026-03-13: Story 1.3 implementation complete — AuthProvider, useAuth, types, 13 tests passing, build and lint clean
- 2026-03-13: Senior developer review fixes applied — auto-redirect, explicit silent renew buffer, diagnostic logging, safer tenant claim normalization, and stronger acceptance tests; story approved and marked done
