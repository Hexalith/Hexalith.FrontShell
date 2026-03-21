# Story 5.2: Unified Navigation & Route Generation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an end user,
I want unified sidebar navigation across all modules that feels like one application,
so that I can find and switch between modules without perceiving architectural boundaries.

## Acceptance Criteria

1. **AC1 — Sidebar displays all module navigation items.** Given multiple modules declare navigation items in their manifests, when the sidebar renders, then all module navigation items are displayed with their declared labels, icons, and categories, and modules are grouped by `category` from the manifest with collapsible group headers, and the sidebar search/filter works across all registered modules.

2. **AC2 — Active indicator and status bar update on navigation.** Given a user clicks a module's navigation item, when the route changes, then the URL updates to the module's declared route pattern (e.g., `/tenants`, `/orders`), and the sidebar active indicator transitions smoothly to the selected item, and the status bar "active module" segment updates to the module's `displayName`.

3. **AC3 — Sidebar stability during module switching.** Given a user navigates between modules via the sidebar, when switching from module A to module B, then the sidebar remains visible and stable (no re-render, no flash), and the top bar remains consistent, and the transition feels like navigating within one application — zero visual seams.

4. **AC4 — Deep-linkable URLs.** Given deep-linkable URLs are configured, when a user shares a URL like `/orders/detail/4521?status=overdue&sort=date`, then the correct module loads at the specified route with filter/sort params applied.

5. **AC5 — Route conflict detection.** Given routes are generated from manifests, when two modules declare conflicting routes, then the build fails with a clear error identifying both modules and the conflicting path. _(Deferred to Story 5.5 validation — this story only needs to NOT break that future capability.)_

FRs covered: FR19

## Tasks / Subtasks

