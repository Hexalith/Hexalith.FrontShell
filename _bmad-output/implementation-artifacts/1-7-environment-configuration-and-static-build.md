# Story 1.7: Environment Configuration & Static Build

Status: done

## Story

As a platform operator,
I want to configure the shell for different environments via runtime config without code changes,
So that the same Docker image deploys against Keycloak (dev/staging) or Entra ID (production).

## Scope Boundaries

### IN Scope

- `loadRuntimeConfig.ts` + `types.ts` in `apps/shell/src/config/` — fetches and validates `/config.json` at startup before React mounts
- `RuntimeConfig` type with required fields: `oidcAuthority`, `oidcClientId`, `commandApiBaseUrl`, `tenantClaimName`; optional overrides: `oidcScope`, `oidcRedirectUri`, `oidcPostLogoutRedirectUri`
- Manual field-by-field validation with explicit diagnostic messages per missing/invalid field (NOT Zod — Zod arrives in Epic 2 with `@hexalith/cqrs-client`)
- Diagnostic fallback page rendered outside React (plain DOM manipulation with inline styles) when config is missing, malformed, or invalid
- `AbortController` with 5-second timeout on config fetch to prevent indefinite hang
- URL field normalization (strip trailing slashes) to prevent OIDC discovery URL issues
- Console warning when `oidcAuthority` uses HTTP on non-localhost environments
- Updated `main.tsx` — fetches config BEFORE calling `createRoot`, passes validated config to `<App />`
- Updated `App.tsx` — receives `RuntimeConfig` as prop, removes hardcoded `OIDC_DEV_CONFIG` and `BACKEND_DEV_URL`
- Updated `ShellProviders.tsx` — derives OIDC config and `backendUrl` from `RuntimeConfig` prop
- `public/config.json` — dev defaults matching current hardcoded values (`localhost:8443` Keycloak, `localhost:5000` backend)
- `.env.example` at `apps/shell/` — documents build-time variables: `VITE_APP_VERSION`, `VITE_API_VERSION`
- `Dockerfile` at project root — multi-stage build: `node:22-alpine` builder → `nginx:alpine` static server
- `nginx.conf` at project root — SPA `try_files` fallback, `Cache-Control: no-cache` for `config.json`, content-type headers
- Vite build verification: confirm `dist/` output uses content-hashed filenames (Vite default — don't override)
- Co-located Vitest tests for `loadRuntimeConfig.ts`; ATDD: failing tests written BEFORE implementation

### OUT of Scope

- CI pipeline (Story 1.8 — the Dockerfile and nginx.conf are created here but CI integration is next story)
- Kubernetes ConfigMap creation/documentation (operator documentation is a deployment guide concern, not app code)
- Zod validation of config (Epic 2 — manual validation sufficient for 4 required fields)
- Module developer impact — ZERO. Modules consume `useAuth()`, `useTenant()` etc. from `@hexalith/shell-api`. Config loading is shell-internal
- Backend health check endpoint implementation — Story 1.6's `ConnectionHealthProvider` already tracks connection state. Story 1.7 only passes `commandApiBaseUrl` from config to it
- HTTPS enforcement or CSP headers — hosting-layer concern configured in nginx/ingress, not app code
- E2E / Playwright tests (Story 1.8+)

## Dependencies

- **Story 1.5** (Shell Layout & Auth Flow) — `App.tsx`, `ShellProviders.tsx`, `main.tsx`, `AuthGate.tsx`. **Done**
- **Story 1.6** (Tenant Switching & Status Bar) — `ConnectionHealthProvider` accepts `backendUrl` prop. **Done**
- No blocking dependencies — proceed immediately

## Acceptance Criteria

| AC  | Summary                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | Static build produces HTML/CSS/JS with content-hashed filenames for long-term caching                                                          |
| #2  | Shell reads `oidcAuthority`, `oidcClientId`, `commandApiBaseUrl`, and `tenantClaimName` from runtime `/config.json`                            |
| #3  | OIDC provider is configured from runtime config, not build-time constants                                                                      |
| #4  | Same build artifact deploys to two environments with different `/config.json` — one authenticates against Keycloak, the other against Entra ID |
| #5  | Missing or malformed `/config.json` displays clear diagnostic page explaining the problem and expected format                                  |
| #6  | Valid config + unreachable backend: shell loads, status bar shows disconnected state immediately                                               |
| #7  | Vite `.env` files provide build-time constants (`VITE_API_VERSION`, `VITE_APP_VERSION`)                                                        |

**Detailed BDD:**

1. **Given** the shell application build runs (`pnpm build`)
   **When** the build completes
   **Then** `apps/shell/dist/` contains `index.html` + content-hashed `.js` and `.css` files in `assets/` (note: `index.html` itself is NOT content-hashed — only JS/CSS assets are; this is standard Vite behavior)
   **And** no hardcoded OIDC configuration exists in the built JavaScript

2. **Given** a runtime `/config.json` exists with valid fields
   **When** the shell loads
   **Then** `loadRuntimeConfig()` fetches `/config.json` before React mounts
   **And** the `AuthProvider` receives `oidcAuthority` and `oidcClientId` from the runtime config
   **And** the `ConnectionHealthProvider` receives `commandApiBaseUrl` from the runtime config
   **And** if optional fields (`oidcScope`, `oidcRedirectUri`, `oidcPostLogoutRedirectUri`) are absent, sensible defaults apply (`openid profile email`, `window.location.origin`, `window.location.origin`)

3. **Given** the same built artifact is deployed to two environments with different `/config.json` files
   **When** each environment loads the shell
   **Then** one authenticates against Keycloak and the other against Entra ID, without any code changes
   **And** the `commandApiBaseUrl` routes status bar health checks to the correct backend

4. **Given** `/config.json` is missing (HTTP 404 or network error)
   **When** the shell attempts to load
   **Then** a diagnostic page renders (outside React, inline styles) showing:
   - "Configuration file not found at /config.json"
   - Expected file location and format
   - Example valid config.json with all required fields
   - Kubernetes hint: "Mount your ConfigMap to /usr/share/nginx/html/config.json"

5. **Given** `/config.json` contains invalid JSON
   **When** the shell attempts to parse it
   **Then** the diagnostic page shows: "config.json contains invalid JSON" with the parse error message

6. **Given** `/config.json` is valid JSON but missing required fields
   **When** validation runs
   **Then** the diagnostic page lists each missing field with its purpose (e.g., "`oidcAuthority` — the OIDC provider URL, e.g., https://keycloak.example.com/realms/hexalith")

7. **Given** `/config.json` fetch hangs for more than 5 seconds
   **When** the `AbortController` timeout fires
   **Then** the diagnostic page shows: "Configuration file took too long to load. Check network connectivity."

8. **Given** `/config.json` is valid and the shell starts
   **When** the backend at `commandApiBaseUrl` is unreachable
   **Then** the shell still loads and renders the layout
   **And** the status bar shows disconnected state via `ConnectionHealthProvider` (from Story 1.6)

_FRs covered: FR49, FR50_

## Tasks / Subtasks

- [x] Task 1: Create `RuntimeConfig` type, tests, and `loadRuntimeConfig` function (AC: #2, #5)
  - [x] 1.1 Create `apps/shell/src/config/types.ts` with `RuntimeConfig` interface (required: `oidcAuthority`, `oidcClientId`, `commandApiBaseUrl`, `tenantClaimName`; optional: `oidcScope`, `oidcRedirectUri`, `oidcPostLogoutRedirectUri`)
  - [x] 1.2 **ATDD — WRITE TESTS FIRST:** Create `apps/shell/src/config/loadRuntimeConfig.test.ts` with failing tests for all 5 core scenarios (valid config, missing file 404, malformed JSON, missing required fields, fetch timeout) + additional cases (optional fields, unknown fields ignored, URL normalization, HTTP warning). Mock global `fetch` using `vi.fn()`. Use `vi.useFakeTimers()` for timeout test.
  - [x] 1.3 Create `apps/shell/src/config/loadRuntimeConfig.ts` — async function with signature `loadRuntimeConfig(): Promise<RuntimeConfig | null>`. Returns validated `RuntimeConfig` on success; renders diagnostic page and returns `null` on any failure. Fetches `/config.json` with 5s timeout using `setTimeout` + manual `AbortController.abort()` (not `AbortSignal.timeout()` — `AbortSignal.timeout` doesn't work with `vi.useFakeTimers()` in tests).
  - [x] 1.4 Implement manual field-by-field validation: check each required field exists and is a non-empty string; normalize URL fields (strip trailing slashes via `url.replace(/\/+$/, '')`); `console.warn` on non-HTTPS `oidcAuthority` when `window.location.hostname` is not `localhost`/`127.0.0.1`
  - [x] 1.5 Implement `renderDiagnosticPage(title: string, details: string[])` — plain DOM function (no React) that uses safe DOM methods (`textContent`, `createElement`, `appendChild`) to render a diagnostic page. Structure: heading with error title, bullet list of details, pre-formatted example config.json block, deployment hint paragraph. Inline styles: white background, system font (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`), max-width 600px centered, red-tinted error heading. All content is developer-controlled static strings — no user input rendered.
  - [x] 1.6 Handle all failure modes: fetch network error → "Configuration file not found" diagnostic; non-OK response → "returned HTTP {status}" diagnostic; `SyntaxError` from `.json()` → "invalid JSON" diagnostic with parse error message; `AbortError` from timeout → "took too long to load" diagnostic; missing fields → list each missing field with purpose and example value

- [x] Task 2: Update `main.tsx` to load config before React (AC: #2, #3, #5)
  - [x] 2.1 Import `loadRuntimeConfig` from `./config/loadRuntimeConfig`
  - [x] 2.2 Call `loadRuntimeConfig()` using top-level await (Vite supports ESM top-level await)
  - [x] 2.3 Check return value: if `config` is not null, call `createRoot` and render `<App config={config} />`
  - [x] 2.4 If `config` is null, do nothing — `loadRuntimeConfig` already rendered the diagnostic page
  - [x] 2.5 Keep font imports (`@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono`) and CSS import

- [x] Task 3: Update `App.tsx` to use runtime config (AC: #3, #4)
  - [x] 3.1 Add `config: RuntimeConfig` prop to `App` component
  - [x] 3.2 Remove hardcoded `OIDC_DEV_CONFIG` constant and `BACKEND_DEV_URL` constant
  - [x] 3.3 Remove the `// Hardcoded dev defaults — Story 1.7 replaces...` comments
  - [x] 3.4 Derive OIDC config object from `RuntimeConfig`: `{ authority: config.oidcAuthority, client_id: config.oidcClientId, redirect_uri: config.oidcRedirectUri ?? window.location.origin, post_logout_redirect_uri: config.oidcPostLogoutRedirectUri ?? window.location.origin, scope: config.oidcScope ?? 'openid profile email' }`
  - [x] 3.5 Pass `config.commandApiBaseUrl` as `backendUrl` to `ShellProviders`
  - [x] 3.6 Pass `config.tenantClaimName` through `ShellProviders` to `AuthProvider`. The claim name is hardcoded as `"eventstore:tenant"` in `packages/shell-api/src/auth/AuthProvider.tsx` line 34 (`mapUser` function: `profile["eventstore:tenant"]`). Update: (a) add `tenantClaimName?: string` prop to `AuthProviderProps`, (b) pass it through `AuthContextBridge` to `mapUser`, (c) `mapUser` uses `profile[tenantClaimName ?? "eventstore:tenant"]` instead of the hardcoded string, (d) update `ShellProvidersProps` to accept `tenantClaimName` and pass it to `AuthProvider`
  - [x] 3.7 Update `App.test.tsx` with 3 specific test cases: (a) verify OIDC config is derived from RuntimeConfig (`authority`, `client_id` fields match config values), (b) verify `backendUrl` is passed to `ShellProviders` from `config.commandApiBaseUrl`, (c) verify optional fields use defaults when absent (`scope` defaults to `"openid profile email"`, `redirect_uri` defaults to `window.location.origin`)

- [x] Task 4: Create `public/config.json` with dev defaults (AC: #2, #4)
  - [x] 4.1 Create `apps/shell/public/config.json` with dev defaults matching current hardcoded values:
    ```json
    {
      "oidcAuthority": "https://localhost:8443/realms/hexalith",
      "oidcClientId": "hexalith-frontshell",
      "commandApiBaseUrl": "http://localhost:5000",
      "tenantClaimName": "eventstore:tenant"
    }
    ```
  - [x] 4.2 Document each field's purpose in `.env.example` (JSON doesn't support comments)

- [x] Task 5: Create `.env.example` for build-time variables (AC: #7)
  - [x] 5.1 Create `apps/shell/.env.example` (note: `VITE_APP_VERSION` and `VITE_API_VERSION` are defined here but NOT consumed in app code in Story 1.7 — they're prepared for future use in status bar version display or meta tags; consuming them is deferred):
    ```
    # Build-time constants (VITE_ prefix required for client exposure)
    VITE_APP_VERSION=0.0.0-dev
    VITE_API_VERSION=v1
    ```
  - [x] 5.2 Create `apps/shell/.env` (gitignored) with same defaults for local dev
  - [x] 5.3 Update `apps/shell/.gitignore` (or root `.gitignore`) to include `.env` but NOT `.env.example`

- [x] Task 6: Create Dockerfile (AC: #1, #4)
  - [x] 6.1 Create `Dockerfile` at project root — multi-stage: `node:22-alpine` builder (corepack enable, pnpm install --frozen-lockfile, pnpm build --filter=shell) → `nginx:alpine` (copy dist, copy nginx.conf)
  - [x] 6.2 Note in Dockerfile: submodules must be initialized before build (CI handles via `actions/checkout` with `submodules: recursive`)
  - [x] 6.3 Note: `config.json` from `public/` will be in the image (dev defaults) — Kubernetes ConfigMap mount shadows it in production

- [x] Task 7: Create nginx.conf (AC: #1, #4)
  - [x] 7.1 Create `nginx.conf` at project root: SPA fallback (`try_files $uri $uri/ /index.html`), `Cache-Control: no-cache` for `/config.json` specifically, `application/json` content-type for `.json` files, gzip for JS/CSS/HTML
  - [x] 7.2 Listen on port 80 (standard for Kubernetes pod — ingress handles TLS)

- [x] Task 8: Verify build and dev server (AC: #1, #2)
  - [x] 8.1 Run `pnpm build` and verify `apps/shell/dist/assets/` contains content-hashed filenames (e.g., `index-BNhqfnX2.js`, `index-CsNiQdh3.css`)
  - [x] 8.2 Verify `apps/shell/dist/config.json` exists (copied from `public/`)
  - [x] 8.3 Verify `apps/shell/dist/index.html` references the hashed asset files
  - [x] 8.4 Run `pnpm dev`, verify the app loads, `/config.json` is fetched from `public/`, and OIDC redirect occurs (same behavior as before Story 1.7 — regression check)

### Review Follow-ups (AI)

- [x] [AI-Review] [HIGH] Fix AC #6: `ConnectionHealthProvider` shows disconnected immediately on first failure when never connected — added `wasEverConnectedRef` to distinguish initial vs reconnection scenarios; initial failures disconnect immediately, previously-connected failures use 3-failure threshold for resilience
- [x] [AI-Review] [HIGH] Fix AC #1: Replace example OIDC strings in `EXAMPLE_CONFIG` and `REQUIRED_FIELDS` with generic placeholders (`<your-oidc-provider>`, `<your-client-id>`, etc.) so production bundle contains no identifiable OIDC configuration
- [x] [AI-Review] [MEDIUM] Fix AC #5: HTTP 404 now renders "Configuration file not found at /config.json" with explicit ConfigMap hint; non-404 errors retain existing wording; deployment hint updated to "Kubernetes: Mount your ConfigMap to /usr/share/nginx/html/config.json"

## Dev Notes

### Critical Implementation Decisions

1. **Config loads BEFORE React mounts.** `loadRuntimeConfig()` is called in `main.tsx` before `createRoot()`. This eliminates all race conditions with `AuthProvider`. The ~5ms fetch of a local JSON file is negligible.

2. **Diagnostic page uses safe DOM methods, not React.** If config fails, React never mounts. Use `document.createElement`, `textContent`, and `appendChild` to build the diagnostic page with inline styles (white background, system font stack, clear error message). All rendered content is developer-controlled static strings — no user input is ever rendered.

3. **Manual validation, not Zod.** For 4 required string fields, a manual type guard with per-field error messages is clearer and more operator-friendly than Zod's generic parse errors. Zod arrives with `@hexalith/cqrs-client` in Epic 2.

4. **Config validation is permissive.** Check required fields exist and are non-empty strings. Silently ignore unknown fields — operators may add custom fields for monitoring or feature flags.

5. **URL normalization.** Strip trailing slashes from `oidcAuthority` and `commandApiBaseUrl` to prevent issues like double-slash in OIDC discovery URL (`authority//.well-known/openid-configuration`).

6. **No secrets in config.json — it's publicly readable.** `config.json` is a static file served by nginx. Anyone can `curl https://yourapp.com/config.json` and read its contents. This is fine because everything in it IS public: the OIDC authority URL is discoverable anyway (`.well-known/openid-configuration`), the client ID is a public identifier (SPAs use PKCE, not client secrets), and the API URL is just a hostname. NEVER add API keys, client secrets, or tokens to config.json. If you need secrets in the frontend, you probably shouldn't have secrets in the frontend.

7. **Cache-busting for config.json.** nginx serves `config.json` with `Cache-Control: no-cache` so ConfigMap updates take effect immediately on next page load. Content-hashed JS/CSS files get long-term caching.

8. **Dev defaults in `public/config.json`.** After `git clone && pnpm install && pnpm dev`, the app works with the local Keycloak setup (same as current hardcoded config). Zero additional setup for developers.

9. **Why runtime config (build-once-deploy-many principle).** Vite `VITE_*` environment variables are baked into the JS bundle at build time. To point at a different OIDC provider, you'd need to rebuild. The Docker image must be identical for dev, staging, and production — only `config.json` changes. This is the industry standard for SPAs deployed to Kubernetes. Do NOT add `VITE_OIDC_AUTHORITY` or similar as a "simpler alternative" — it defeats the entire purpose of this story.

10. **`loadRuntimeConfig` return type is `Promise<RuntimeConfig | null>`.** Returns the validated config on success. On any failure, renders the diagnostic page and returns `null`. `main.tsx` uses a simple `if (config)` guard — no try/catch needed.

11. **Use `setTimeout` + manual `AbortController` for the fetch timeout.** Do NOT use `AbortSignal.timeout(5000)` — it uses the browser's internal timer which is not affected by `vi.useFakeTimers()` in tests. Instead: create an `AbortController`, start a `setTimeout(() => controller.abort(), 5000)`, pass `controller.signal` to `fetch`, and clear the timeout on success.

### Files to Create

| File                                              | Purpose                                                         |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `apps/shell/src/config/types.ts`                  | `RuntimeConfig` interface                                       |
| `apps/shell/src/config/loadRuntimeConfig.ts`      | Fetch, validate, normalize config; render diagnostic on failure |
| `apps/shell/src/config/loadRuntimeConfig.test.ts` | 5-scenario test suite (ATDD)                                    |
| `apps/shell/public/config.json`                   | Dev defaults for local development                              |
| `apps/shell/.env.example`                         | Build-time variable documentation                               |
| `apps/shell/.env`                                 | Local build-time defaults (gitignored)                          |
| `Dockerfile`                                      | Multi-stage production build                                    |
| `nginx.conf`                                      | SPA routing + config.json cache control                         |

### Files to Modify

| File                                                | Changes                                                                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/shell/src/main.tsx`                           | Add config loading before `createRoot`; pass config to `<App />`                                                                        |
| `apps/shell/src/App.tsx`                            | Accept `RuntimeConfig` prop; remove `OIDC_DEV_CONFIG` and `BACKEND_DEV_URL` constants; derive OIDC config from `RuntimeConfig`          |
| `apps/shell/src/App.test.tsx`                       | Update with mock `RuntimeConfig` prop; 3 test cases: OIDC config derivation, backendUrl passthrough, optional field defaults            |
| `apps/shell/src/providers/ShellProviders.tsx`       | Add `tenantClaimName` prop; pass to `AuthProvider`                                                                                      |
| `packages/shell-api/src/auth/AuthProvider.tsx`      | Add `tenantClaimName?: string` prop; replace hardcoded `"eventstore:tenant"` in `mapUser` with `tenantClaimName ?? "eventstore:tenant"` |
| `packages/shell-api/src/auth/AuthProvider.test.tsx` | Update tests to verify configurable `tenantClaimName` prop works alongside existing hardcoded default tests                             |
| `.gitignore`                                        | Add `.env` (not `.env.example`)                                                                                                         |

### Architecture Compliance

- **Architecture Decision #9:** "Environment configuration = Vite `.env` (build-time) + runtime `/config.json` (deployment-time)." This story implements exactly that.
- **Architecture file structure:** `apps/shell/src/config/loadRuntimeConfig.ts` and `types.ts` match the architecture doc's project tree (line 1145-1147).
- **Naming conventions:** `loadRuntimeConfig` (camelCase function), `RuntimeConfig` (PascalCase type), `loadRuntimeConfig.test.ts` (co-located test). All per architecture naming rules.
- **Deployment topology:** Architecture specifies nginx serving static SPA with runtime config via Kubernetes ConfigMap mounted as `/config.json`. Dockerfile and nginx.conf implement this exactly.
- **`loadRuntimeConfig.ts` diagnostic fallback:** Architecture line 1523 specifies "handles missing `/config.json` with a diagnostic fallback page showing expected config location, required fields, and deployment hints. Never a white screen."

### Library & Framework Requirements

| Dependency | Version            | Purpose                 | Notes                                                                                                 |
| ---------- | ------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Vite       | ^6.0.0             | Build tool + dev server | Already installed. Content-hashes filenames by default. `.env` files with `VITE_` prefix are built-in |
| nginx      | alpine (Docker)    | Static file server      | Production only. SPA try_files pattern                                                                |
| Node.js    | 22-alpine (Docker) | Build stage             | Matches architecture spec (Node.js 22.x LTS)                                                          |

**No new runtime dependencies.** Config loading uses native `fetch` API + `AbortController` (both available in all modern browsers). No Zod, no config library.

### Testing Requirements

**Test file:** `apps/shell/src/config/loadRuntimeConfig.test.ts`

**Test matrix (5 core scenarios):**

| #   | Scenario                | Setup                                                              | Expected                                                               |
| --- | ----------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 1   | Valid config            | Mock fetch returns valid JSON with all required fields             | Returns `RuntimeConfig` object with normalized URLs                    |
| 2   | Missing file            | Mock fetch returns 404                                             | Calls `renderDiagnosticPage` with "not found" message                  |
| 3   | Malformed JSON          | Mock fetch returns 200 with `{invalid`                             | Calls `renderDiagnosticPage` with "invalid JSON" + SyntaxError message |
| 4   | Missing required fields | Mock fetch returns `{ "oidcAuthority": "..." }` (missing 3 fields) | Calls `renderDiagnosticPage` listing missing fields                    |
| 5   | Fetch timeout           | Mock fetch that never resolves, advance AbortController            | Calls `renderDiagnosticPage` with "took too long" message              |

**Additional test cases:**

- Valid config with optional fields → optional fields used instead of defaults
- Valid config with extra unknown fields → unknown fields ignored, no error
- URL normalization → trailing slashes stripped from `oidcAuthority` and `commandApiBaseUrl`
- HTTP warning → console.warn when `oidcAuthority` is HTTP on non-localhost
- Diagnostic page content verification → `renderDiagnosticPage("Config not found", [...])` produces DOM elements with correct `textContent` (don't just assert it was called — verify WHAT it renders)

**App.test.tsx test cases (3 minimum):**

- OIDC config derived from RuntimeConfig: `authority` matches `config.oidcAuthority`, `client_id` matches `config.oidcClientId`
- `backendUrl` passed to ShellProviders from `config.commandApiBaseUrl`
- Optional fields use defaults: `scope` = `"openid profile email"`, `redirect_uri` = `window.location.origin` when not in config

**AuthProvider.test.tsx additions (1 minimum):**

- Custom `tenantClaimName` prop extracts tenants from the specified JWT claim instead of the default `"eventstore:tenant"`

**Testing approach:** Mock global `fetch` using `vi.fn()`. Mock `document.getElementById` for diagnostic page tests. Use `vi.useFakeTimers()` for timeout test. `main.tsx` is not unit-testable (entry point) — covered by Task 8.4 manual smoke test.

### Project Structure Notes

- New `config/` directory in `apps/shell/src/` — aligns with architecture doc's project tree
- `public/config.json` — Vite copies `public/` contents to `dist/` at build time. This means the dev config.json will be in the Docker image. This is intentional — Kubernetes ConfigMap mount at `/usr/share/nginx/html/config.json` shadows it in production
- `Dockerfile` and `nginx.conf` at project root — standard placement for single-app repos. Story 1.8 (CI) will reference these
- **Kubernetes ConfigMap note:** If operators use `subPath` mount for a single file, the file does NOT auto-update on ConfigMap change (Kubernetes limitation). For config changes to take effect: (1) mount the entire directory instead of subPath, OR (2) restart/rollout pods. Since the SPA reads config once on page load, users must also refresh the browser after any config change

### Previous Story Intelligence

**From Story 1.5 (Layout & Auth Flow):**

- `App.tsx` already has the `OIDC_DEV_CONFIG` with a `// Story 1.7 replaces...` comment — the team anticipated this refactor
- `ShellProviders.tsx` accepts `oidcConfig` and `backendUrl` as props — the interface is ready for runtime config injection
- Provider hierarchy: `AuthProvider` → `TenantProvider` → `ConnectionHealthProvider` → `FormDirtyProvider` → `ThemeProvider` → `LocaleProvider`
- `AuthGate.tsx` handles loading/redirect states — no changes needed

**From Story 1.6 (Tenant Switching & Status Bar):**

- `ConnectionHealthProvider` already accepts `backendUrl` prop and tracks backend reachability
- Status bar already shows connection health (green/amber/red dots)
- `DisconnectionBanner` appears after 10s of disconnection
- Story 1.7 only needs to pass `config.commandApiBaseUrl` instead of the hardcoded `BACKEND_DEV_URL`

### Git Intelligence

**Recent commit:** `536092c feat(shell): implement shell application layout and authentication flow`

- Established: CSS Modules pattern, co-located tests, provider composition, design token usage
- Files modified: `apps/shell/src/` (App.tsx, main.tsx, layout/, pages/, providers/, auth/)
- Pattern: PascalCase components, camelCase hooks, `.module.css` for styles

**Conventions to follow:**

- Co-located `.test.ts` files next to source
- CSS Modules for any styled components (diagnostic page uses inline styles — exception because it renders before CSS loads)
- Explicit `React.JSX.Element` return types on components
- `import React from "react"` at top of component files

### RuntimeConfig Type Reference

```typescript
// apps/shell/src/config/types.ts
export interface RuntimeConfig {
  /** OIDC provider URL, e.g. "https://keycloak.example.com/realms/hexalith" */
  oidcAuthority: string;
  /** OIDC client ID for this SPA, e.g. "hexalith-frontshell" */
  oidcClientId: string;
  /** Backend API base URL, e.g. "https://api.example.com" */
  commandApiBaseUrl: string;
  /** JWT claim name containing tenant list, e.g. "eventstore:tenant" */
  tenantClaimName: string;
  /** OIDC scopes (default: "openid profile email") */
  oidcScope?: string;
  /** OIDC redirect URI after login (default: window.location.origin) */
  oidcRedirectUri?: string;
  /** OIDC redirect URI after logout (default: window.location.origin) */
  oidcPostLogoutRedirectUri?: string;
}
```

### config.json Example Reference

```json
{
  "oidcAuthority": "https://keycloak.example.com/realms/hexalith",
  "oidcClientId": "hexalith-frontshell",
  "commandApiBaseUrl": "https://api.example.com",
  "tenantClaimName": "eventstore:tenant"
}
```

### Dockerfile Reference

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
# Submodules must be initialized before Docker build
# CI handles this via actions/checkout with submodules: recursive
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm build --filter=shell

FROM nginx:alpine
COPY --from=builder /app/apps/shell/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# In production: mount ConfigMap to /usr/share/nginx/html/config.json
EXPOSE 80
```

### nginx.conf Reference

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # config.json: never cache (ConfigMap updates must take effect immediately)
    # NOTE: add_header in a location block replaces ALL server-level headers.
    # If security headers (X-Frame-Options, etc.) are added at server level later,
    # they must be repeated here or use nginx-extras more_set_headers module.
    location = /config.json {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Content-Type "application/json";
    }

    # Static assets: long-term cache (content-hashed filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/html text/css application/javascript application/json;
}
```

### Diagnostic Page Structure Reference

The diagnostic page rendered by `renderDiagnosticPage` should follow this structure:

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   ⚠ Configuration Error                             │
│                                                      │
│   {error title — e.g., "Configuration file not       │
│   found at /config.json"}                            │
│                                                      │
│   Details:                                           │
│   • {detail line 1}                                  │
│   • {detail line 2}                                  │
│                                                      │
│   Expected config.json format:                       │
│   ┌──────────────────────────────────────────────┐   │
│   │ {                                            │   │
│   │   "oidcAuthority": "https://...",            │   │
│   │   "oidcClientId": "hexalith-frontshell",     │   │
│   │   "commandApiBaseUrl": "https://...",        │   │
│   │   "tenantClaimName": "eventstore:tenant"     │   │
│   │ }                                            │   │
│   └──────────────────────────────────────────────┘   │
│                                                      │
│   Deployment: Mount your configuration as             │
│   /usr/share/nginx/html/config.json                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Inline styles: white background, system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`), max-width 600px centered with margin auto, 24px padding. Error heading in `#c0392b` (red). Code block with `#f8f9fa` background, monospace font, 1px solid `#dee2e6` border.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — "Environment Configuration" section, lines 514-537]
- [Source: _bmad-output/planning-artifacts/architecture.md — "Deployment Structure" Dockerfile, lines 1671-1684]
- [Source: _bmad-output/planning-artifacts/architecture.md — "loadRuntimeConfig.ts" diagnostic fallback, line 1523]
- [Source: _bmad-output/planning-artifacts/architecture.md — Architecture Decision #9, line 208]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project tree apps/shell/src/config/, lines 1144-1147]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.7 ACs, lines 589-623]
- [Source: apps/shell/src/App.tsx — Hardcoded OIDC_DEV_CONFIG with Story 1.7 comment, lines 11-21]
- [Source: apps/shell/src/providers/ShellProviders.tsx — ShellProvidersProps interface, lines 13-23]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Turbo cache was stale for `@hexalith/shell-api:build` — replaying old 2.30KB bundle that lacked Story 1.6 exports (`useConnectionHealth`, `ConnectionHealthProvider`, etc.). Fixed by clearing `.turbo` cache.
- Vite default build target `es2020` does not support top-level `await`. Fixed by setting `build.target: "es2022"` in `vite.config.ts`.
- 2 pre-existing test failures in `@hexalith/ui` `contrastMatrix.test.ts` (theme snapshot alignment with `colors.css`) — unrelated to this story.

### Completion Notes List

- Created `RuntimeConfig` type interface with 4 required and 3 optional fields
- Implemented `loadRuntimeConfig()` with fetch + 5s timeout via `setTimeout`/`AbortController`, field-by-field validation, URL normalization, HTTP warning on non-localhost, and `renderDiagnosticPage()` for all failure modes (safe DOM methods, no React)
- ATDD: 11 tests written first and all pass (5 core scenarios + 6 additional: optional fields, unknown fields, URL normalization, HTTP warning, network error, diagnostic content)
- Updated `main.tsx` with top-level `await` — config loads before React mounts
- Updated `App.tsx` to accept `RuntimeConfig` prop, derive OIDC config with defaults, removed hardcoded `OIDC_DEV_CONFIG` and `BACKEND_DEV_URL`
- Updated `AuthProvider.tsx` with configurable `tenantClaimName` prop (default: `"eventstore:tenant"`)
- Updated `ShellProviders.tsx` to pass `tenantClaimName` through to `AuthProvider`
- Added 3 App test cases (OIDC config derivation, backendUrl passthrough, optional field defaults) + 2 AuthProvider tests (custom claim name, default claim name)
- Created `public/config.json` with dev defaults matching previous hardcoded values
- Created `.env.example` and `.env` for build-time variables
- Created `Dockerfile` (multi-stage: node:22-alpine builder → nginx:alpine)
- Created `nginx.conf` (SPA fallback, config.json no-cache, assets long-term cache, gzip)
- Updated `vite.config.ts` build target to `es2022` for top-level await support
- Build verified: content-hashed assets (`index-BNhqfnX2.js`, `index-CsNiQdh3.css`), config.json present, index.html correct
- Full regression suite: 245/247 pass (2 pre-existing failures in @hexalith/ui)
- ✅ Resolved review finding [HIGH]: ConnectionHealthProvider now shows "disconnected" immediately on first failure when never connected (wasEverConnectedRef tracks connection state; 3-failure threshold preserved for reconnection resilience)
- ✅ Resolved review finding [HIGH]: Replaced OIDC example strings in EXAMPLE_CONFIG and REQUIRED_FIELDS with generic placeholders — production bundle no longer contains identifiable OIDC configuration (verified: `keycloak.example.com` and `hexalith-frontshell` absent from built JS)
- ✅ Resolved review finding [MEDIUM]: HTTP 404 now renders "Configuration file not found at /config.json" with explicit ConfigMap hint; deployment hint updated to "Kubernetes: Mount your ConfigMap to /usr/share/nginx/html/config.json"
- Post-review regression suite: shell-api 89/89 pass, shell 79/79 pass
- Post-review build verified: new content hash (`index-BZsr7o_W.js`), no OIDC strings in bundle

### File List

**Created:**

- `apps/shell/src/config/types.ts` — RuntimeConfig interface
- `apps/shell/src/config/loadRuntimeConfig.ts` — fetch, validate, normalize config; diagnostic page on failure
- `apps/shell/src/config/loadRuntimeConfig.test.ts` — 11-test ATDD suite
- `apps/shell/public/config.json` — dev defaults for local development
- `apps/shell/.env.example` — build-time variable documentation
- `apps/shell/.env` — local build-time defaults (gitignored)
- `Dockerfile` — multi-stage production build
- `nginx.conf` — SPA routing + config.json cache control

**Modified:**

- `apps/shell/src/main.tsx` — loads config before React via top-level await
- `apps/shell/src/App.tsx` — accepts RuntimeConfig prop, derives OIDC config, removed hardcoded constants
- `apps/shell/src/App.test.tsx` — 6 tests (3 existing updated + 3 new for config derivation)
- `apps/shell/src/config/loadRuntimeConfig.ts` — [review] replaced OIDC example strings with generic placeholders; 404-specific diagnostic with ConfigMap hint; deployment hint updated
- `apps/shell/src/config/loadRuntimeConfig.test.ts` — [review] updated 404 test assertions and diagnostic content verification
- `apps/shell/src/providers/ShellProviders.tsx` — added tenantClaimName prop
- `apps/shell/vite.config.ts` — added build.target: "es2022"
- `.gitignore` — added `.env` ignore rule for local development files
- `packages/shell-api/src/auth/AuthProvider.tsx` — configurable tenantClaimName prop through to mapUser
- `packages/shell-api/src/auth/AuthProvider.test.tsx` — 2 new tests for configurable tenantClaimName
- `packages/shell-api/src/connection/ConnectionHealthContext.tsx` — [review] added wasEverConnectedRef for immediate disconnect on initial failure
- `packages/shell-api/src/connection/ConnectionHealthContext.test.tsx` — [review] updated tests for immediate disconnect behavior and 3-failure reconnection threshold

## Senior Developer Review (AI)

### Review Date

2026-03-13

### Outcome

Approved

### Summary

- Acceptance criteria are satisfied in the current implementation and targeted tests pass.
- The repository working tree still contains a very large number of unrelated hidden-tooling changes, so git-vs-story validation remains inconclusive for this story's historical implementation files.
- Story documentation is now aligned with the implemented file set, including the root `.gitignore` update for `.env`.

### Findings

- [x] [HIGH] AC #6 / Detailed BDD #8 is not met: unreachable backend does **not** show a disconnected state immediately. `ConnectionHealthProvider` starts at `"reconnecting"`, only transitions to `"disconnected"` after 3 failures, and therefore delays the required disconnected status. Evidence: `packages/shell-api/src/connection/ConnectionHealthContext.tsx:19`, `:28`, `:81-84`. **RESOLVED:** Added `wasEverConnectedRef` — first failure disconnects immediately when never connected; 3-failure threshold preserved for reconnection resilience.
- [x] [HIGH] AC #1 detailed BDD says no hardcoded OIDC configuration should remain in built JavaScript, but the production bundle still embeds example OIDC authority and client ID strings via the diagnostic-page example config. Evidence: `apps/shell/dist/assets/index-BNhqfnX2.js:61`. **RESOLVED:** Replaced with generic placeholders (`<your-oidc-provider>`, `<your-client-id>`, etc.). Verified: no OIDC strings in new bundle `index-BZsr7o_W.js`.
- [x] [MEDIUM] AC #5 / Detailed BDD #4 expects missing `/config.json` to display `"Configuration file not found at /config.json"` and include a Kubernetes ConfigMap hint. For HTTP 404, the implementation instead renders `"config.json returned HTTP 404"`, and the deployment hint omits the explicit ConfigMap wording. Evidence: `apps/shell/src/config/loadRuntimeConfig.ts:83`, `:120`. **RESOLVED:** 404 now shows "Configuration file not found at /config.json" with "Mount your ConfigMap" hint; deployment hint updated to "Kubernetes: Mount your ConfigMap to /usr/share/nginx/html/config.json".
- [x] [MEDIUM] Dev Agent Record → File List was inaccurate. The story documented `apps/shell/.gitignore` as a modified file, but the implemented `.env` ignore rule is in the repository root `.gitignore`, and `apps/shell/.gitignore` does not exist. **RESOLVED:** Corrected the story record to reference root `.gitignore`, which already contains the `.env` ignore rule.

### Acceptance Criteria Audit

- AC #1: Pass — static artifact with hashed assets; no OIDC strings in production bundle (verified post-review).
- AC #2: Pass — runtime `/config.json` is loaded before React mounts and values are passed through.
- AC #3: Pass — OIDC provider configuration is derived from runtime config in `App.tsx` / `ShellProviders.tsx`.
- AC #4: Pass — build-once/deploy-many structure with generic placeholders in diagnostic page.
- AC #5: Pass — 404 shows "Configuration file not found at /config.json" with Kubernetes ConfigMap hint.
- AC #6: Pass — disconnected state shown immediately on first failure when never connected.
- AC #7: Pass — `.env.example` exists and documents build-time constants.

### Final Decision

- Story is ready to mark `done`.
- No remaining HIGH or MEDIUM findings.

### Verification

- Targeted tests passed: `apps/shell/src/config/loadRuntimeConfig.test.ts`, `apps/shell/src/App.test.tsx`, `packages/shell-api/src/auth/AuthProvider.test.tsx`, and `packages/shell-api/src/connection/ConnectionHealthContext.test.tsx` (48/48).
- Static build evidence verified: `apps/shell/dist/index.html` references hashed assets and `apps/shell/dist/config.json` is present.
- Built bundle check verified that real OIDC defaults are absent while generic diagnostic placeholders remain.

## Change Log

- 2026-03-13 — Senior Developer Review (AI): changes requested; story moved from `review` back to `in-progress`; sprint tracking requires sync.
- 2026-03-13 — Addressed code review findings — 3 items resolved (2 HIGH, 1 MEDIUM): ConnectionHealthProvider immediate disconnect, OIDC example string removal from bundle, 404 diagnostic wording with ConfigMap hint. All tests pass (shell-api 89/89, shell 79/79). Build verified clean.
- 2026-03-13 — Senior Developer Review (AI): follow-up verification completed. Acceptance criteria pass in code and targeted tests (48/48), but Dev Agent Record File List still incorrectly names `apps/shell/.gitignore` instead of root `.gitignore`; story remains `in-progress` until the record is corrected.
- 2026-03-13 — Corrected Dev Agent Record File List to reference root `.gitignore`; remaining review finding resolved and story promoted to `done`.
