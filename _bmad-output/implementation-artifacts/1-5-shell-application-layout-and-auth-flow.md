# Story 1.5: Shell Application — Layout & Auth Flow

Status: done

<!-- Validated: 2026-03-13 — all source artifacts checked, codebase assumptions verified -->

## Story

As an end user,
I want to authenticate via OIDC and see a consistent shell layout with sidebar, top bar, and content area,
So that I have a reliable, visually consistent entry point to the platform.

## Scope Boundaries

### IN Scope

- `ShellProviders.tsx` in `apps/shell/src/providers/` — composes provider hierarchy: AuthProvider → TenantProvider → ThemeProvider → LocaleProvider
- `ShellLayout.tsx` + CSS Module in `apps/shell/src/layout/` — CSS Grid shell layout with semantic HTML landmarks (`<header>`, `<nav>`, `<main>`)
- `TopBar.tsx` + CSS Module — shows authenticated user name, theme toggle button, logout button
- `Sidebar.tsx` + CSS Module — collapsible sidebar with hardcoded placeholder navigation items
- Status bar placeholder inlined in `ShellLayout.tsx` — minimal `<div>` showing active tenant name (full StatusBar component replaces this in Story 1.6; not worth a separate file for a throwaway)
- `AuthGate.tsx` in `apps/shell/src/auth/` — conditional rendering: loading screen while auth initializes, redirect indicator for unauthenticated, children when authenticated
- `WelcomePage.tsx` in `apps/shell/src/pages/` — "Welcome to Hexalith.FrontShell" placeholder with design tokens
- `App.tsx` — root component: ShellProviders wrapping react-router v7 `RouterProvider`
- Updated `main.tsx` — simplified to render `<App />`
- react-router v7 setup: `createBrowserRouter` + `RouterProvider` + `<Outlet />` in ShellLayout
- Auth flow: OIDC redirect when no session, return to original URL after auth (leverages AuthProvider from Story 1.3)
- Logout flow: TopBar logout button calls `signoutRedirect()` (OIDC library reads session data internally before redirect — do NOT clear sessionStorage before calling)
- Hardcoded OIDC dev config (runtime `/config.json` loading is Story 1.7)
- CSS Modules using design tokens exclusively — zero hardcoded spacing, colors, or typography
- Co-located Vitest tests; ATDD: failing tests written BEFORE implementation (Epic 1 mandate)

### OUT of Scope

- Full StatusBar with connection health, command status, tenant switching dropdown (Story 1.6)
- Runtime `/config.json` loading and environment switching (Story 1.7)
- CI pipeline (Story 1.8)
- Module registry and route generation from manifests (Story 5.1-5.2)
- ModuleErrorBoundary and error isolation (Story 5.3)
- Navigation state preservation and caching (Story 5.4)
- QueryClientProvider / @tanstack/react-query (Epic 2 — NOT needed until cqrs-client)
- Any @hexalith/ui library components (Epic 3 — shell uses raw HTML + CSS Modules + design tokens)
- Command palette (Phase 1.5)
- Responsive sidebar collapse below 1280px (MVP defines breakpoint tokens but full responsive behavior is Phase 2; see note below)
- E2E / Playwright tests (Story 1.8+)

**Responsive MVP note:** Sidebar renders at 240px fixed width for 1280px+ viewports. Collapsed (64px) and hidden (<1024px) states are structurally prepared in CSS (grid template areas) but NOT actively toggled — toggle logic deferred to Phase 2 or a later sprint. The `collapsed` CSS class and grid area definitions ship now to prevent retrofitting.

## Dependencies

- **Story 1.1** (Monorepo Scaffold) — `apps/shell/` stub. **Done**
- **Story 1.2** (Design Tokens) — `:root[data-theme="light|dark"]` CSS, all spacing/color/typography tokens. **Done**
- **Story 1.3** (Auth Provider) — `AuthProvider`, `useAuth()`, `AuthUser.tenantClaims`, `signinRedirect`, `signoutRedirect`. **Done**
- **Story 1.4** (Tenant, Theme & Locale Providers) — `TenantProvider`, `useTenant()`, `ThemeProvider`, `useTheme()`, `LocaleProvider`, `useLocale()`, `MockShellProvider`, `createMockAuthContext`, `createMockTenantContext`. **Done**
- No blocking dependencies — proceed immediately

## Acceptance Criteria

| AC  | Summary                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | Provider hierarchy renders: AuthProvider → TenantProvider → ThemeProvider → LocaleProvider → layout                                    |
| #2  | Layout renders sidebar (240px), top bar, and main content area using CSS Grid with design tokens                                       |
| #3  | Unauthenticated user is redirected to OIDC provider; after auth, returned to originally requested URL                                  |
| #4  | Logout button terminates session via `signoutRedirect()`, redirects to OIDC logout endpoint                                            |
| #5  | Semantic HTML landmarks: `<nav>` for sidebar, `<main>` for content, `<header>` for top bar                                             |
| #6  | All shell CSS uses design tokens exclusively — token compliance scanner passes at 100%                                                 |
| #7  | At 1280px desktop viewport, sidebar is visible and content fills remaining width without horizontal overflow                           |
| #8  | Placeholder welcome page renders with: user name in top bar, active tenant visible, sidebar with placeholder nav, theme toggle working |

**Detailed BDD:**

1. **Given** the shell application is configured with all providers
   **When** the app loads after authentication
   **Then** the provider hierarchy is: AuthProvider → TenantProvider → ThemeProvider → LocaleProvider → router → layout

2. **Given** the ShellLayout component is rendered
   **When** inspecting the DOM
   **Then** a `<header>` element contains the top bar, a `<nav>` element contains the sidebar, a `<main>` element contains the routed content
   **And** the layout uses CSS Grid with `grid-template-areas` for sidebar, header, main, and statusbar zones
   **And** all CSS values use design tokens (e.g., `var(--spacing-*)`, `var(--color-*)`, `var(--font-*)`)

