# Story 1.5: Shell Application — Layout & Auth Flow

Status: ready-for-dev

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
- `StatusBarPlaceholder.tsx` + CSS Module — minimal status bar showing active tenant name (full StatusBar in Story 1.6)
- `AuthGate.tsx` in `apps/shell/src/auth/` — conditional rendering: loading screen while auth initializes, redirect indicator for unauthenticated, children when authenticated
- `WelcomePage.tsx` in `apps/shell/src/pages/` — "Welcome to Hexalith.FrontShell" placeholder with design tokens
- `App.tsx` — root component: ShellProviders wrapping react-router v7 `RouterProvider`
- Updated `main.tsx` — simplified to render `<App />`
- react-router v7 setup: `createBrowserRouter` + `RouterProvider` + `<Outlet />` in ShellLayout
- Auth flow: OIDC redirect when no session, return to original URL after auth (leverages AuthProvider from Story 1.3)
- Logout flow: TopBar logout button calls `signoutRedirect()`, clears `sessionStorage`
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
- **Story 1.4** (Tenant, Theme & Locale Providers) — `TenantProvider`, `useTenant()`, `ThemeProvider`, `useTheme()`, `LocaleProvider`, `useLocale()`, `MockShellProvider`. **BLOCKING — must be completed before implementation**

## Acceptance Criteria

| AC | Summary |
|----|---------|
| #1 | Provider hierarchy renders: AuthProvider → TenantProvider → ThemeProvider → LocaleProvider → layout |
| #2 | Layout renders sidebar (240px), top bar, and main content area using CSS Grid with design tokens |
| #3 | Unauthenticated user is redirected to OIDC provider; after auth, returned to originally requested URL |
| #4 | Logout button terminates session, redirects to OIDC logout endpoint, clears sessionStorage |
| #5 | Semantic HTML landmarks: `<nav>` for sidebar, `<main>` for content, `<header>` for top bar |
| #6 | All shell CSS uses design tokens exclusively — token compliance scanner passes at 100% |
| #7 | At 1280px desktop viewport, sidebar is visible and content fills remaining width without horizontal overflow |
| #8 | Placeholder welcome page renders with: user name in top bar, active tenant visible, sidebar with placeholder nav, theme toggle working |

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
   **Then** `signoutRedirect()` is called (from `useAuth()`)
   **And** `sessionStorage.clear()` is called before redirect
   **And** the user is redirected to the OIDC provider's logout endpoint

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