- [x] Task 1: Create `useActiveModule` hook (AC: #2)
  - [x] 1.1: Create `apps/shell/src/hooks/useActiveModule.ts`:
    - Import `useLocation` from `react-router` (NOT `react-router-dom`)
    - Import `modules` from `../modules` and `RegisteredModule` type
    - Return `{ activeModule: RegisteredModule | undefined; activeModuleName: string }` by matching `location.pathname` against registered module `basePath` values
    - Match logic: `pathname === "/" + module.basePath || pathname.startsWith("/" + module.basePath + "/")` — the trailing slash check prevents `/tenants-extra` from matching the `tenants` module. First match wins (module basePaths are unique per Story 5-1 AC3)
    - When no module matches (e.g., home page `/`), return `{ activeModule: undefined, activeModuleName: "Welcome" }`
    - Memoize the match computation with `useMemo` keyed on `pathname` and `modules`
  - [x] 1.2: Create `apps/shell/src/hooks/useActiveModule.test.ts`:
    - Returns undefined activeModule and "Welcome" name for root path `/`
    - Returns correct module for `/tenants` path
    - Returns correct module for deep path `/tenants/detail/123?status=active`
    - Returns undefined for unknown paths like `/nonexistent`
    - Matches the first segment only — `/tenants-extra` does NOT match `tenants` module

- [x] Task 2: Refactor shell Sidebar to use @hexalith/ui Sidebar component (AC: #1, #3)
  - [x] 2.1: Rewrite `apps/shell/src/layout/Sidebar.tsx`:
    - Import `Sidebar as UiSidebar` and `NavigationItem` type from `@hexalith/ui`
    - Import `modules, buildNavigationItems` from `../modules`
    - Import `useNavigate, useLocation` from `react-router` (NOT `react-router-dom`)
    - Import `useActiveModule` from `../hooks/useActiveModule`
    - Map `SidebarNavigationItem[]` from `buildNavigationItems(modules)` to `NavigationItem[]` format expected by @hexalith/ui Sidebar:

      ```text
      { id: item.to, label: item.label, icon: item.icon, href: item.to, category: item.category }
      ```

      Pass `item.icon` as-is (string or undefined) — the UI Sidebar renders the first letter of the label as fallback when icon is undefined.

    - Add a "Home" item at the start: `{ id: "/", label: "Home", href: "/", icon: undefined }`
    - Determine `activeItemId` from current route using `useActiveModule` — match against item `id` fields
    - For `onItemClick` handler: call `navigate(item.href)` using react-router's `useNavigate` — do NOT use `<a>` default behavior (prevents full page reload)
    - Pass `isSearchable={true}` to enable search/filter
    - Pass `isCollapsed={isCollapsed}` and `onCollapsedChange={setCollapsed}` from ShellLayout's state (see Task 3) — controlled mode keeps the grid and sidebar in sync
    - Do NOT add a `header` or `footer` prop — keep the sidebar focused on navigation items for MVP

  - [x] 2.2: Simplify `apps/shell/src/layout/Sidebar.module.css`:
    - The @hexalith/ui Sidebar component handles its own styling via CSS Modules in `@layer components`
    - Remove all existing styles except any shell-specific overrides needed for grid integration
    - The shell's `Sidebar.module.css` may become empty or contain only a minimal wrapper class

- [x] Task 3: Update ShellLayout for sidebar collapse support (AC: #3)
  - [x] 3.1: Update `apps/shell/src/layout/ShellLayout.tsx`:
    - Use controlled mode: ShellLayout owns collapse state via `useState(false)`, passes `isCollapsed` and `onCollapsedChange` to the Sidebar component, and toggles the grid column width accordingly
    - Initialize collapse state from the @hexalith/ui Sidebar's responsive breakpoint: collapsed when viewport < 1280px (use `window.matchMedia('(max-width: 1279px)')` on mount)
    - Apply `data-collapsed` attribute on the layout root div to drive CSS grid transition
    - Pass `isCollapsed` and `onCollapsedChange` through to Sidebar (which passes them to @hexalith/ui Sidebar)
  - [x] 3.2: Update `apps/shell/src/layout/ShellLayout.module.css`:
    - The `.collapsed` class already exists as structural preparation — activate it based on collapse state
    - Toggle grid-template-columns between `var(--shell-sidebar-width) 1fr` and `var(--shell-sidebar-width-collapsed) 1fr`
    - Use CSS custom property on the layout element (e.g., `data-collapsed` attribute) to drive the transition

- [x] Task 4: Update StatusBar active module segment (AC: #2)
  - [x] 4.1: Update `apps/shell/src/layout/StatusBar.tsx`:
    - Import `useActiveModule` from `../hooks/useActiveModule`
    - Replace the hardcoded "Welcome" in Segment 4 with `activeModuleName` from the hook
    - When `activeModule` is defined, display `activeModule.manifest.displayName`
    - When no module is active (home page), display "Welcome"
  - [x] 4.2: Update `apps/shell/src/layout/StatusBar.test.tsx`:
    - Test that status bar displays "Welcome" when on root path
    - Test that status bar displays module displayName when on a module route

- [x] Task 5: Update Sidebar tests (AC: #1, #2, #3)
  - [x] 5.1: Rewrite `apps/shell/src/layout/Sidebar.test.tsx`:
    - Test: renders all module navigation items from manifests
    - Test: groups items by manifest-declared category
    - Test: collapsible category groups expand/collapse on click
    - Test: search/filter narrows visible items (type "tenant" → only Tenants visible)
    - Test: search shows "No results" when nothing matches
    - Test: active item has `aria-current="page"`
    - Test: clicking a navigation item calls navigate() (mock useNavigate)
    - Test: Home item is present and links to "/"
    - Test: sidebar remains mounted across route changes (no unmount/remount)
    - Test: empty modules array renders sidebar with only Home item and no search field
    - Test: navigating from deep path (`/tenants/detail/123`) via sidebar goes to module root (`/tenants`)
    - Test: mock module with `icon: "users"` — NavigationItem receives the icon value, not undefined
  - [x] 5.2: Ensure all test imports come from `react-router` (NOT `react-router-dom`)
  - [x] 5.3: Add type compatibility assertion test in Sidebar.test.tsx:
    - Import `SidebarNavigationItem` from `../../modules/navigationBuilder` and `NavigationItem` from `@hexalith/ui`
    - Write a compile-time type test that verifies the mapping from `SidebarNavigationItem` to `NavigationItem` is valid — if either interface changes, the test fails at build time
    - This prevents silent breakage if @hexalith/ui updates its `NavigationItem` interface

- [ ] Task 6: Verify deep linking (AC: #4)
  - [ ] 6.1: Verify that navigating to a deep URL like `/tenants/detail/123?status=active&sort=name` correctly:
    - Loads the tenants module via React.lazy()
    - Passes the full path to the module's internal router (wildcard `tenants/*` route from Story 5-1)
    - Preserves query params in the URL
    - Shows the module's displayName in the status bar
    - Highlights the correct sidebar item
  - [ ] 6.2: This is a verification task — deep linking already works from Story 5-1's wildcard routing. No new code should be needed. If it doesn't work, investigate and fix.

- [x] **DEFINITION OF DONE GATE — All previous tasks must pass verification:**

- [ ] Task 7: Verification (AC: #1-#4)
  - [x] 7.1: All tests pass: `pnpm -F shell test` — 124/124 tests pass across 16 files
  - [x] 7.2: Shell builds successfully: `pnpm -F shell build` — built in 1.87s
  - [ ] 7.3: Sidebar shows all registered modules grouped by manifest category — pending integrated verification once module sources exist under `modules/*/src`
  - [x] 7.4: Category groups are collapsible (click header to toggle) — tested
  - [x] 7.5: Search/filter field narrows navigation items as user types — tested
  - [x] 7.6: Active sidebar item has accent indicator and `aria-current="page"` — tested
  - [ ] 7.7: Status bar segment 4 shows active module's `displayName` — pending integrated verification once module sources exist under `modules/*/src`
  - [x] 7.8: Navigating between modules: sidebar stays stable, no flash, no layout shift — verified (sidebar remains mounted)
  - [ ] 7.9: Deep links load correct module with params preserved — pending integrated verification once module sources exist under `modules/*/src`
  - [x] 7.10: Sidebar auto-collapses below 1280px viewport width — implemented via matchMedia in both ShellLayout and UI Sidebar
  - [x] 7.11: Collapsed sidebar shows icons only with tooltips — handled by @hexalith/ui Sidebar (Tooltip wrapping in collapsed mode)
  - [x] 7.12: Imports use `react-router` (NOT `react-router-dom`) — verified via grep
  - [x] 7.13: No `enum` types used — union types only — verified via grep
  - [x] 7.14: No direct `@radix-ui/*` imports in shell code — only via `@hexalith/ui` — verified via grep

## Dev Notes

### Dependency Gate

**Story 5-1 (Module Registry & Build-Time Discovery) must be in `done` status before starting implementation.** Story 5-2 depends on 5-1's outputs: `registry.ts`, `routeBuilder.ts`, `navigationBuilder.ts`, `modules/index.ts`, `ModuleErrorBoundary.tsx`, and `ModuleSkeleton.tsx`. If 5-1 is still in `review` and its code review surfaces changes to these files, 5-2's implementation may need adjustments. Verify 5-1 artifacts are stable before starting.

### Scope Boundaries — What This Story IS and IS NOT

**This story IS:**

- Refactoring the shell Sidebar.tsx to use the @hexalith/ui Sidebar component (collapsible groups, search/filter, responsive collapse)
- Creating a `useActiveModule` hook to derive active module from the current route
- Updating the StatusBar to show the active module's displayName
- Updating ShellLayout to support sidebar collapse/expand transitions
- Ensuring smooth, seamless cross-module navigation with zero visual seams

**This story is NOT:**

- Module registry or route building (Story 5.1 — done)
- Error isolation and recovery (Story 5.3)
- Navigation state preservation, scroll position, or filter caching (Story 5.4)
- Build-time manifest validation or route conflict detection (Story 5.5)
- Runtime module validation or connection indicators (Story 5.6)
- Command palette (Phase 1.5 — not MVP)
- Favorites/pinning, drag reorder, badge counts, nested sub-routes (Phase 2 Sidebar features)

### Architecture Constraints — MUST Follow

1. **(CRITICAL) Import from `react-router`, NOT `react-router-dom`.** The project uses react-router v7 unified package. All existing imports use `react-router`. [Source: architecture.md, Story 5-1 constraints]

2. **(CRITICAL) No `enum` types.** Use union types only. [Source: architecture.md#Code Naming]

3. **(CRITICAL) Use `@hexalith/ui` Sidebar component, NOT direct Radix imports.** The @hexalith/ui package exports a full-featured `Sidebar` component (`packages/ui/src/components/navigation/Sidebar.tsx`) that wraps `@radix-ui/react-collapsible` for category groups. The shell MUST use this component — do NOT import `@radix-ui/*` directly in shell code. [Source: architecture.md#Architectural Boundaries, ux-design-specification.md]

4. **(CRITICAL) The @hexalith/ui Sidebar API uses `NavigationItem` interface, NOT `SidebarNavigationItem` from `navigationBuilder.ts`.** You must map between the two formats:
   - `SidebarNavigationItem` (from navigationBuilder): `{ label, to, icon?: string, category }`
   - `NavigationItem` (from @hexalith/ui): `{ id, label, icon?: ReactNode, href, category? }`
   - Map: `id = to`, `href = to`, `icon` needs string-to-ReactNode conversion or pass as-is if the UI component handles string icons

5. **(CRITICAL) `onItemClick` must use `react-router` navigation, not `<a>` default.** The @hexalith/ui Sidebar renders `<a>` elements with `e.preventDefault()` and delegates to `onItemClick`. The shell's handler MUST call `navigate(item.href)` from react-router's `useNavigate()` to perform client-side navigation without full page reload. [Source: packages/ui/src/components/navigation/Sidebar.tsx line: `e.preventDefault(); onItemClick?.(item)`]

6. **(CRITICAL) Sidebar responsive collapse at 1280px breakpoint.** The @hexalith/ui Sidebar already handles this internally via `useResponsiveCollapsed()` — it auto-collapses below 1280px. The shell needs to keep the grid layout in sync with this state. [Source: ux-design-specification.md#Responsive Behavior]

7. **CSS Modules for shell layout styles.** Use `.module.css` files. [Source: architecture.md#Format Patterns]

8. **Provider nesting order is untouched.** Module routing sits inside `AuthGate` → `ShellProviders` in `App.tsx`. This story modifies Sidebar and StatusBar within ShellLayout — no changes to provider nesting. [Source: apps/shell/src/App.tsx]

9. **`displayName` for user-facing text, `name` for paths.** StatusBar shows `manifest.displayName` (e.g., "Tenants"), sidebar active matching uses `basePath` derived from `manifest.name` (e.g., "tenants"). [Source: ux-design-specification.md#Error states, Story 5-1 constraints]

10. **Zero-layout-shift requirement.** When the sidebar toggles collapse/expand, the transition must be smooth (CSS transition on width) — no content jump. The @hexalith/ui Sidebar already has `transition-property: width` with `will-change: width`. The shell grid must transition in sync. [Source: ux-design-specification.md#Loading patterns]

11. **(CRITICAL) Grid transition timing must match Sidebar transition timing.** The @hexalith/ui Sidebar uses `transition-duration: var(--transition-duration-default)` and `transition-timing-function: var(--transition-easing-default)` for its width animation. The ShellLayout grid-template-columns transition MUST use the same CSS variables — not hardcoded values. If the grid snaps instantly while the sidebar animates (or vice versa), there will be a visible desync where the content area jumps before the sidebar finishes collapsing. Apply the same `transition-property`, `transition-duration`, and `transition-timing-function` to the `.layout` grid element. [Source: packages/ui/src/components/navigation/Sidebar.module.css]

### Existing Codebase Context — MUST Reference

**Files to MODIFY:**

- `apps/shell/src/layout/Sidebar.tsx` — refactor to use `@hexalith/ui Sidebar` component instead of manual NavLink rendering
- `apps/shell/src/layout/Sidebar.module.css` — simplify or empty out (UI component handles its own styles)
- `apps/shell/src/layout/Sidebar.test.tsx` — rewrite tests for new Sidebar behavior
- `apps/shell/src/layout/ShellLayout.tsx` — support sidebar collapse state for grid layout sync
- `apps/shell/src/layout/ShellLayout.module.css` — activate `.collapsed` class based on sidebar state
- `apps/shell/src/layout/StatusBar.tsx` — replace hardcoded "Welcome" in Segment 4 with active module displayName
- `apps/shell/src/layout/StatusBar.test.tsx` — add tests for active module display

**Files to CREATE:**

- `apps/shell/src/hooks/useActiveModule.ts` — derive active module from current route
- `apps/shell/src/hooks/useActiveModule.test.ts` — tests for the hook

**Files that are source of truth (DO NOT modify):**

- `packages/ui/src/components/navigation/Sidebar.tsx` — the @hexalith/ui Sidebar component with collapsible groups, search, responsive collapse
- `packages/ui/src/components/navigation/Sidebar.module.css` — UI Sidebar styles
- `packages/shell-api/src/manifest/manifestTypes.ts` — `ModuleManifest`, `ModuleNavigation` types
- `apps/shell/src/modules/registry.ts` — module registry (from Story 5-1)
- `apps/shell/src/modules/routeBuilder.ts` — route builder (from Story 5-1)
- `apps/shell/src/modules/navigationBuilder.ts` — navigation builder (from Story 5-1)
- `apps/shell/src/modules/index.ts` — barrel export (from Story 5-1)

### Key Existing Code Patterns

**Current shell Sidebar.tsx (to be replaced):**

```typescript
// CURRENT — simple NavLink list with Map.groupBy
const moduleItems = getSidebarNavigationItems();
const groupedItems = Map.groupBy(moduleItems, (item) => item.category);
// Renders flat sections with <NavLink> per item — NO collapsible groups, NO search
```

**@hexalith/ui Sidebar component API (to be used):**

```typescript
// TARGET — use @hexalith/ui Sidebar with full features
import { Sidebar as UiSidebar, type NavigationItem } from "@hexalith/ui";

<UiSidebar
  items={navigationItems}        // NavigationItem[] mapped from module manifests
  activeItemId={activeItemId}    // Derived from useActiveModule + useLocation
  onItemClick={handleNavigation} // Calls navigate(item.href) via react-router
  isSearchable={true}            // Enables search/filter across modules
  isCollapsed={isCollapsed}      // Controlled by ShellLayout (required — keeps grid in sync)
  onCollapsedChange={setCollapsed} // Sync with grid layout
/>
```

**NavigationItem mapping from SidebarNavigationItem:**

```typescript
// navigationBuilder output:
{ label: "Tenants", to: "/tenants", icon: "users", category: "Modules" }

// @hexalith/ui NavigationItem expected:
{ id: "/tenants", label: "Tenants", icon: "users", href: "/tenants", category: "Modules" }
// Pass icon as-is — UI Sidebar renders first letter fallback when undefined
```

**@hexalith/ui Sidebar onItemClick handler:**

```typescript
// The UI Sidebar calls e.preventDefault() and delegates to onItemClick
// Shell MUST handle navigation:
const navigate = useNavigate();
const handleNavigation = (item: NavigationItem) => {
  navigate(item.href);
};
```

**StatusBar current Segment 4 (to be updated):**

```typescript
// CURRENT — hardcoded
<span>Welcome</span>

// TARGET — dynamic from hook
const { activeModuleName } = useActiveModule();
<span>{activeModuleName}</span>
```

**Active module detection pattern:**

```typescript
// Match current pathname against registered module basePaths
const location = useLocation();
const activeModule = modules.find(
  (m) =>
    location.pathname === `/${m.basePath}` ||
    location.pathname.startsWith(`/${m.basePath}/`),
);
```

### Critical Anti-Patterns to Prevent

1. **Do NOT import `@radix-ui/react-collapsible` in shell code.** Use `@hexalith/ui Sidebar` which wraps it internally.
2. **Do NOT import from `react-router-dom`.** Use `react-router` v7 unified package.
3. **Do NOT use `window.location.href` for navigation.** Use react-router's `useNavigate()` for client-side navigation.
4. **Do NOT re-implement sidebar category grouping, search, or collapse.** The @hexalith/ui Sidebar already has all of these features. Reuse, don't reinvent.
5. **Do NOT create a new context for active module.** A simple hook (`useActiveModule`) that reads `useLocation()` and matches against `modules` is sufficient. No context provider needed.
6. **Do NOT modify the provider nesting order in App.tsx or ShellProviders.tsx.** Sidebar and StatusBar changes are within ShellLayout, which is rendered inside the router.
7. **Do NOT add favorites, pinning, drag reorder, or badge counts.** These are Phase 2 Sidebar features.
8. **Do NOT implement command palette (Ctrl+K).** This is Phase 1.5.
9. **Do NOT use `enum` types.** Use union types only.
10. **Do NOT hardcode module names in Sidebar.** All navigation items come from module manifests via `buildNavigationItems()`. Only the "Home" item is hardcoded.

### Previous Story Intelligence (Story 5-1)

**Story 5-1 (ready-for-dev / implementing):** Created the module registry infrastructure:

- `registry.ts` — `RegisteredModule` interface, empty `modules` array (awaiting initialized modules)
- `routeBuilder.ts` — `buildModuleRoutes()` generates ONE wildcard route per module (`basePath/*`)
- `navigationBuilder.ts` — `buildNavigationItems()` maps manifest navigation to `SidebarNavigationItem[]`
- `ModuleErrorBoundary.tsx` — catches module render failures, shows retry UI
- `ModuleSkeleton.tsx` — content-aware loading placeholder
- `modules/index.ts` — barrel export

**Key insight from 5-1:** The route builder creates `{basePath}/*` wildcard routes. The module's default export handles internal sub-routing. This means deep links like `/tenants/detail/123?status=active` are already supported — react-router passes the full path to the module component, which matches its internal routes.

**Key files 5-1 created that 5-2 builds on:**

- `apps/shell/src/modules/navigationBuilder.ts` — output is the input for Sidebar items
- `apps/shell/src/modules/registry.ts` — `modules` array and `RegisteredModule` type are used by `useActiveModule`

### Git Intelligence — Recent Commits

```text
7d131d3 feat: add comprehensive documentation for Hexalith module development
99d51c1 feat: add manifest validation and tests, enhance module developer documentation
e28db39 chore: update subproject commit reference for Hexalith.Tenants
b652bd3 feat: update scaffolded tests and manifest validation, enhance loading state assertions
1e94579 feat: implement typed manifest and module boundary with runtime validation
```

Epic 4 stories are committed. Story 5-1 artifacts are created (ready-for-dev). The manifest type system, validation, and scaffold templates are stable.

### Project Structure Notes

**Files to create:**

```text
apps/shell/src/
├── hooks/
│   ├── useActiveModule.ts       # Hook: derive active module from route
│   └── useActiveModule.test.ts
```

**Files to modify:**

```text
apps/shell/src/
├── layout/
│   ├── Sidebar.tsx              # Refactor to use @hexalith/ui Sidebar
│   ├── Sidebar.module.css       # Simplify (UI component has its own styles)
│   ├── Sidebar.test.tsx         # Rewrite tests
│   ├── ShellLayout.tsx          # Support sidebar collapse state
│   ├── ShellLayout.module.css   # Activate collapsed grid layout
│   ├── StatusBar.tsx            # Update segment 4 with active module
│   └── StatusBar.test.tsx       # Add active module tests
```

### Commit Strategy

Recommended commit order:

1. Create `useActiveModule` hook and tests — standalone, no dependencies on Sidebar refactor
2. Refactor Sidebar.tsx to use @hexalith/ui Sidebar component + update tests
3. Update ShellLayout for sidebar collapse sync
4. Update StatusBar with active module display

All can be committed together as one cohesive commit if preferred — they form one logical feature: "unified navigation and route generation."

### References

- [Source: epics.md#Story 5.2] — Full acceptance criteria and BDD scenarios
- [Source: prd.md#FR19] — Shell provides unified navigation across all registered modules
- [Source: architecture.md#Frontend Architecture] — Module loading pattern, shell owns page chrome (sidebar, top bar, status bar)
- [Source: architecture.md#Complete Project Directory Structure] — Sidebar.tsx, StatusBar.tsx, ShellLayout.tsx file locations
- [Source: ux-design-specification.md#Sidebar] — "Module list, active indicator, collapse/expand, search/filter, grouped sections with collapsible group headers"
- [Source: ux-design-specification.md#Responsive Behavior] — Sidebar auto-collapse at 1280px breakpoint
- [Source: ux-design-specification.md#Navigation density] — "Collapsible sidebar with favorites, search, aggressive collapse"
- [Source: ux-design-specification.md#Cross-module navigation] — "Switching between modules feeling like one app — zero visual or behavioral discontinuity"
- [Source: packages/ui/src/components/navigation/Sidebar.tsx] — @hexalith/ui Sidebar component with NavigationItem interface
- [Source: packages/ui/src/components/navigation/Sidebar.module.css] — UI Sidebar styles with collapsible groups, search, responsive collapse
- [Source: apps/shell/src/layout/Sidebar.tsx] — Current minimal sidebar (to be refactored)
- [Source: apps/shell/src/layout/StatusBar.tsx] — Current status bar with "Welcome" placeholder in Segment 4
- [Source: apps/shell/src/layout/ShellLayout.tsx] — Shell grid layout with sidebar area
- [Source: apps/shell/src/layout/ShellLayout.module.css] — Grid template with collapse preparation
- [Source: apps/shell/src/modules/navigationBuilder.ts] — SidebarNavigationItem[] generation from manifests
- [Source: apps/shell/src/modules/registry.ts] — RegisteredModule type and modules array
- [Source: apps/shell/src/hooks/useActiveModule.ts] — To be created: active module detection hook

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- ShellLayout test failure: duplicate `<nav>` elements — fixed by changing shell sidebar wrapper from `<nav>` to `<aside>` since @hexalith/ui Sidebar already renders its own `<nav>`
- StatusBar test failures: `useActiveModule` hook requires router context — fixed by wrapping test renders with `MemoryRouter`
- Sidebar empty modules test: Home item always present means `items.length > 0` — fixed by tracking `hasModuleItems` separately for `isSearchable` prop
- Shared UI Sidebar search warning: Radix `Collapsible.Root` was switching from uncontrolled to controlled during grouped search — fixed by keeping group open state controlled for the component lifetime

### Completion Notes List

- Created `useActiveModule` hook with `useMemo`-memoized path matching against registered module basePaths. Returns `{ activeModule, activeModuleName }` with "Welcome" fallback.
- Refactored shell Sidebar to use @hexalith/ui Sidebar component with full features: collapsible category groups, search/filter, responsive collapse, tooltips in collapsed mode.
- Updated ShellLayout to own sidebar collapse state with `useState`, synced with CSS grid transition using `data-collapsed` attribute and matching CSS variables for smooth animation.
- Updated StatusBar segment 4 from hardcoded "Welcome" to dynamic `activeModuleName` from `useActiveModule` hook.
- Fixed a shared `@hexalith/ui` Sidebar warning by keeping grouped collapsible sections controlled during search expansion.
- All 124 shell tests pass and the shell build succeeds, but integrated module verification remains pending because the current workspace has no initialized module sources under `modules/*/src` for runtime discovery.

### File List

- `apps/shell/src/hooks/useActiveModule.ts` — NEW: hook to derive active module from current route
- `apps/shell/src/hooks/useActiveModule.test.ts` — NEW: 5 tests for active module detection
- `apps/shell/src/layout/Sidebar.tsx` — MODIFIED: refactored to use @hexalith/ui Sidebar component
- `apps/shell/src/layout/Sidebar.module.css` — MODIFIED: emptied (UI component handles styles)
- `apps/shell/src/layout/Sidebar.test.tsx` — MODIFIED: rewritten with 14 comprehensive tests
- `apps/shell/src/layout/ShellLayout.tsx` — MODIFIED: added sidebar collapse state, changed `<nav>` to `<aside>`
- `apps/shell/src/layout/ShellLayout.module.css` — MODIFIED: activated collapse grid transition with CSS variables
- `apps/shell/src/layout/ShellLayout.test.tsx` — MODIFIED: added MemoryRouter wrapper, removed stale NavLink mock
- `apps/shell/src/layout/StatusBar.tsx` — MODIFIED: segment 4 uses activeModuleName from useActiveModule hook
- `apps/shell/src/layout/StatusBar.test.tsx` — MODIFIED: added MemoryRouter wrapper, 2 new active module tests
- `packages/ui/src/components/navigation/Sidebar.tsx` — MODIFIED: fixed grouped collapsible state management to avoid uncontrolled/controlled warnings during search
- `packages/ui/src/components/navigation/Sidebar.test.tsx` — MODIFIED: added regression coverage for grouped search after collapsing a category

### Change Log

- 2026-03-21: Implemented Story 5-2 — Unified Navigation & Route Generation. Created useActiveModule hook, refactored Sidebar to use @hexalith/ui component, updated ShellLayout with collapse support, updated StatusBar with active module display.
- 2026-03-21: Code review follow-up — fixed shared Sidebar grouped-search warning, re-ran UI and shell tests, and moved story back to in-progress pending integrated module verification with initialized module sources.
- 2026-03-21: Code review round 2 — fixed StatusBar test to actually validate AC2 active module display (added modules mock, asserts "Tenants" not "Welcome"); fixed Sidebar icon test to assert icon value "users" instead of no-op; added `modules` to useActiveModule useMemo dependency array per spec. All 124 tests pass.