3. **Given** a user navigates to the shell URL without authentication
   **When** the app detects no valid session
   **Then** AuthProvider redirects to the configured OIDC provider
   **And** after successful authentication, the user is returned to the originally requested URL (handled by AuthProvider's `onSigninCallback`)

4. **Given** an authenticated user clicks the logout button in the top bar
   **When** the logout action executes
   **Then** `signoutRedirect()` is called (from `useAuth()`) which handles session cleanup and OIDC logout internally
   **And** the user is redirected to the OIDC provider's logout endpoint
   **And** `react-oidc-context` clears its own sessionStorage entries as part of the signout flow

5. **Given** the shell layout is rendered on a 1280px desktop viewport
   **When** inspecting the layout
   **Then** the sidebar is visible at 240px width, the content area fills the remaining width
   **And** no horizontal scrollbar appears
   **And** the layout height is exactly `100vh` (sidebar and main scroll independently if needed)

6. **Given** the shell has no real modules yet
   **When** the authenticated user sees the shell
   **Then** a welcome page renders with "Welcome to Hexalith.FrontShell" heading
   **And** the top bar shows the authenticated user's name (from `useAuth().user.name`)
   **And** a minimal status bar area shows the active tenant name (from `useTenant().activeTenant`)
   **And** the sidebar shows hardcoded placeholder navigation items
   **And** the theme toggle button in the top bar switches between light and dark themes

## Tasks / Subtasks

### ATDD Phase

- [x] Task 0: Write failing acceptance tests from ACs (AC: #1-#8)
  - [x] 0.1 `providers/ShellProviders.test.tsx` — tests for AC #1: provider hierarchy renders correctly
  - [x] 0.2 `layout/ShellLayout.test.tsx` — tests for AC #2, #5, #7: semantic landmarks, grid layout, viewport behavior
  - [x] 0.3 `layout/TopBar.test.tsx` — tests for AC #4, #8: user name display, theme toggle, logout button
  - [x] 0.4 `layout/Sidebar.test.tsx` — tests for AC #8: placeholder navigation renders
  - [x] 0.5 `auth/AuthGate.test.tsx` — tests for AC #3: loading state, redirect indicator, authenticated rendering
  - [x] 0.6 `pages/WelcomePage.test.tsx` — tests for AC #8: welcome heading renders
  - [x] 0.7 `App.test.tsx` — integration test: full app renders with mocked providers
  - [x] 0.8 Verify `pnpm --filter @hexalith/shell test` — all tests fail (red phase)

### Implementation Phase

- [x] Task 1: Add dependencies to `apps/shell/package.json`
  - [x] 1.1 Add `@hexalith/shell-api: "workspace:*"` to `dependencies`
  - [x] 1.2 Add `react-router: "^7.6.0"` to `dependencies`
  - [x] 1.3 Add `@testing-library/react: "^16.0.0"` and `@testing-library/jest-dom: "^6.0.0"` to `devDependencies`
  - [x] 1.4 Run `pnpm install`
  - [x] 1.5 Ensure `pnpm build` still succeeds after adding dependencies

- [x] Task 2: Create ShellProviders (AC: #1)
  - [x] 2.1 Create `apps/shell/src/providers/ShellProviders.tsx`
  - [x] 2.2 Compose providers in exact order: AuthProvider → TenantProvider → ThemeProvider → LocaleProvider
  - [x] 2.3 AuthProvider receives OIDC config as props (hardcoded dev defaults in this story)
  - [x] 2.4 Export `ShellProviders` and `ShellProvidersProps` (oidcConfig as required prop)

- [x] Task 3: Create AuthGate (AC: #3)
  - [x] 3.1 Create `apps/shell/src/auth/AuthGate.tsx`
  - [x] 3.2 Uses `useAuth()` to check `isLoading`, `isAuthenticated`, `error`
  - [x] 3.3 `isLoading: true` → render loading screen (centered spinner/text using design tokens)
  - [x] 3.4 OIDC callback detection: if URL contains `?code=` and `&state=` params, treat as "Processing login..." (show loading, not "redirecting") — this prevents a visual flash during the OIDC callback-to-authenticated transition
  - [x] 3.5 `error` → render auth error screen with error message and retry button
  - [x] 3.6 `!isAuthenticated` (and not callback) → render "Redirecting to login..." visual indicator only. Do NOT call `signinRedirect()` — AuthProvider's AuthContextBridge already triggers it automatically (verified in source)
  - [x] 3.7 `isAuthenticated` → render `children`

- [x] Task 4: Create ShellLayout (AC: #2, #5, #7)
  - [x] 4.1 Create `apps/shell/src/layout/ShellLayout.tsx`
  - [x] 4.2 CSS Grid with `grid-template-areas`: `"header header"` / `"sidebar main"` / `"statusbar statusbar"`
  - [x] 4.3 Grid columns: `240px 1fr` (sidebar width from UX spec)
  - [x] 4.4 Grid rows: `auto 1fr auto` (top bar auto height, main fills, status bar auto)
  - [x] 4.5 Semantic landmarks: `<header>` wraps TopBar, `<nav>` wraps Sidebar, `<main>` wraps `<Outlet />`
  - [x] 4.6 Layout height: `100vh` on root grid container
  - [x] 4.7 Main content area: `overflow-y: auto` for independent scrolling
  - [x] 4.8 Create `ShellLayout.module.css` with design tokens only

- [x] Task 5: Create TopBar (AC: #4, #8)
  - [x] 5.1 Create `apps/shell/src/layout/TopBar.tsx`
  - [x] 5.2 Display user name from `useAuth().user?.name ?? 'Unknown User'`
  - [x] 5.3 Theme toggle button: calls `useTheme().toggleTheme()`, shows current theme label
  - [x] 5.4 Logout button: calls `useAuth().signoutRedirect()` directly — do NOT call `sessionStorage.clear()` beforehand (react-oidc-context needs session data like `id_token_hint` to perform OIDC logout)
  - [x] 5.5 Layout: flexbox row with `justify-content: space-between` (logo/title left, actions right)
  - [x] 5.6 `aria-label="Shell header"` on the wrapping `<header>`
  - [x] 5.7 Create `TopBar.module.css` with design tokens only

- [x] Task 6: Create Sidebar (AC: #8)
  - [x] 6.1 Create `apps/shell/src/layout/Sidebar.tsx`
  - [x] 6.2 Hardcoded placeholder nav items: `[{ label: 'Home', path: '/' }, { label: 'Tenants', path: '/tenants' }]`
  - [x] 6.3 Each item is a react-router `<NavLink>` with `aria-current="page"` on active. CRITICAL: Home link (`to="/"`) MUST use the `end` prop — without it, NavLink matches every route as "active" because all paths start with `/`
  - [x] 6.4 `aria-label="Main navigation"` on the wrapping `<nav>`
  - [x] 6.5 Sidebar width: 240px fixed (matches `grid-template-columns` in ShellLayout)
  - [x] 6.6 Prepare CSS class `.collapsed` for 64px width (not toggled yet — structural preparation)
  - [x] 6.7 Create `Sidebar.module.css` with design tokens only

- [x] Task 7: Inline status bar placeholder in ShellLayout (AC: #8)
  - [x] 7.1 Add a `<div>` in the statusbar grid area of ShellLayout — NOT a separate component (Story 1.6 replaces with full StatusBar component)
  - [x] 7.2 Display: `Tenant: {useTenant().activeTenant ?? 'No tenant selected'}`
  - [x] 7.3 Style in `ShellLayout.module.css`: height 28px, background `var(--color-surface-secondary)`, top border `var(--color-border-default)`
  - [x] 7.4 Tenant label: `var(--font-size-sm)` + `var(--font-weight-medium)` + `var(--color-text-primary)` (promoted readability per UX spec)
  - [x] 7.5 `aria-label="Status bar"` on the `<div>`

- [x] Task 8: Create WelcomePage and NotFoundPage (AC: #8)
  - [x] 8.1 Create `apps/shell/src/pages/WelcomePage.tsx`
  - [x] 8.2 Render `<h1>Welcome to Hexalith.FrontShell</h1>` with design token typography
  - [x] 8.3 Show brief platform description paragraph
  - [x] 8.4 Create `apps/shell/src/pages/NotFoundPage.tsx` — simple "Page not found" heading with a `<Link to="/">Back to Home</Link>` (catches unmatched routes so users don't see a blank content area)
  - [x] 8.5 All pages styled with design tokens — no hardcoded values

- [x] Task 9: Create App.tsx and wire routing (AC: #1, #3)
  - [x] 9.1 Create `apps/shell/src/App.tsx`
  - [x] 9.2 Define OIDC dev config constant (authority, client_id, redirect_uri, scope — hardcoded, Story 1.7 replaces)
  - [x] 9.3 Create router with `createBrowserRouter`: root route → ShellLayout with Outlet, index route → WelcomePage, catch-all `path: "*"` route → simple "Page not found" element with link back to Home
  - [x] 9.4 Render: `<ShellProviders oidcConfig={devOidcConfig}><AuthGate><RouterProvider router={router} /></AuthGate></ShellProviders>`
  - [x] 9.5 Update `main.tsx` to import and render `<App />`

- [x] Task 10: Update global.css (AC: #6)
  - [x] 10.1 Remove `.app-shell` placeholder styles (replaced by ShellLayout)
  - [x] 10.2 Ensure `#root` has `height: 100vh` (not just `min-height`)
  - [x] 10.3 Add skip-navigation link styles (hidden, visible on focus)

### Validation Phase

- [x] Task 11: Green phase
  - [x] 11.1 `pnpm --filter @hexalith/shell test` — all tests pass
  - [x] 11.2 `pnpm --filter @hexalith/shell build` — builds without errors
  - [x] 11.3 `pnpm --filter @hexalith/shell lint` — no ESLint violations
  - [~] 11.4 Verify `pnpm dev` starts and shows the shell layout in browser (manual check — intentionally not completed in this review pass because local visual verification depends on running Keycloak or temporarily bypassing AuthGate, which must not be committed)
  - [x] 11.5 Verify all CSS uses design tokens — no hardcoded pixel/color/font values

## Dev Notes

### Critical Implementation Checklist

**Provider Hierarchy (ShellProviders.tsx):**

- [ ] Exact nesting order: AuthProvider → TenantProvider → ThemeProvider → LocaleProvider → children
- [ ] Do NOT add QueryClientProvider yet — it's Epic 2 scope (@tanstack/react-query not needed until cqrs-client)
- [ ] AuthProvider receives OIDC settings as spread props (verified: `AuthProviderProps extends UserManagerSettings` — pass `authority`, `client_id`, etc. directly as JSX props, NOT as a nested `settings` object)
- [ ] All other providers take no special props (they read from their parent contexts)
- [ ] Explicit `React.JSX.Element` return type (DTS generation — Story 1.3 learning)

**AuthGate (auth/AuthGate.tsx):**

- [ ] MUST be rendered INSIDE ShellProviders (needs useAuth() from AuthProvider)
- [ ] MUST be rendered OUTSIDE RouterProvider (guards the entire app, not individual routes)
- [ ] Loading state: centered text "Loading..." with design token styling (not a full spinner component — @hexalith/ui doesn't exist yet)
- [x] OIDC callback detection: check `window.location.search` for BOTH `code` and `state` params → show "Processing login..." (not "Redirecting..."). This prevents a visual flash between OIDC callback arrival and AuthProvider processing the code exchange. Pattern: `const isOidcCallback = searchParams.has('code') && searchParams.has('state');`
- [ ] Error state: show `error.message` with a "Retry" button that calls `window.location.reload()`
- [ ] Redirecting state: "Redirecting to login..." — this is a VISUAL INDICATOR only. Do NOT call `signinRedirect()` here. AuthProvider's internal `AuthContextBridge` already triggers `signinRedirect()` automatically when `!isLoading && !isAuthenticated && !error && !activeNavigator` (verified in Story 1.3 source code). Calling it again from AuthGate would cause a double-redirect race.

**ShellLayout CSS Grid:**

- [ ] Grid container: `height: 100vh; display: grid;`
- [ ] `grid-template-columns: 240px 1fr;`
- [ ] `grid-template-rows: auto 1fr auto;`
- [ ] `grid-template-areas: "header header" "sidebar main" "statusbar statusbar";`
- [ ] Header area spans both columns (top bar is full width)
- [ ] Status bar area spans both columns (full width, fixed 28px)
- [ ] Main area: `overflow-y: auto; min-width: 0;` — `min-width: 0` is CRITICAL to prevent CSS Grid overflow (grid children default to `min-width: auto` which respects content intrinsic size and can force the track wider than `1fr`)
- [ ] Sidebar area: `overflow-y: auto;` for independent nav scrolling
- [ ] NO hardcoded pixel values in CSS — use design tokens for spacing/colors/fonts
- [ ] Exception: grid column `240px` is the sidebar width from UX spec (no token exists for it; define as CSS custom property `--shell-sidebar-width: 240px` in the module CSS)

**TopBar:**

- [ ] Flexbox row: `display: flex; align-items: center; justify-content: space-between;`
- [ ] Left section: app title "Hexalith" (or logo placeholder)
- [ ] Right section: user name, theme toggle button, logout button
- [ ] User name: `useAuth().user?.name` — fallback to `useAuth().user?.email` then `'User'`
- [ ] Theme toggle: button text shows opposite theme ("Switch to Dark" / "Switch to Light")
- [ ] Logout button: text "Logout", onClick: `signoutRedirect()` — do NOT clear sessionStorage manually (`react-oidc-context` needs `id_token_hint` from session to perform OIDC RP-Initiated Logout; it cleans up its own storage as part of the signout flow)
- [ ] Height: use `var(--spacing-7)` (48px) for top bar height — matches "major layout divisions"
- [ ] Background: `var(--color-surface-primary)`, bottom border: `var(--color-border-default)`
- [ ] Padding: `var(--spacing-3)` horizontal

**Sidebar:**

- [ ] Fixed width 240px (matches grid column)
- [ ] Background: `var(--color-surface-secondary)` (matches UX spec for sidebar surface)
- [ ] Placeholder nav items as `<NavLink>` from react-router (NOT `<a>` tags — react-router handles client-side nav)
- [ ] Home NavLink (`to="/"`) MUST include `end` prop — otherwise `/` matches every route and Home is always "active"
- [ ] Active item: `aria-current="page"` applied automatically by NavLink's `className` callback
- [ ] Active item styling: `var(--color-accent-default)` text or left border indicator
- [ ] `<nav aria-label="Main navigation">` wrapping element
- [ ] Prepare `.collapsed` class in CSS: `width: 64px;` with text hidden — NOT toggled in this story

**Status Bar Placeholder (inlined in ShellLayout):**

- [ ] Inlined `<div>` in the statusbar grid area — NOT a separate component
- [ ] Shows: `Tenant: {activeTenant}` (or "No tenant selected")
- [ ] Height: 28px, background: `var(--color-surface-secondary)`, top border: `1px solid var(--color-border-default)`
- [ ] Tenant label: `var(--font-size-sm)` + `var(--font-weight-medium)` + `var(--color-text-primary)` (promoted readability per UX spec)
- [ ] ShellLayout calls `useTenant()` for this — acceptable since ShellLayout is always inside TenantProvider
- [ ] Story 1.6 extracts this into a dedicated `StatusBar` component with full functionality

**Accessibility:**

- [ ] Skip navigation link: hidden `<a href="#main-content">Skip to main content</a>` at top of body, visible on Tab focus
- [ ] `<main id="main-content" tabindex="-1">` — target for skip link. `tabindex="-1"` is REQUIRED so browsers move visual focus to the element when the skip link is activated (without it, some browser/screen reader combinations scroll but don't move focus)
- [ ] `<header aria-label="Shell header">`
- [ ] `<nav aria-label="Main navigation">`
- [ ] `<main aria-label="Content">`
- [ ] Focus order follows visual layout: skip link → header → sidebar → main content
- [ ] All interactive elements (buttons, links) have visible focus rings via design tokens

### OIDC Dev Config

```typescript
// apps/shell/src/App.tsx — hardcoded dev defaults
// Story 1.7 replaces this with runtime /config.json loading
const OIDC_DEV_CONFIG = {
  authority: "https://localhost:8443/realms/hexalith", // Local Keycloak
  client_id: "hexalith-frontshell",
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  scope: "openid profile email",
  // AuthProvider defaults from Story 1.3:
  // automaticSilentRenew: true
  // validateSubOnSilentRenew: true
  // accessTokenExpiringNotificationTimeInSeconds: 60
} as const;
```

**Development workflow:**

- `pnpm dev` will attempt to reach the local Keycloak instance at the configured authority URL. If Keycloak is NOT running, the auth error screen will appear — this is expected behavior, not a bug.
- **All implementation and testing uses mocked auth via MockShellProvider.** The dev agent should NOT waste time setting up Keycloak. Write code → run tests with mocks → verify.
- To manually verify the layout in a browser without Keycloak: temporarily bypass AuthGate (e.g., comment out the auth check) for visual inspection only. DO NOT commit this bypass.
- Story 1.7 introduces runtime `/config.json` to make OIDC config environment-specific.

### react-router v7 Setup

```typescript
// apps/shell/src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ShellLayout />,
    children: [
      {
        index: true,
        element: <WelcomePage />,
      },
      // Story 1.6: tenant-related routes (if any)
      // Story 5.1-5.2: module routes generated from manifests
      {
        path: '*',
        element: <NotFoundPage />,  // Simple "Page not found" with Link back to "/"
      },
    ],
  },
]);
```

**Key patterns:**

- `createBrowserRouter` (data router API — recommended for react-router v7)
- `RouterProvider` replaces `<BrowserRouter>` wrapping
- `<Outlet />` in ShellLayout renders child routes
- `<NavLink>` in Sidebar for client-side navigation with active state
- Router is created inside `App` with `React.useMemo(() => createAppRouter(), [])` so the initial browser location is captured at mount time without recreating the router on every re-render
- **Why this shape:** the post-review `/tenants` regression test exposed that a module-level router captures the initial location too early for route-sensitive rendering/tests. `useMemo` preserves stable runtime behavior while making initial route selection correct.

### Component Tree

```
<StrictMode>
  <App>
    <ShellProviders oidcConfig={OIDC_DEV_CONFIG}>
      <AuthProvider {...oidcConfig}>
        <TenantProvider>
          <ThemeProvider>
            <LocaleProvider>
              <AuthGate>                    ← guards the entire app
                <RouterProvider router={router}>
                  <ShellLayout>             ← root route element
                    <header>
                      <TopBar />            ← useAuth(), useTheme()
                    </header>
                    <nav>
                      <Sidebar />           ← NavLink from react-router
                    </nav>
                    <main>
                      <Outlet />            ← renders WelcomePage (index route)
                    </main>
                    <div class="statusbar" /> ← inlined placeholder: Tenant: {activeTenant}
                  </ShellLayout>
                </RouterProvider>
              </AuthGate>
            </LocaleProvider>
          </ThemeProvider>
        </TenantProvider>
      </AuthProvider>
    </ShellProviders>
  </App>
</StrictMode>
```

### Provider Pattern (from Stories 1.3-1.4)

```typescript
// ShellProviders composes — it does NOT create new contexts
export function ShellProviders({ oidcConfig, children }: ShellProvidersProps): React.JSX.Element {
  return (
    <AuthProvider {...oidcConfig}>
      <TenantProvider>
        <ThemeProvider>
          <LocaleProvider>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
```

### File Structure

```
apps/shell/src/
├── main.tsx                              (MODIFIED — simplified to render App)
├── App.tsx                               (NEW — root component with routing + OIDC config)
├── App.test.tsx                          (NEW)
├── auth/                                 (NEW)
│   ├── AuthGate.tsx                      (NEW — loading/error/redirect/authenticated gate)
│   └── AuthGate.test.tsx                 (NEW)
├── providers/                            (NEW)
│   ├── ShellProviders.tsx                (NEW — provider composition)
│   └── ShellProviders.test.tsx           (NEW)
├── layout/                               (NEW)
│   ├── ShellLayout.tsx                   (NEW — CSS Grid shell layout)
│   ├── ShellLayout.module.css            (NEW)
│   ├── ShellLayout.test.tsx              (NEW)
│   ├── TopBar.tsx                        (NEW — user name, theme toggle, logout)
│   ├── TopBar.module.css                 (NEW)
│   ├── TopBar.test.tsx                   (NEW)
│   ├── Sidebar.tsx                       (NEW — placeholder navigation)
│   ├── Sidebar.module.css                (NEW)
│   ├── Sidebar.test.tsx                  (NEW)
│   └── (StatusBar placeholder inlined in ShellLayout — no separate file)
├── pages/                                (NEW)
│   ├── WelcomePage.tsx                   (NEW — placeholder welcome page)
│   ├── WelcomePage.test.tsx              (NEW)
│   ├── NotFoundPage.tsx                  (NEW — 404 catch-all with link to Home)
│   └── NotFoundPage.test.tsx             (NEW)
└── styles/
    └── global.css                        (MODIFIED — remove .app-shell, add skip-nav styles)
```

**Modified files:**

- `apps/shell/package.json` — add `@hexalith/shell-api`, `react-router` dependencies + test devDependencies
- `apps/shell/src/main.tsx` — simplified to `import App` + `createRoot` + `render`
- `apps/shell/src/styles/global.css` — remove `.app-shell` placeholder, add skip-nav, update `#root` to `height: 100vh`

### CSS Module Pattern

```css
/* ShellLayout.module.css — example pattern for ALL CSS modules */
.layout {
  --shell-sidebar-width: 240px;
  --shell-sidebar-width-collapsed: 64px;
  --shell-statusbar-height: 28px;

  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "statusbar statusbar";
  grid-template-columns: var(--shell-sidebar-width) 1fr;
  grid-template-rows: auto 1fr var(--shell-statusbar-height);
  height: 100vh;
  background: var(--color-surface-primary);
}

.header {
  grid-area: header;
  border-block-end: 1px solid var(--color-border-default);
}

.sidebar {
  grid-area: sidebar;
  overflow-y: auto;
  background: var(--color-surface-secondary);
  border-inline-end: 1px solid var(--color-border-default);
}

.main {
  grid-area: main;
  overflow-y: auto;
  min-width: 0; /* Prevent grid overflow — grid children default to min-width: auto */
  padding: var(--spacing-5);
}

.statusbar {
  grid-area: statusbar;
  border-block-start: 1px solid var(--color-border-default);
}

/* Structural preparation for collapse — NOT toggled in this story */
.layout.collapsed {
  grid-template-columns: var(--shell-sidebar-width-collapsed) 1fr;
}
```

**CSS Module type declarations:**

- Vite's CSS Module handling generates type information at build time, but TypeScript may still complain about `import styles from './Foo.module.css'` in strict mode.
- If the existing `apps/shell/` setup does NOT already have a `*.module.css` type declaration, add one at `apps/shell/src/vite-env.d.ts` (or a shared `types/` file):
  ```typescript
  declare module "*.module.css" {
    const classes: Readonly<Record<string, string>>;
    export default classes;
  }
  ```
- Check the existing `vite-env.d.ts` first — Vite's default template often includes this already.

**CSS Rules:**

- Use logical properties: `border-block-end` not `border-bottom`, `border-inline-end` not `border-right`, `padding-inline` not `padding-left/right`
- All values from design tokens — no hardcoded `#hex`, `px` (except grid dimensions via CSS custom props), or font values
- CSS Modules scoping prevents class name collisions
- No `!important` — CSS Modules specificity is sufficient
- **CSS Layers vs CSS Modules:** CSS Module styles are intentionally UN-layered — they always win over `@layer` styles per CSS spec (un-layered > layered). This is correct behavior. Design token `var()` references still work because custom properties cascade regardless of layers. Do NOT wrap CSS Module content in `@layer`.

### Architecture Compliance

| Package    | May Import From                                                                     | MUST NOT Import From                                                 |
| ---------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| apps/shell | react, react-dom, react-router, @hexalith/shell-api, @hexalith/ui (CSS tokens only) | @hexalith/cqrs-client (not yet), direct oidc-client-ts, @radix-ui/\* |

| Consumer             | Uses                           | Story   |
| -------------------- | ------------------------------ | ------- |
| TopBar               | `useAuth()`, `useTheme()`      | 1.5     |
| Sidebar              | `NavLink` from react-router    | 1.5     |
| StatusBarPlaceholder | `useTenant()`                  | 1.5     |
| AuthGate             | `useAuth()`                    | 1.5     |
| StatusBar (full)     | Replaces StatusBarPlaceholder  | 1.6     |
| loadRuntimeConfig    | Replaces hardcoded OIDC config | 1.7     |
| Module routes        | Added to router children array | 5.1-5.2 |

### Security

- AuthGate prevents rendering ANY content (layout, routes, data) until authenticated — no flash of protected content
- AuthGate detects OIDC callback params (`code`, `state`) to show "Processing login..." instead of briefly flashing "Redirecting..." during the callback-to-authenticated transition
- Logout calls `signoutRedirect()` which handles both OIDC RP-Initiated Logout and local session cleanup internally — do NOT manually clear sessionStorage (it contains `id_token_hint` needed for the logout request)
- OIDC config is hardcoded for dev but contains no secrets (client_id is public for SPAs)
- No tokens stored in localStorage — `react-oidc-context` uses session storage by default
- `signoutRedirect()` terminates session at the OIDC provider — not just local state cleanup

### Testing

**Framework:** Vitest + `@testing-library/react` + jsdom (same as Stories 1.3-1.4). Call `cleanup()` in `afterEach`.

**Mocking strategy:** Since Story 1.4 provides `MockShellProvider`, use it for layout/component tests. For auth-specific tests (AuthGate), mock `useAuth()` directly.

**Test cases:**

| #   | Test                                                                                                                            | AC     |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | ShellProviders renders children inside all providers                                                                            | #1     |
| 2   | ShellProviders nests providers in correct order (Auth → Tenant → Theme → Locale)                                                | #1     |
| 3   | ShellLayout renders `<header>` element                                                                                          | #2, #5 |
| 4   | ShellLayout renders `<nav>` element                                                                                             | #2, #5 |
| 5   | ShellLayout renders `<main>` element                                                                                            | #2, #5 |
| 6   | ShellLayout renders Outlet for child routes                                                                                     | #2     |
| 7   | TopBar displays user name                                                                                                       | #8     |
| 8   | TopBar displays theme toggle button                                                                                             | #8     |
| 9   | TopBar theme toggle calls toggleTheme                                                                                           | #8     |
| 10  | TopBar displays logout button                                                                                                   | #4     |
| 11  | TopBar logout calls signoutRedirect (no manual sessionStorage.clear)                                                            | #4     |
| 12  | Sidebar renders nav element with aria-label                                                                                     | #5, #8 |
| 13  | Sidebar renders placeholder navigation items                                                                                    | #8     |
| 14  | Sidebar active item has aria-current="page"                                                                                     | #5     |
| 15  | AuthGate shows loading when isLoading=true                                                                                      | #3     |
| 16  | AuthGate shows error when error is present                                                                                      | #3     |
| 17  | AuthGate shows redirecting when not authenticated                                                                               | #3     |
| 18  | AuthGate renders children when authenticated                                                                                    | #3     |
| 19  | ShellLayout status bar area shows active tenant name                                                                            | #8     |
| 20  | ShellLayout status bar shows "No tenant selected" when null                                                                     | #8     |
| 21  | WelcomePage renders welcome heading                                                                                             | #8     |
| 22  | Header has aria-label="Shell header"                                                                                            | #5     |
| 23  | Main has id="main-content" and tabindex="-1" for skip navigation                                                                | #5     |
| 24  | App renders full component tree when authenticated                                                                              | #1, #8 |
| 25  | AuthGate shows "Processing login..." when OIDC callback params present                                                          | #3     |
| 26  | Home NavLink uses `end` prop — not active on other routes                                                                       | #8     |
| 27  | Unmatched route renders NotFoundPage with link to Home                                                                          | #8     |
| 28  | TopBar shows email when user.name is null                                                                                       | #8     |
| 29  | TopBar shows 'User' when both name and email are null                                                                           | #8     |
| 30  | AuthGate error state handles undefined error.message gracefully                                                                 | #3     |
| 31  | AC #7 viewport layout — **manual verification only** (jsdom does not compute CSS Grid layout; verify in browser via `pnpm dev`) | #7     |

**Key test patterns:**

```typescript
// Mock useAuth for AuthGate tests
vi.mock('@hexalith/shell-api', async () => {
  const actual = await vi.importActual<typeof import('@hexalith/shell-api')>('@hexalith/shell-api');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Use MockShellProvider + factory functions for layout tests (from Story 1.4)
// CRITICAL: Always use createMockAuthContext() factory — never hand-craft partial auth objects.
// MockShellProvider's custom props COMPLETELY OVERRIDE defaults (no partial merge).
// Omitting signinRedirect/signoutRedirect causes runtime errors in TopBar logout.
import { MockShellProvider, createMockAuthContext, createMockTenantContext } from '@hexalith/shell-api';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MockShellProvider
      authContext={createMockAuthContext({
        user: { sub: 'test', name: 'Test User', email: 'test@test.com', tenantClaims: ['tenant-a'] },
        isAuthenticated: true,
      })}
      tenantContext={createMockTenantContext({
        activeTenant: 'tenant-a',
        availableTenants: ['tenant-a'],
      })}
    >
      {ui}
    </MockShellProvider>
  );
}

// Mock react-router for component tests
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet</div>,
    NavLink: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  };
});

// NavLink `end` prop test strategy:
// The default NavLink mock replaces it with a plain <a>, which can't verify `end` behavior.
// Option A (recommended): assert `end` prop is passed in the mock — e.g., mock captures props
// Option B: use real NavLink with MemoryRouter for test #26 specifically
// Choose based on what feels cleaner at implementation time.

// Logout test — signoutRedirect only, no sessionStorage.clear()
it('calls signoutRedirect on logout', async () => {
  const signoutRedirect = vi.fn();
  // render TopBar with mocked signoutRedirect via createMockAuthContext...
  await user.click(screen.getByRole('button', { name: /logout/i }));
  expect(signoutRedirect).toHaveBeenCalled();
  // DO NOT assert sessionStorage.clear() — react-oidc-context handles its own cleanup
});
```

### Previous Story Intelligence

**From Story 1.3 (Auth Provider):**

- Context+Provider pattern, hook in separate file, `cleanup()` in afterEach
- Explicit `React.JSX.Element` return types for all components (DTS generation)
- `AuthProvider` wraps `react-oidc-context` with custom context bridge — does NOT expose raw OIDC types
- `useAuth()` returns `{ user, isAuthenticated, isLoading, error, signinRedirect, signoutRedirect }`
- `AuthUser` has `sub`, `tenantClaims: string[]`, optional `name`, `email`
- `onSigninCallback` in AuthProvider cleans up OIDC redirect params from URL (return URL handling)
- 16 passing tests exist — new shell app tests must not break them

**From Story 1.4 (Tenant, Theme, Locale Providers):**

- `TenantProvider` reads `tenantClaims` from `useAuth()` — must be INSIDE AuthProvider
- `ThemeProvider` sets `data-theme` on `document.documentElement` — FOUC prevention in useState initializer
- `useTheme()` returns `{ theme, toggleTheme }`
- `useTenant()` returns `{ activeTenant, availableTenants, switchTenant }`
- `useLocale()` returns `{ locale, defaultCurrency, formatDate, formatNumber, formatCurrency }`
- `MockShellProvider` wraps all mock contexts for tests — use this in Story 1.5 tests
- Provider nesting order in tests matches real: Auth → Tenant → Theme → Locale
- No new dependencies added — React Context + browser APIs only

**Codebase facts:**

- `apps/shell/src/main.tsx` currently has inline `App` function — extract to `App.tsx`
- `apps/shell/src/styles/global.css` has `.app-shell` class — replace with ShellLayout
- `apps/shell/package.json` does NOT have `@hexalith/shell-api` dependency — must add
- `packages/shell-api/src/index.ts` currently only exports auth (barrel will expand after Story 1.4)
- No vitest config changes needed — `apps/shell/vitest.config.ts` already configured for jsdom

### Git Intelligence

Recent commits show monorepo scaffold, design tokens, and planning artifacts are complete. Story 1.3 (auth) is marked done in sprint status. No conflicts expected with current branch state.

### References

- epics.md — Epic 1 overview, Story 1.5 ACs, ATDD mandate, FRs covered: FR20, FR30, FR37
- architecture.md — Provider hierarchy (line 1167), ShellLayout structure (line 1153), file tree (line 1139), react-router v7 routing (line 463), shell app boundary (line 1514)
- ux-design-specification.md — Layout grid (line 1511), sidebar dimensions 240px/64px (line 1515), breakpoints (line 1549), sidebar responsive behavior (line 1556), status bar spec (line 1138), semantic landmarks (line 1609), spacing tokens (line 1483)
- prd.md — FR20 (consistent page layout), FR30 (OIDC authentication), FR37 (logout/session termination)
- 1-3-shell-api-authentication-provider.md — AuthProvider patterns, useAuth API, onSigninCallback, DTS learnings
- 1-4-shell-api-tenant-theme-and-locale-providers.md — Provider patterns, MockShellProvider, type definitions, barrel exports

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed vitest config missing `environment: "jsdom"` for React component tests
- Added `test-setup.ts` to mock `window.matchMedia` (required by ThemeProvider in jsdom)
- `@testing-library/user-event` was missing from dependencies — added to devDependencies
- ESLint `@typescript-eslint/consistent-type-imports` rule forbids `typeof import()` type annotations — used `Record<string, unknown>` cast with `importOriginal()` pattern instead

### Completion Notes List

- All 38 tests pass across 8 test files covering all 8 ACs
- No regressions in shell-api (67 tests pass)
- Pre-existing `packages/ui` contrast matrix failures are unrelated to this story
- CSS token compliance verified — zero hardcoded colors/pixels/fonts in CSS modules
- Senior developer review findings fixed: inline styles removed, invalid typography token usage corrected, OIDC callback detection tightened to require both `code` and `state`, placeholder `/tenants` navigation now resolves to a route, and skip navigation is rendered in the shell layout
- Router initialization moved to `React.useMemo()` so route-aware renders honor the current browser location at mount time
- Added regression coverage for the `/tenants` placeholder route, skip-navigation link rendering, and the non-callback `?code=`-only auth edge case
- Task 11.4 (manual browser verification with `pnpm dev`) intentionally left as manual follow-up — requires running Keycloak or temporarily bypassing AuthGate

### File List

**New files:**

- `apps/shell/src/App.tsx` — root component with OIDC config and router
- `apps/shell/src/App.test.tsx` — integration tests for full app rendering
- `apps/shell/src/test-setup.ts` — vitest setup file (matchMedia mock)
- `apps/shell/src/auth/AuthGate.tsx` — auth gate with loading/error/redirect/callback states
- `apps/shell/src/auth/AuthGate.module.css` — token-based styles for auth loading/error/redirect states
- `apps/shell/src/auth/AuthGate.test.tsx` — 8 tests covering all auth gate states and callback edge cases
- `apps/shell/src/providers/ShellProviders.tsx` — provider composition hierarchy
- `apps/shell/src/providers/ShellProviders.test.tsx` — 2 tests for provider integration
- `apps/shell/src/layout/ShellLayout.tsx` — CSS Grid shell layout with semantic landmarks
- `apps/shell/src/layout/ShellLayout.module.css` — grid layout styles with design tokens
- `apps/shell/src/layout/ShellLayout.test.tsx` — 10 tests for layout structure, skip navigation, and status bar
- `apps/shell/src/layout/TopBar.tsx` — user name, theme toggle, logout button
- `apps/shell/src/layout/TopBar.module.css` — top bar styles with design tokens
- `apps/shell/src/layout/TopBar.test.tsx` — 7 tests for display and interactions
- `apps/shell/src/layout/Sidebar.tsx` — placeholder navigation with NavLink
- `apps/shell/src/layout/Sidebar.module.css` — sidebar styles with design tokens
- `apps/shell/src/layout/Sidebar.test.tsx` — 4 tests for navigation items and active state
- `apps/shell/src/pages/PageContent.module.css` — shared token-based styles for simple content pages
- `apps/shell/src/pages/TenantsPlaceholderPage.tsx` — placeholder tenants route target for shell navigation
- `apps/shell/src/pages/WelcomePage.tsx` — welcome page placeholder
- `apps/shell/src/pages/WelcomePage.test.tsx` — 2 tests for welcome heading
- `apps/shell/src/pages/NotFoundPage.tsx` — 404 catch-all with Home link
- `apps/shell/src/pages/NotFoundPage.test.tsx` — 2 tests for not found page

**Modified files:**

- `apps/shell/package.json` — added @hexalith/shell-api, react-router, testing-library deps
- `apps/shell/src/main.tsx` — simplified to import and render App
- `apps/shell/src/styles/global.css` — removed .app-shell, updated #root height, added skip-nav
- `apps/shell/vitest.config.ts` — added jsdom environment and setupFiles
- `_bmad-output/implementation-artifacts/1-5-shell-application-layout-and-auth-flow.md` — updated after senior developer review remediation and validation
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated to done

## Senior Developer Review (AI)

### Review Outcome

- **Result:** Approved after remediation
- **Severity addressed:** 1 High, 3 Medium, 1 Low

### Findings Resolved

- Replaced inline styles in auth and page components with CSS Modules to restore design-token-only styling compliance.
- Replaced invalid `--font-size-base` usage with valid shared page styles backed by existing typography tokens.
- Tightened OIDC callback detection to require both `code` and `state`, preventing false-positive callback handling.
- Added a concrete `/tenants` placeholder route so shell navigation no longer lands on a 404.
- Rendered the existing skip-navigation affordance in `ShellLayout` and added regression coverage.

### Validation Performed

- `pnpm --filter @hexalith/shell test` ✅ (38/38 tests passed)
- `pnpm --filter @hexalith/shell lint` ✅
- `pnpm --filter @hexalith/shell build` ✅

## Change Log

- **2026-03-13:** Implemented shell application layout and auth flow (Story 1.5). Created ShellProviders with provider hierarchy (Auth → Tenant → Theme → Locale), AuthGate with OIDC callback detection, CSS Grid ShellLayout with semantic landmarks, TopBar with user display/theme toggle/logout, Sidebar with NavLink navigation, WelcomePage/NotFoundPage, App.tsx with react-router v7, and vitest test infrastructure. 35 tests pass, build clean, lint clean. Status → review.
- **2026-03-13:** Resolved senior developer review findings. Replaced inline styles with CSS Modules, corrected invalid token usage, added skip navigation rendering, added `/tenants` placeholder routing, tightened OIDC callback detection, and moved router creation into `React.useMemo()` to honor the current location at mount time. Validation: 38 tests pass, lint clean, build clean. Status → done.