- [ ] Task 0: Write failing acceptance tests from ACs (AC: #1-#8)
  - [ ] 0.1 `providers/ShellProviders.test.tsx` — tests for AC #1: provider hierarchy renders correctly
  - [ ] 0.2 `layout/ShellLayout.test.tsx` — tests for AC #2, #5, #7: semantic landmarks, grid layout, viewport behavior
  - [ ] 0.3 `layout/TopBar.test.tsx` — tests for AC #4, #8: user name display, theme toggle, logout button
  - [ ] 0.4 `layout/Sidebar.test.tsx` — tests for AC #8: placeholder navigation renders
  - [ ] 0.5 `auth/AuthGate.test.tsx` — tests for AC #3: loading state, redirect indicator, authenticated rendering
  - [ ] 0.6 `pages/WelcomePage.test.tsx` — tests for AC #8: welcome heading renders
  - [ ] 0.7 `App.test.tsx` — integration test: full app renders with mocked providers
  - [ ] 0.8 Verify `pnpm --filter @hexalith/shell test` — all tests fail (red phase)

### Implementation Phase

- [ ] Task 1: Add dependencies to `apps/shell/package.json`
  - [ ] 1.1 Add `@hexalith/shell-api: "workspace:*"` to `dependencies`
  - [ ] 1.2 Add `react-router: "^7.6.0"` to `dependencies`
  - [ ] 1.3 Add `@testing-library/react: "^16.0.0"` and `@testing-library/jest-dom: "^6.0.0"` to `devDependencies`
  - [ ] 1.4 Run `pnpm install`
  - [ ] 1.5 Ensure `pnpm build` still succeeds after adding dependencies

- [ ] Task 2: Create ShellProviders (AC: #1)
  - [ ] 2.1 Create `apps/shell/src/providers/ShellProviders.tsx`
  - [ ] 2.2 Compose providers in exact order: AuthProvider → TenantProvider → ThemeProvider → LocaleProvider
  - [ ] 2.3 AuthProvider receives OIDC config as props (hardcoded dev defaults in this story)
  - [ ] 2.4 Export `ShellProviders` and `ShellProvidersProps` (oidcConfig as required prop)

- [ ] Task 3: Create AuthGate (AC: #3)
  - [ ] 3.1 Create `apps/shell/src/auth/AuthGate.tsx`
  - [ ] 3.2 Uses `useAuth()` to check `isLoading`, `isAuthenticated`, `error`
  - [ ] 3.3 `isLoading: true` → render loading screen (centered spinner/text using design tokens)
  - [ ] 3.4 `error` → render auth error screen with error message and retry button
  - [ ] 3.5 `!isAuthenticated` → render "Redirecting to login..." indicator (AuthProvider handles actual redirect)
  - [ ] 3.6 `isAuthenticated` → render `children`

- [ ] Task 4: Create ShellLayout (AC: #2, #5, #7)
  - [ ] 4.1 Create `apps/shell/src/layout/ShellLayout.tsx`
  - [ ] 4.2 CSS Grid with `grid-template-areas`: `"header header"` / `"sidebar main"` / `"statusbar statusbar"`
  - [ ] 4.3 Grid columns: `240px 1fr` (sidebar width from UX spec)
  - [ ] 4.4 Grid rows: `auto 1fr auto` (top bar auto height, main fills, status bar auto)
  - [ ] 4.5 Semantic landmarks: `<header>` wraps TopBar, `<nav>` wraps Sidebar, `<main>` wraps `<Outlet />`
  - [ ] 4.6 Layout height: `100vh` on root grid container
  - [ ] 4.7 Main content area: `overflow-y: auto` for independent scrolling
  - [ ] 4.8 Create `ShellLayout.module.css` with design tokens only

- [ ] Task 5: Create TopBar (AC: #4, #8)
  - [ ] 5.1 Create `apps/shell/src/layout/TopBar.tsx`
  - [ ] 5.2 Display user name from `useAuth().user?.name ?? 'Unknown User'`
  - [ ] 5.3 Theme toggle button: calls `useTheme().toggleTheme()`, shows current theme label
  - [ ] 5.4 Logout button: calls `sessionStorage.clear()` then `useAuth().signoutRedirect()`
  - [ ] 5.5 Layout: flexbox row with `justify-content: space-between` (logo/title left, actions right)
  - [ ] 5.6 `aria-label="Shell header"` on the wrapping `<header>`
  - [ ] 5.7 Create `TopBar.module.css` with design tokens only

- [ ] Task 6: Create Sidebar (AC: #8)
  - [ ] 6.1 Create `apps/shell/src/layout/Sidebar.tsx`
  - [ ] 6.2 Hardcoded placeholder nav items: `[{ label: 'Home', path: '/' }, { label: 'Tenants', path: '/tenants' }]`
  - [ ] 6.3 Each item is a `<a>` or react-router `<NavLink>` with `aria-current="page"` on active
  - [ ] 6.4 `aria-label="Main navigation"` on the wrapping `<nav>`
  - [ ] 6.5 Sidebar width: 240px fixed (matches `grid-template-columns` in ShellLayout)
  - [ ] 6.6 Prepare CSS class `.collapsed` for 64px width (not toggled yet — structural preparation)
  - [ ] 6.7 Create `Sidebar.module.css` with design tokens only

- [ ] Task 7: Create StatusBarPlaceholder (AC: #8)
  - [ ] 7.1 Create `apps/shell/src/layout/StatusBarPlaceholder.tsx`
  - [ ] 7.2 Display active tenant name from `useTenant().activeTenant ?? 'No tenant'`
  - [ ] 7.3 Height: 28px (from UX spec `--statusbar-height`)
  - [ ] 7.4 Background: `var(--color-surface-secondary)`, top border: `var(--color-border-default)`
  - [ ] 7.5 `aria-label="Status bar"` on wrapping element
  - [ ] 7.6 Create `StatusBarPlaceholder.module.css` with design tokens only
  - [ ] 7.7 Full StatusBar replaces this in Story 1.6

- [ ] Task 8: Create WelcomePage (AC: #8)
  - [ ] 8.1 Create `apps/shell/src/pages/WelcomePage.tsx`
  - [ ] 8.2 Render `<h1>Welcome to Hexalith.FrontShell</h1>` with design token typography
  - [ ] 8.3 Show brief platform description paragraph
  - [ ] 8.4 Styled with design tokens — no hardcoded values

- [ ] Task 9: Create App.tsx and wire routing (AC: #1, #3)
  - [ ] 9.1 Create `apps/shell/src/App.tsx`
  - [ ] 9.2 Define OIDC dev config constant (authority, client_id, redirect_uri, scope — hardcoded, Story 1.7 replaces)
  - [ ] 9.3 Create router with `createBrowserRouter`: root route → ShellLayout with Outlet, index route → WelcomePage
  - [ ] 9.4 Render: `<ShellProviders oidcConfig={devOidcConfig}><AuthGate><RouterProvider router={router} /></AuthGate></ShellProviders>`
  - [ ] 9.5 Update `main.tsx` to import and render `<App />`

- [ ] Task 10: Update global.css (AC: #6)
  - [ ] 10.1 Remove `.app-shell` placeholder styles (replaced by ShellLayout)
  - [ ] 10.2 Ensure `#root` has `height: 100vh` (not just `min-height`)
  - [ ] 10.3 Add skip-navigation link styles (hidden, visible on focus)

### Validation Phase

- [ ] Task 11: Green phase
  - [ ] 11.1 `pnpm --filter @hexalith/shell test` — all tests pass
  - [ ] 11.2 `pnpm --filter @hexalith/shell build` — builds without errors
  - [ ] 11.3 `pnpm --filter @hexalith/shell lint` — no ESLint violations
  - [ ] 11.4 Verify `pnpm dev` starts and shows the shell layout in browser (manual check)
  - [ ] 11.5 Verify all CSS uses design tokens — no hardcoded pixel/color/font values

## Dev Notes

### Critical Implementation Checklist

**Provider Hierarchy (ShellProviders.tsx):**
- [ ] Exact nesting order: AuthProvider → TenantProvider → ThemeProvider → LocaleProvider → children
- [ ] Do NOT add QueryClientProvider yet — it's Epic 2 scope (@tanstack/react-query not needed until cqrs-client)
- [ ] AuthProvider receives `UserManagerSettings` as props (see OIDC Config section below)
- [ ] All other providers take no special props (they read from their parent contexts)
- [ ] Explicit `React.JSX.Element` return type (DTS generation — Story 1.3 learning)

**AuthGate (auth/AuthGate.tsx):**
- [ ] MUST be rendered INSIDE ShellProviders (needs useAuth() from AuthProvider)
- [ ] MUST be rendered OUTSIDE RouterProvider (guards the entire app, not individual routes)
- [ ] Loading state: centered text "Loading..." with design token styling (not a full spinner component — @hexalith/ui doesn't exist yet)
- [ ] Error state: show `error.message` with a "Retry" button that calls `window.location.reload()`
- [ ] Redirecting state: "Redirecting to login..." (this is brief — AuthProvider auto-redirects)

**ShellLayout CSS Grid:**
- [ ] Grid container: `height: 100vh; display: grid;`
- [ ] `grid-template-columns: 240px 1fr;`
- [ ] `grid-template-rows: auto 1fr auto;`
- [ ] `grid-template-areas: "header header" "sidebar main" "statusbar statusbar";`
- [ ] Header area spans both columns (top bar is full width)
- [ ] Status bar area spans both columns (full width, fixed 28px)
- [ ] Main area: `overflow-y: auto;` for independent content scrolling
- [ ] Sidebar area: `overflow-y: auto;` for independent nav scrolling
- [ ] NO hardcoded pixel values in CSS — use design tokens for spacing/colors/fonts
- [ ] Exception: grid column `240px` is the sidebar width from UX spec (no token exists for it; define as CSS custom property `--shell-sidebar-width: 240px` in the module CSS)

**TopBar:**
- [ ] Flexbox row: `display: flex; align-items: center; justify-content: space-between;`
- [ ] Left section: app title "Hexalith" (or logo placeholder)
- [ ] Right section: user name, theme toggle button, logout button
- [ ] User name: `useAuth().user?.name` — fallback to `useAuth().user?.email` then `'User'`
- [ ] Theme toggle: button text shows opposite theme ("Switch to Dark" / "Switch to Light")
- [ ] Logout button: text "Logout", onClick: `sessionStorage.clear(); signoutRedirect();`
- [ ] Height: use `var(--spacing-7)` (48px) for top bar height — matches "major layout divisions"
- [ ] Background: `var(--color-surface-primary)`, bottom border: `var(--color-border-default)`
- [ ] Padding: `var(--spacing-3)` horizontal

**Sidebar:**
- [ ] Fixed width 240px (matches grid column)
- [ ] Background: `var(--color-surface-secondary)` (matches UX spec for sidebar surface)
- [ ] Placeholder nav items as `<NavLink>` from react-router (NOT `<a>` tags — react-router handles client-side nav)
- [ ] Active item: `aria-current="page"` applied automatically by NavLink's `className` callback
- [ ] Active item styling: `var(--color-accent-default)` text or left border indicator
- [ ] `<nav aria-label="Main navigation">` wrapping element
- [ ] Prepare `.collapsed` class in CSS: `width: 64px;` with text hidden — NOT toggled in this story

**StatusBarPlaceholder:**
- [ ] Shows: `Tenant: {activeTenant}` (or "No tenant selected")
- [ ] Height: 28px
- [ ] Background: `var(--color-surface-secondary)`
- [ ] Top border: `1px solid var(--color-border-default)`
- [ ] Font: `var(--font-size-xs)`, color: `var(--color-text-secondary)`
- [ ] Tenant label: `var(--font-size-sm)` + `var(--font-weight-medium)` + `var(--color-text-primary)` (promoted readability per UX spec)

**Accessibility:**
- [ ] Skip navigation link: hidden `<a href="#main-content">Skip to main content</a>` at top of body, visible on Tab focus
- [ ] `<main id="main-content">` — target for skip link
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
  authority: 'https://localhost:8443/realms/hexalith',  // Local Keycloak
  client_id: 'hexalith-frontshell',
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  scope: 'openid profile email',
  // AuthProvider defaults from Story 1.3:
  // automaticSilentRenew: true
  // validateSubOnSilentRenew: true
  // accessTokenExpiringNotificationTimeInSeconds: 60
} as const;
```

**Important:** The OIDC config is hardcoded for local development. `pnpm dev` will attempt to reach this Keycloak instance. For testing, all auth is mocked. Story 1.7 introduces runtime `/config.json` to make this configurable per environment.

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
    ],
  },
]);
```

**Key patterns:**
- `createBrowserRouter` (data router API — recommended for react-router v7)
- `RouterProvider` replaces `<BrowserRouter>` wrapping
- `<Outlet />` in ShellLayout renders child routes
- `<NavLink>` in Sidebar for client-side navigation with active state
- Router is created OUTSIDE the component tree (module-level constant) to prevent re-creation on re-renders

### Component Tree

```
<StrictMode>
  <App>
    <ShellProviders oidcConfig={OIDC_DEV_CONFIG}>
      <AuthProvider settings={oidcConfig}>
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
                    <StatusBarPlaceholder /> ← useTenant()
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
│   ├── StatusBarPlaceholder.tsx          (NEW — minimal tenant display)
│   └── StatusBarPlaceholder.module.css   (NEW)
├── pages/                                (NEW)
│   ├── WelcomePage.tsx                   (NEW — placeholder welcome page)
│   └── WelcomePage.test.tsx              (NEW)
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

**CSS Rules:**
- Use logical properties: `border-block-end` not `border-bottom`, `border-inline-end` not `border-right`, `padding-inline` not `padding-left/right`
- All values from design tokens — no hardcoded `#hex`, `px` (except grid dimensions via CSS custom props), or font values
- CSS Modules scoping prevents class name collisions
- No `!important` — CSS Modules specificity is sufficient

### Architecture Compliance

| Package | May Import From | MUST NOT Import From |
|---------|----------------|---------------------|
| apps/shell | react, react-dom, react-router, @hexalith/shell-api, @hexalith/ui (CSS tokens only) | @hexalith/cqrs-client (not yet), direct oidc-client-ts, @radix-ui/* |

| Consumer | Uses | Story |
|----------|------|-------|
| TopBar | `useAuth()`, `useTheme()` | 1.5 |
| Sidebar | `NavLink` from react-router | 1.5 |
| StatusBarPlaceholder | `useTenant()` | 1.5 |
| AuthGate | `useAuth()` | 1.5 |
| StatusBar (full) | Replaces StatusBarPlaceholder | 1.6 |
| loadRuntimeConfig | Replaces hardcoded OIDC config | 1.7 |
| Module routes | Added to router children array | 5.1-5.2 |

### Security

- AuthGate prevents rendering ANY content (layout, routes, data) until authenticated — no flash of protected content
- Logout clears `sessionStorage` before redirect to prevent stale session data
- OIDC config is hardcoded for dev but contains no secrets (client_id is public for SPAs)
- No tokens stored in localStorage — `react-oidc-context` uses session storage by default
- `signoutRedirect()` terminates session at the OIDC provider — not just local state cleanup

### Testing

**Framework:** Vitest + `@testing-library/react` + jsdom (same as Stories 1.3-1.4). Call `cleanup()` in `afterEach`.

**Mocking strategy:** Since Story 1.4 provides `MockShellProvider`, use it for layout/component tests. For auth-specific tests (AuthGate), mock `useAuth()` directly.

**Test cases:**

| # | Test | AC |
|---|------|----|
| 1 | ShellProviders renders children inside all providers | #1 |
| 2 | ShellProviders nests providers in correct order (Auth → Tenant → Theme → Locale) | #1 |
| 3 | ShellLayout renders `<header>` element | #2, #5 |
| 4 | ShellLayout renders `<nav>` element | #2, #5 |
| 5 | ShellLayout renders `<main>` element | #2, #5 |
| 6 | ShellLayout renders Outlet for child routes | #2 |
| 7 | TopBar displays user name | #8 |
| 8 | TopBar displays theme toggle button | #8 |
| 9 | TopBar theme toggle calls toggleTheme | #8 |
| 10 | TopBar displays logout button | #4 |
| 11 | TopBar logout clears sessionStorage and calls signoutRedirect | #4 |
| 12 | Sidebar renders nav element with aria-label | #5, #8 |
| 13 | Sidebar renders placeholder navigation items | #8 |
| 14 | Sidebar active item has aria-current="page" | #5 |
| 15 | AuthGate shows loading when isLoading=true | #3 |
| 16 | AuthGate shows error when error is present | #3 |
| 17 | AuthGate shows redirecting when not authenticated | #3 |
| 18 | AuthGate renders children when authenticated | #3 |
| 19 | StatusBarPlaceholder shows active tenant name | #8 |
| 20 | StatusBarPlaceholder shows "No tenant selected" when null | #8 |
| 21 | WelcomePage renders welcome heading | #8 |
| 22 | Header has aria-label="Shell header" | #5 |
| 23 | Main has id="main-content" for skip navigation | #5 |
| 24 | App renders full component tree when authenticated | #1, #8 |

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

// Use MockShellProvider for layout tests (from Story 1.4)
import { MockShellProvider } from '@hexalith/shell-api';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MockShellProvider
      authContext={{ user: { sub: 'test', name: 'Test User', email: 'test@test.com', tenantClaims: ['tenant-a'] }, isAuthenticated: true, isLoading: false, error: null, signinRedirect: vi.fn(), signoutRedirect: vi.fn() }}
      tenantContext={{ activeTenant: 'tenant-a', availableTenants: ['tenant-a'], switchTenant: vi.fn() }}
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

// Logout test
it('clears sessionStorage and calls signoutRedirect on logout', async () => {
  const signoutRedirect = vi.fn();
  const clearSpy = vi.spyOn(Storage.prototype, 'clear');
  // render TopBar with mocked signoutRedirect...
  await user.click(screen.getByRole('button', { name: /logout/i }));
  expect(clearSpy).toHaveBeenCalled();
  expect(signoutRedirect).toHaveBeenCalled();
  clearSpy.mockRestore();
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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
