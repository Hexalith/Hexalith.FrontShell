# Story 5.1: Module Registry & Build-Time Discovery

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a shell team developer,
I want the shell to discover and register modules from their typed manifests at build time,
So that adding a new module requires only adding its repository reference — routes and navigation register automatically.

## Acceptance Criteria

1. **AC1 — Build-time manifest discovery.** Given module repositories are added as git submodules in the `modules/` directory, when the shell build runs, then the build system discovers all `manifest.ts` files from registered modules, and each module's default export (root component) is registered with `React.lazy()` for code splitting, and only the active module's code is loaded at runtime.

2. **AC2 — Route and navigation registration.** Given a module manifest is imported at build time, when the shell processes the manifest, then routes from `manifest.routes` are registered with react-router v7, and navigation items from `manifest.navigation` are added to the sidebar, and each module route is wrapped in `<ModuleErrorBoundary>` and `<Suspense fallback={<ModuleSkeleton />}>`.

3. **AC3 — Zero-code-change module addition.** Given a shell team developer wants to add a new module, when they add the module's git repository as a submodule in `modules/` and add it to `pnpm-workspace.yaml`, then the module's routes and navigation appear in the shell on next build, and no code changes to the shell application are required beyond the submodule addition.

4. **AC4 — Content-aware loading skeleton.** Given `React.lazy()` loads a module, when the module chunk is fetched, then a content-aware `<ModuleSkeleton>` is displayed during loading (not a spinner), and the skeleton matches the expected page layout shape.

5. **AC5 — Performance gates.** Given multiple modules are registered, when the shell builds with 5 modules, then build time is measured and logged — must be ≤ 90 seconds (NFR5 MVP target), and module page load (route change to first meaningful paint) is measured — must be < 1 second (NFR1), and shell initial cold start is measured — must be < 3 seconds on simulated 4G (NFR6), and per-module code splitting produces separate chunks for each module via dynamic `import()` boundaries, and Vite `manualChunks` configuration splits vendor libraries into separate cached chunks, and asset filenames use content hashing for long-term browser caching.

*FRs covered: FR18, FR29*

## Tasks / Subtasks

- [ ] Task 1: Create module registry (AC: #1, #2, #3)
  - [ ] 1.1: Create `apps/shell/src/modules/registry.ts` — the central module registry that replaces `placeholderModules.tsx`. This file must:
    - Export a `RegisteredModule` interface: `{ manifest: ModuleManifest; component: React.LazyExoticComponent<React.ComponentType>; basePath: string }`
    - Export a `modules` array of `RegisteredModule[]` that imports each module from `modules/*/src/index.ts` — **each import uses `React.lazy(() => import(...))`** for code splitting
    - Import manifest from each module's barrel export (e.g., `import { manifest as tenantsManifest } from '@hexalith/tenants'` or the module's workspace name)
    - Use a consistent pattern: for each module in `modules/`, import its manifest statically (for build-time validation) and its default export lazily (for code splitting)
    - Include `hexalith-demo-tasks` and `hexalith-test-orders` if they have manifests; if empty/uninitialized, keep only modules with valid content
    - **Key pattern:** manifest is imported statically (used at build time for route/nav generation), component is imported lazily (loaded at runtime only when user navigates to module)
  - [ ] 1.2: Create `apps/shell/src/modules/routeBuilder.ts` — generates react-router v7 route config from registered modules:
    - Export `buildModuleRoutes(modules: RegisteredModule[]): RouteObject[]` — maps each module's manifest routes to react-router route objects
    - Each route `path` is prefixed with the module's `basePath` (derived from `manifest.name`)
    - Each route element is wrapped in `<ModuleErrorBoundary name={manifest.displayName}>` (outermost) then `<Suspense fallback={<ModuleSkeleton />}>` (inside ErrorBoundary) — this nesting order is critical so ErrorBoundary catches lazy import failures that Suspense converts to errors
    - For modules that export a `routes` array (with sub-routes like `/detail/:id`, `/create`): use the module's own route definitions as children under a parent route at `basePath/*`
    - For the module's root route (`/`): render the module's default export component
    - The route structure must support both flat routes (single page module) and nested routes (multi-page module)
  - [ ] 1.3: Create `apps/shell/src/modules/navigationBuilder.ts` — generates sidebar navigation items from registered modules:
    - Export `buildNavigationItems(modules: RegisteredModule[]): SidebarNavigationItem[]`
    - Maps `manifest.navigation` entries to sidebar items with `to` path prefixed by `basePath`
    - Preserves `icon`, `category`, `label` from manifest
    - Category defaults to `"Modules"` when not specified
  - [ ] 1.4: Create `apps/shell/src/modules/index.ts` — barrel export for the modules directory:
    - Re-exports `modules` from `registry.ts`
    - Re-exports `buildModuleRoutes` from `routeBuilder.ts`
    - Re-exports `buildNavigationItems` from `navigationBuilder.ts`
    - Re-exports `RegisteredModule`, `SidebarNavigationItem` types

- [ ] Task 2: Create ModuleErrorBoundary (AC: #2)
  - [ ] 2.1: Create `apps/shell/src/errors/ModuleErrorBoundary.tsx` — React error boundary that catches module render failures:
    - Props: `name: string` (module display name), `children: ReactNode`
    - On error: displays a contextual error UI with module name, user-friendly message, and retry button
    - Use `ErrorDisplay` from `@hexalith/ui` for consistent styling
    - Retry button resets the error boundary state (re-renders the module)
    - Does NOT catch expected business errors (those are handled inline by CQRS hooks)
    - Log error details to console: module name, error type, stack trace, timestamp (prepared for Epic 6 FR51 monitoring integration)
  - [ ] 2.2: Create `apps/shell/src/errors/ModuleErrorBoundary.test.tsx` — tests:
    - Module render error is caught and fallback UI is shown
    - Module name appears in error display
    - Retry button resets error boundary and re-renders module
    - Other modules remain unaffected (isolation)
    - When lazy import rejects (chunk load failure), error boundary catches and shows retry UI (not infinite re-render)

- [ ] Task 3: Create ModuleSkeleton (AC: #4)
  - [ ] 3.1: Create `apps/shell/src/errors/ModuleSkeleton.tsx` — content-aware loading placeholder:
    - Uses `Skeleton` from `@hexalith/ui` with `variant="card"` or appropriate layout variant
    - Matches the expected page layout shape: a page header area + a content area (card-like skeleton)
    - Must NOT be a simple spinner — the UX spec requires "content-aware loading skeletons that match the actual content layout"
    - Keep it simple: a layout-matching skeleton (header bar skeleton + content area skeleton) that feels intentional
    - Uses design tokens for spacing and sizing
  - [ ] 3.2: Create `apps/shell/src/errors/ModuleSkeleton.test.tsx` — tests:
    - Renders without crashing
    - Contains skeleton elements (not a spinner)
    - Accessible (no missing ARIA attributes)

- [ ] Task 4: Update App.tsx to use real module registry (AC: #1, #2, #3)
  - [ ] 4.1: Update `apps/shell/src/App.tsx`:
    - Replace `import { getModuleRoutes } from "./modules/placeholderModules"` with `import { modules, buildModuleRoutes } from "./modules"`
    - Replace `const moduleRoutes = getModuleRoutes()` with `const moduleRoutes = buildModuleRoutes(modules)`
    - Router creation remains in `createAppRouter()` using `createBrowserRouter`
    - Import from `react-router` (NOT `react-router-dom`)
  - [ ] 4.2: Update `apps/shell/src/layout/Sidebar.tsx`:
    - Replace `import { getSidebarNavigationItems } from "../modules/placeholderModules"` with `import { modules, buildNavigationItems } from "../modules"`
    - Replace `const moduleItems = getSidebarNavigationItems()` with `const moduleItems = buildNavigationItems(modules)`
    - Keep the existing rendering logic (groupBy category, NavLink items)

- [ ] Task 5: Configure Vite for per-module code splitting (AC: #5)
  - [ ] 5.1: Update `apps/shell/vite.config.ts`:
    - Add `build.rollupOptions.output.manualChunks` configuration to split vendor libraries:
      - `react-vendor`: `react`, `react-dom`, `react/jsx-runtime`
      - `router-vendor`: `react-router`
      - `query-vendor`: `@tanstack/react-query` (if used)
      - `radix-vendor`: `@radix-ui/*` packages
    - Verify asset filenames use content hashing (Vite default: `assets/[name]-[hash].[ext]`)
    - **Do NOT manually configure per-module chunks** — `React.lazy()` with dynamic imports automatically creates separate chunks per module via Vite/Rollup code splitting
  - [ ] 5.2: Verify code splitting works by running `pnpm -F shell build` and checking `dist/assets/` for separate module chunks

- [ ] Task 6: Delete placeholder module code (AC: #1, #3)
  - [ ] 6.1: Delete `apps/shell/src/modules/placeholderModules.tsx` — fully replaced by `registry.ts` + `routeBuilder.ts` + `navigationBuilder.ts`
  - [ ] 6.2: Delete `apps/shell/src/pages/TenantsPlaceholderPage.tsx` — no longer needed; real module components are loaded from `modules/`
  - [ ] 6.3: Verify no remaining imports reference deleted files (search for `placeholderModules` and `TenantsPlaceholderPage` across codebase)

- [ ] Task 7: Write tests for module registry and route builder (AC: #1, #2)
  - [ ] 7.1: Create `apps/shell/src/modules/registry.test.ts`:
    - All registered modules have valid manifests (validate using `validateManifest`)
    - Each module has a lazy component and basePath
    - Module names are unique
    - Module basePaths are unique
  - [ ] 7.2: Create `apps/shell/src/modules/routeBuilder.test.ts`:
    - Routes are generated correctly from manifests
    - Route paths are prefixed with module basePath
    - Each route element is wrapped in ErrorBoundary (outermost) then Suspense (inside)
    - Empty modules array produces empty routes
    - Multiple modules produce non-colliding routes (test with 2+ mock modules)
    - Module basePath does not collide with reserved shell paths (`""`, `"*"`)
  - [ ] 7.3: Create `apps/shell/src/modules/navigationBuilder.test.ts`:
    - Navigation items are generated from manifests
    - Paths are prefixed with module basePath
    - Default category is "Modules"
    - Empty modules array produces empty navigation

- [ ] Task 8: Performance measurement setup (AC: #5)
  - [ ] 8.1: Run `pnpm -F shell build` and log build time. Must be ≤ 90 seconds with current module count (verify baseline)
  - [ ] 8.2: Verify Vite output shows per-module chunks in `dist/assets/` (separate `.js` files per dynamically imported module)
  - [ ] 8.3: Verify vendor chunks are split (react, react-router as separate cached chunks)
  - [ ] 8.4: Verify content-hashed filenames in build output

- [ ] **DEFINITION OF DONE GATE — All previous tasks must pass verification:**

- [ ] Task 9: Verification (AC: #1-#5)
  - [ ] 9.1: All tests pass: `pnpm -F shell test`
  - [ ] 9.2: Shell builds successfully: `pnpm -F shell build`
  - [ ] 9.3: No references to `placeholderModules` or `TenantsPlaceholderPage` remain in the codebase
  - [ ] 9.4: Module routes appear correctly in the shell when running `pnpm -F shell dev`
  - [ ] 9.5: Sidebar navigation shows modules grouped by category
  - [ ] 9.6: Navigating to a module route shows ModuleSkeleton during lazy load, then module content
  - [ ] 9.7: ModuleErrorBoundary catches render errors and shows retry UI
  - [ ] 9.8: Build output contains separate chunks per module (code splitting verification)
  - [ ] 9.9: Imports use `react-router` (NOT `react-router-dom`)
  - [ ] 9.10: No `enum` types used — union types only

## Dev Notes

### Scope Boundaries — What This Story IS and IS NOT

**This story IS:**
- Creating a dynamic module registry that discovers modules from `modules/` directory at build time
- Creating route builder and navigation builder that work from module manifests
- Creating ModuleErrorBoundary and ModuleSkeleton components
- Configuring Vite for per-module code splitting and vendor chunking
- Replacing the static placeholder module system with real module discovery

**This story is NOT:**
- Unified navigation polish (Story 5.2 — sidebar grouping, search, deep linking)
- Error isolation and recovery logic (Story 5.3 — backend failure handling, error logging)
- Navigation state preservation and caching (Story 5.4 — scroll position, filter state)
- Build-time manifest validation and cross-module dependency detection (Story 5.5 — semantic validation, ESLint rules)
- Runtime module validation and connection indicators (Story 5.6 — loading failure retry, connection state)

### Architecture Constraints — MUST Follow

1. **(CRITICAL) Import from `react-router`, NOT `react-router-dom`.** The project uses react-router v7 unified package. The existing `App.tsx` already imports from `react-router`. [Source: architecture.md, Story 4.2 learnings]

2. **(CRITICAL) No `enum` types.** Use union types only. [Source: architecture.md#Code Naming]

3. **(CRITICAL) Module manifest type is `ModuleManifest` from `@hexalith/shell-api`.** Already defined in `packages/shell-api/src/manifest/manifestTypes.ts`. Do NOT create new manifest types — use the existing one. [Source: packages/shell-api/src/manifest/manifestTypes.ts]

4. **(CRITICAL) Modules export `default` (root component), `manifest`, and `routes` from their barrel `src/index.ts`.** This pattern is established by the scaffold template. [Source: tools/create-hexalith-module/templates/module/src/index.ts]

5. **(CRITICAL) Shell uses `manifest.routes` for path registration — NOT the module's `routes` array.** The module exports both `manifest` (with route declarations) and `routes` (with React elements for dev-host internal routing). The shell must use `manifest.routes` to build its own route config and wrap the module's `default` component in `ModuleErrorBoundary` + `Suspense`. The module's `routes` array is for the dev-host only — the shell never imports or uses it. Reaching for the module's `routes` export instead of `manifest.routes` is a common mistake that breaks the architectural contract. [Source: architecture.md#Frontend Architecture, tools/create-hexalith-module/templates/module/src/routes.tsx]

6. **(CRITICAL) Module default export is the root page component.** It is NOT a router — each module exports a root component that renders its own internal routing. The shell wraps this in `ModuleErrorBoundary` + `Suspense`. [Source: tools/create-hexalith-module/templates/module/src/routes.tsx]

7. **Modules use `@hexalith/ui` `Skeleton` component for internal loading states.** The shell's `ModuleSkeleton` is specifically for the module-level Suspense boundary (while the module chunk loads), not for in-module data loading. [Source: ux-design-specification.md#Loading patterns]

8. **CSS Modules for component styles.** All shell layout components use `.module.css` files. Follow existing pattern from `Sidebar.module.css`, `ShellLayout.module.css`. [Source: architecture.md#Format Patterns]

9. **Provider nesting order is critical.** `ShellProviders.tsx` manages the nesting order. Module registry/routing sits outside providers (in `App.tsx`). Do not modify provider nesting. [Source: apps/shell/src/providers/ShellProviders.tsx]

10. **`basePath` derives from `manifest.name` (kebab-case).** Module routes are mounted at `/{manifest.name}/*`. A module named `"tenants"` gets routes at `/tenants/`, `/tenants/detail/:id`, etc. [Source: epics.md#Story 5.1, existing placeholderModules.tsx pattern]

11. **File naming: kebab-case for new `.ts` files, PascalCase for `.tsx` React components.** Follow existing shell file naming conventions. [Source: architecture.md#Naming Patterns]

12. **ModuleErrorBoundary must display `displayName`, not `name`.** Users see "Unable to load **Tenants**" — not "Unable to load **tenants**." The `name` prop passed to the error boundary must be the module's `manifest.displayName`. [Source: ux-design-specification.md#Error states]

13. **ModuleSkeleton should mirror `PageLayout` structure.** Since all modules use `PageLayout` from `@hexalith/ui`, the skeleton should approximate that structure (header area + content card area) so the transition from skeleton to content produces zero layout shift. [Source: ux-design-specification.md#Loading patterns]

### Existing Codebase Context — MUST Reference

**Files to REPLACE:**
- `apps/shell/src/modules/placeholderModules.tsx` — static module registry; fully replaced by new registry.ts + routeBuilder.ts + navigationBuilder.ts
- `apps/shell/src/pages/TenantsPlaceholderPage.tsx` — placeholder module page; replaced by real module loading

**Files to MODIFY:**
- `apps/shell/src/App.tsx` — change import from `placeholderModules` to new `modules` barrel; use `buildModuleRoutes(modules)` instead of `getModuleRoutes()`
- `apps/shell/src/layout/Sidebar.tsx` — change import from `placeholderModules` to new `modules` barrel; use `buildNavigationItems(modules)` instead of `getSidebarNavigationItems()`
- `apps/shell/vite.config.ts` — add `build.rollupOptions.output.manualChunks` for vendor splitting

**Files to CREATE:**
- `apps/shell/src/modules/registry.ts` — dynamic module registry
- `apps/shell/src/modules/routeBuilder.ts` — react-router route generation from manifests
- `apps/shell/src/modules/routeBuilder.test.ts` — route builder tests
- `apps/shell/src/modules/navigationBuilder.ts` — sidebar navigation generation from manifests
- `apps/shell/src/modules/navigationBuilder.test.ts` — navigation builder tests
- `apps/shell/src/modules/registry.test.ts` — registry tests
- `apps/shell/src/modules/index.ts` — barrel export
- `apps/shell/src/errors/ModuleErrorBoundary.tsx` — module error boundary component
- `apps/shell/src/errors/ModuleErrorBoundary.test.tsx` — error boundary tests
- `apps/shell/src/errors/ModuleSkeleton.tsx` — content-aware loading skeleton
- `apps/shell/src/errors/ModuleSkeleton.test.tsx` — skeleton tests

**Files that are source of truth (DO NOT modify):**
- `packages/shell-api/src/manifest/manifestTypes.ts` — `ModuleManifest`, `ModuleManifestV1`, `ModuleRoute`, `ModuleNavigation` types
- `packages/shell-api/src/manifest/validateManifest.ts` — `validateManifest()` function
- `tools/create-hexalith-module/templates/module/src/index.ts` — module barrel export pattern (default, manifest, routes)
- `tools/create-hexalith-module/templates/module/src/manifest.ts` — manifest declaration pattern
- `tools/create-hexalith-module/templates/module/src/routes.tsx` — module internal routing pattern

**Key existing code patterns to follow:**

The current `placeholderModules.tsx` establishes the mapping pattern:
```typescript
// Current pattern (to be replaced):
basePath: "tenants"  // from manifest.name
manifest: { ... }     // ModuleManifest
// Routes: /{basePath}{route.path} → /{basePath} for "/" routes
```

The current `App.tsx` router pattern:
```typescript
createBrowserRouter([{
  path: "/",
  element: <ShellLayout />,
  children: [
    { index: true, element: <WelcomePage /> },
    ...moduleRoutes,  // injected from registry
    { path: "*", element: <NotFoundPage /> },
  ],
}]);
```

The module template export pattern:
```typescript
// Each module in modules/ exports:
export { ExampleRootPage as default } from "./routes.js";
export { manifest } from "./manifest.js";
export { routes } from "./routes.js";
```

**Module directory status:**
- `modules/hexalith-demo-tasks/` — exists but empty (scaffolded module, may need initialization)
- `modules/hexalith-test-orders/` — exists but empty (scaffolded module, may need initialization)
- `Hexalith.Tenants` — git submodule at root level (NOT in `modules/`), contains .NET code (not a FrontShell module)

**Important:** If `modules/hexalith-demo-tasks/` and `modules/hexalith-test-orders/` are empty, the registry should gracefully handle having zero or few modules. The registry pattern must work with 0, 1, or N modules.

### Module Registration Approach — Two Options

**Option A: Static import list (recommended for MVP)**
The registry file explicitly lists each module import. Adding a module requires adding one import line to `registry.ts`. This is the simplest approach and matches the architecture spec's description: "Shell discovers and registers modules from their typed manifests at build time."

```typescript
// registry.ts — one line per module
import { manifest as demoTasksManifest } from "hexalith-demo-tasks";
const DemoTasksModule = lazy(() => import("hexalith-demo-tasks"));

export const modules: RegisteredModule[] = [
  { manifest: demoTasksManifest, component: DemoTasksModule, basePath: demoTasksManifest.name },
];
```

**Pros:** Simple, type-safe, build-time validated, no dynamic module scanning needed.
**Cons:** Requires one code change per module addition (one import line). But this is minimal — and provides compile-time safety.

**Option B: Vite glob imports (automatic discovery)**
Uses Vite's `import.meta.glob()` to discover all `modules/*/src/index.ts` files automatically. No code changes needed when adding modules.

```typescript
const moduleImports = import.meta.glob('/modules/*/src/index.ts');
```

**Pros:** Zero code changes when adding modules — truly automatic discovery.
**Cons:** Weaker type safety, more complex error handling, glob pattern must be carefully configured.

**Decision: Option A confirmed.** Explicit imports in `registry.ts`. One import line per module provides compile-time type safety and build-time manifest validation. The `registry.ts` file is the dedicated, single-line-per-module registration point. This is the pragmatic MVP choice — adding one import line is minimal ceremony for maximum safety. Option B (glob discovery) can be explored in a future story if the module count grows beyond where explicit imports feel manageable.

### Critical Anti-Patterns to Prevent

1. **Do NOT create a runtime module discovery system.** Module discovery happens at build time (import statements compiled by Vite). There is no runtime scanning of directories.
2. **Do NOT import from `react-router-dom`.** Use `react-router` v7 unified package.
3. **Do NOT create a new manifest type.** Use `ModuleManifest` from `@hexalith/shell-api`.
4. **Do NOT put ModuleErrorBoundary inside the module.** It wraps the module FROM the shell side. The module knows nothing about being wrapped.
5. **Do NOT use a spinner for ModuleSkeleton.** The UX spec requires content-aware skeletons that match page layout shape.
6. **Do NOT break the existing provider nesting order.** Routing sits inside `AuthGate` → `ShellProviders` in `App.tsx`. Module registration affects only the route config, not the provider stack.
7. **Do NOT reference Hexalith.Tenants (.NET submodule).** That is a backend submodule at the root, not a FrontShell module in `modules/`.
8. **Do NOT use `@radix-ui/*` components directly.** Use `@hexalith/ui` wrappers.
9. **Do NOT add unnecessary configuration or abstraction layers.** The registry is a simple array of module registrations. Keep it simple.
10. **Do NOT use `enum` types.** Use union types only.
11. **Do NOT add import lines in `registry.ts` for uninitialized modules.** Before adding a module import, verify the module directory has a `package.json` and `src/index.ts` with a manifest export. Empty module directories (no `package.json`) will crash the build if imported.

### Previous Story Intelligence (Stories 4.1-4.6)

**Story 4.1 (done):** CLI scaffold engine — `create-hexalith-module` generates standalone module repos with proper manifest, routes, index.ts exports.

**Story 4.2 (done):** Premium showcase scaffold — modules export three pages (list/detail/create), use Zod schemas, use `react-router` v7 (NOT `react-router-dom`). `SubmitCommandInput` uses `commandType`, `domain`, `payload`.

**Story 4.3 (done):** Dev-host — modules have standalone `dev-host/` with `MockShellProvider` + `CqrsProvider`. Modules are fully functional independently.

**Story 4.4 (done):** Test infrastructure — `renderWithProviders`, `MockCommandBus`/`MockQueryBus`, Vitest + Playwright CT patterns.

**Story 4.5 (done):** Typed manifest and module boundary — `ModuleManifest` type with `manifestVersion: 1`, `validateManifest()` function, kebab-case name validation, semver version validation, route-navigation alignment validation.

**Story 4.6 (in-progress):** Module developer documentation — 5 docs in `docs/` directory. Not relevant to this story's implementation but informs what modules look like.

### Git Intelligence — Recent Commits

```
99d51c1 feat: add manifest validation and tests, enhance module developer documentation
e28db39 chore: update subproject commit reference for Hexalith.Tenants
b652bd3 feat: update scaffolded tests and manifest validation, enhance loading state assertions
1e94579 feat: implement typed manifest and module boundary with runtime validation
8627b8d feat: add CSS token imports and dev-host setup
```

Epic 4 stories are committed. The manifest type system, validation, and scaffold templates are all stable and available.

### Project Structure Notes

**Files to create (in `apps/shell/src/`):**
```
apps/shell/src/
├── modules/
│   ├── index.ts              # Barrel export
│   ├── registry.ts           # Module registry (replaces placeholderModules.tsx)
│   ├── registry.test.ts
│   ├── routeBuilder.ts       # React-router route generation
│   ├── routeBuilder.test.ts
│   ├── navigationBuilder.ts  # Sidebar navigation generation
│   └── navigationBuilder.test.ts
├── errors/
│   ├── ModuleErrorBoundary.tsx
│   ├── ModuleErrorBoundary.test.tsx
│   ├── ModuleSkeleton.tsx
│   └── ModuleSkeleton.test.tsx
```

**Architecture directory structure alignment:**
The architecture spec defines exactly these files in `apps/shell/src/modules/` (`registry.ts`, `routeBuilder.ts`) and `apps/shell/src/errors/` (`ModuleErrorBoundary.tsx`, `ModuleSkeleton.tsx`). This story creates them.

### Commit Strategy

Recommended commit order:
1. Create `errors/` components (ModuleErrorBoundary, ModuleSkeleton) — standalone, no dependencies on registry
2. Create `modules/` registry, route builder, navigation builder — the core module system
3. Update App.tsx and Sidebar.tsx to use new module system
4. Delete placeholder files
5. Configure Vite manualChunks
6. Add tests

All can be committed together as one cohesive commit if preferred — they form one logical feature: "module registry and build-time discovery."

### References

- [Source: epics.md#Story 5.1] — Full acceptance criteria and BDD scenarios
- [Source: prd.md#FR18] — Shell discovers and registers modules from typed manifests at build time
- [Source: prd.md#FR29] — Shell team adds module by adding repository reference
- [Source: prd.md#Module Distribution Model] — Git submodules, build-time composition
- [Source: architecture.md#Frontend Architecture] — Module loading pattern with React.lazy(), Suspense, ModuleErrorBoundary
- [Source: architecture.md#Bundle Optimization] — Per-module code splitting, vendor chunk splitting, asset hashing
- [Source: architecture.md#Complete Project Directory Structure] — registry.ts, routeBuilder.ts, ModuleErrorBoundary.tsx, ModuleSkeleton.tsx file locations
- [Source: architecture.md#Shell Application Boundary] — Shell owns module registration, route generation, page chrome
- [Source: architecture.md#Key Structural Decisions] — All modules are standalone git repos, consumed as git submodules
- [Source: architecture.md#Architectural Boundaries] — Module ↔ shell package boundaries
- [Source: architecture.md#Turborepo Pipeline Groups] — Build order: packages → modules → apps
- [Source: ux-design-specification.md#Loading patterns] — Content-aware skeletons, zero-layout-shift guarantee
- [Source: ux-design-specification.md#Error boundaries] — Module failure contained, retry available
- [Source: apps/shell/src/modules/placeholderModules.tsx] — Current static registry (to be replaced)
- [Source: apps/shell/src/App.tsx] — Current router setup with `getModuleRoutes()`
- [Source: apps/shell/src/layout/Sidebar.tsx] — Current sidebar with `getSidebarNavigationItems()`
- [Source: apps/shell/vite.config.ts] — Current Vite config (to add manualChunks)
- [Source: packages/shell-api/src/manifest/manifestTypes.ts] — ModuleManifest type definition
- [Source: tools/create-hexalith-module/templates/module/src/index.ts] — Module barrel export pattern

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
