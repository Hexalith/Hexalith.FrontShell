# Story 4.5: Typed Manifest & Module Boundary

Status: done

## Story

As a module developer,
I want to define my module's routes and navigation through a typed manifest, and use any React library within my boundary,
So that the shell discovers my module automatically and I have full flexibility within my module code.

## Acceptance Criteria

1. **AC1 — Typed ModuleManifest with all required fields.** Given the scaffold generates `src/manifest.ts`, when a developer inspects the manifest, then it exports a typed `ModuleManifest` object with: `name`, `displayName`, `version`, `manifestVersion`, `routes` (path + component mapping), `navigation` (label, icon, category), and optional `category` for sidebar grouping. TypeScript enforces the manifest type — missing or incorrectly typed fields produce compile errors.

2. **AC2 — Route URL pattern convention.** Given the manifest declares routes, when the shell processes the manifest, then routes follow the URL pattern `/{module}/{entity}/{id}` (e.g., `/orders/detail/4521`). Each route maps to a lazy-loaded component.

3. **AC3 — Navigation sidebar integration.** Given the manifest declares navigation items, when the shell renders the sidebar, then the module appears in the sidebar with the declared label, icon, and category group.

4. **AC4 — ESLint module boundary enforcement.** Given a module developer wants to use a third-party React library (e.g., a charting library), when the library is installed in the module's `package.json`, then the module compiles and runs without restriction. The module's ESLint config only blocks: `@radix-ui/*` direct imports, CSS-in-JS libraries, and `oidc-client-ts`. All other React libraries and patterns are permitted within the module boundary.

5. **AC5 — Domain types within module boundary.** Given the module defines its own domain types, when inspecting the module code, then command shapes, projection view models, and Zod schemas are defined within the module's `src/` directory. No types are imported from other modules — all shared types come from `@hexalith/*` packages only.

FRs covered: FR4, FR5

## Tasks / Subtasks

- [x] Task 1: Create `validateManifest` runtime validation function (AC: #1)
  - [x] 1.1: Create `packages/shell-api/src/manifest/validateManifest.ts` — **use plain TypeScript type guards, no Zod:**

    ```typescript
    export interface ManifestValidationError {
      field: string;
      message: string;
    }

    export interface ManifestValidationResult {
      valid: boolean;
      errors: ManifestValidationError[];
      warnings: ManifestValidationError[];
    }

    export function validateManifest(
      manifest: unknown,
    ): ManifestValidationResult;
    ```

    - **Structure as a switch on `manifestVersion`** (even though only `1` exists today). This makes adding `ModuleManifestV2` validation a single new case block:

      ```typescript
      // Guard: manifest is an object
      if (manifest == null || typeof manifest !== "object") {
        return {
          valid: false,
          errors: [
            {
              field: "manifest",
              message: "Manifest must be a non-null object",
            },
          ],
          warnings: [],
        };
      }
      const m = manifest as Record<string, unknown>;
      switch (m.manifestVersion) {
        case 1:
          return validateV1(m);
        default:
          return {
            valid: false,
            errors: [
              {
                field: "manifestVersion",
                message: `Unknown manifestVersion: ${String(m.manifestVersion)}`,
              },
            ],
            warnings: [],
          };
      }
      ```

    - `validateV1` checks:
      - `name` is non-empty, lowercase kebab-case (`/^[a-z][a-z0-9-]*$/`)
      - `displayName` is non-empty string
      - `version` is semver format (`/^\d+\.\d+\.\d+/`)
      - `routes` is non-empty array, each with a `path` starting with `/`
      - `navigation` is non-empty array, each with `label` and `path` both non-empty, `path` starts with `/`
      - Navigation `path` values should match a declared route `path` — this is a **warning**, not an error (modules may have valid reasons for partial coverage). Use exact-match semantics, not prefix-match.
    - **Do NOT use Zod.** Shell-api should have a minimal dependency surface. Plain TypeScript validation is architecturally cleaner for a contract package.

  - [x] 1.2: Export `validateManifest`, `ManifestValidationResult`, and `ManifestValidationError` from `packages/shell-api/src/index.ts`:

    ```typescript
    export { validateManifest } from "./manifest/validateManifest";
    export type {
      ManifestValidationResult,
      ManifestValidationError,
    } from "./manifest/validateManifest";
    ```

- [x] Task 2: Create `validateManifest` tests (AC: #1)
  - [x] 2.1: Create `packages/shell-api/src/manifest/validateManifest.test.ts`:
    - Import `describe`, `it`, `expect` from `vitest`
    - Import `validateManifest` from `./validateManifest`
    - Import `ModuleManifest` type from `./manifestTypes`
    - **Test: validates a correct manifest** — pass a valid manifest, expect `valid: true`, `errors: []`
    - **Test: rejects manifest with empty name** — expect error on `name` field
    - **Test: rejects manifest with uppercase name** — `"MyModule"` should fail kebab-case check
    - **Test: rejects manifest with invalid manifestVersion** — version `2` should fail
    - **Test: rejects manifest with empty routes** — `routes: []` should fail
    - **Test: rejects manifest with route missing leading slash** — `{ path: "foo" }` should fail
    - **Test: rejects manifest with empty navigation** — `navigation: []` should fail
    - **Test: rejects manifest with empty displayName** — should fail
    - **Test: rejects manifest with invalid semver** — `"abc"` should fail
    - **Test: warns when navigation path doesn't match a route** — navigation `path: "/admin"` when no route has `path: "/admin"`. Result should have `valid: true` but include a `warnings` array with the mismatch. Validation distinguishes errors (structural) from warnings (semantic). Add a `warnings: ManifestValidationError[]` field to `ManifestValidationResult`.
    - **Test: accepts manifest with optional icon and category in navigation**
    - **Test: actual scaffold manifest passes validation** — construct a manifest matching the post-scaffold output (e.g., `{ manifestVersion: 1, name: "test-module", displayName: "Test Module", version: "0.1.0", routes: [{ path: "/" }, { path: "/:id" }, { path: "/create" }], navigation: [{ label: "Test Module", path: "/", icon: "box", category: "Modules" }] }`), pass to `validateManifest()`, expect `valid: true`, `errors: []`, `warnings: []`
    - **Test: rejects null and undefined input** — pass `null` and `undefined` to `validateManifest()`, expect `valid: false` with error: "Manifest must be a non-null object"
  - [x] 2.2: Update `packages/shell-api/src/manifest/manifestTypes.test.ts` — add compile-time type enforcement tests (AC: #1):
    - **Test: manifest supports discriminated union via manifestVersion** — verify `ModuleManifest` is a union type (currently only `ModuleManifestV1`, but the architecture requires `manifestVersion` as a discriminated union field for future schema evolution)
    - **Test: rejects manifest with missing version field** — `@ts-expect-error` test
    - **Test: rejects manifest with missing displayName** — `@ts-expect-error` test
    - **Test: rejects manifest with missing routes** — `@ts-expect-error` test
    - **Test: rejects manifest with missing navigation** — `@ts-expect-error` test
    - **Test: ModuleRoute only requires path** — verify no additional required fields
    - These are compile-time checks via `@ts-expect-error` patterns — they verify TypeScript enforcement, not runtime validation

- [x] Task 3: Enhance scaffold manifest template with icon and category (AC: #1, #3)
  - [x] 3.1: Update `tools/create-hexalith-module/templates/module/src/manifest.ts` — add `icon` and `category` to the navigation item:

    ```typescript
    navigation: [
      {
        label: "__MODULE_DISPLAY_NAME__",
        path: "/",
        /** Replace with a domain-specific icon for your module (e.g., "shopping-cart", "users", "settings"). */
        icon: "box",
        category: "Modules",
      },
    ],
    ```

    - `icon: "box"` is a sensible default with a JSDoc hint to replace it. The actual icon system will be defined in Epic 5, but the manifest should demonstrate the field.
    - `category: "Modules"` groups this module in a sidebar category. Default modules land in "Modules" group.
    - This change is cosmetic — the scaffold already type-checks against `ModuleManifest` which allows these optional fields. This just demonstrates best practice.

- [x] **DEFINITION OF DONE GATE — All previous tasks (1-3) must pass these verification checks before the story is complete. Do NOT mark the story as done until every check below passes.**

- [x] Task 4: Verification (AC: #1-#5)
  - [x] 4.1: Run `pnpm exec tsc -p packages/shell-api/tsconfig.json --noEmit` — verify shell-api compiles with new `validateManifest.ts`
  - [x] 4.2: Run `pnpm -F @hexalith/shell-api test` — verify all manifest type tests and validation tests pass
  - [x] 4.3: Run `pnpm exec tsc -p tools/create-hexalith-module/tsconfig.templates.json --noEmit` — verify template files still compile after manifest changes
  - [x] 4.4: Run `pnpm -F create-hexalith-module test` — verify integration test passes (scaffold output includes updated manifest, type-checks correctly)
  - [x] 4.5: **(AC2)** Verify route URL pattern convention — routes in `templates/module/src/routes.tsx` are `/`, `/detail/:id`, `/create` (module-relative). The shell mounts these under `/{module-name}/`, producing effective URLs like `/{module}/detail/{id}` (for example `/orders/detail/4521`). Verify all three routes use `React.lazy()` + `Suspense` + `Skeleton` fallback.
  - [x] 4.6: **(AC4)** Verify ESLint module boundary enforcement — `packages/eslint-config/module-boundaries.js` blocks: `@radix-ui/*`, `@hexalith/*/src/**`, `@emotion/*`, `oidc-client-ts`, `ky`, `@tanstack/react-query`, `@tanstack/react-table`, `styled-components`, `@emotion/styled`, `@emotion/css`, `@stitches/react`. All other libraries are permitted. `templates/module/eslint.config.js` composes `base + react + boundaries`. **No code changes needed — already satisfied.**
  - [x] 4.7: **(AC5)** Verify domain types are self-contained — `templates/module/src/schemas/exampleSchemas.ts` imports only `z` from `zod` (no cross-module type imports). `templates/module/src/index.ts` re-exports domain types. **No code changes needed — already satisfied.**
  - [x] 4.8: Verify no `@radix-ui/*`, no `oidc-client-ts`, no `ky`, no `@tanstack/*` direct imports in template files
  - [x] 4.9: Grep scaffold template for any cross-module imports (imports from other modules like `@hexalith/tenants`) — should find none
  - [x] 4.10: Verify the scaffold manifest template has no unreplaced placeholder tokens after scaffold runs (covered by integration test assertion in `integration.test.ts`)

## Dev Notes

### Scope Boundaries — What This Story IS and IS NOT

**This story adds runtime manifest validation to `@hexalith/shell-api`, enhances the scaffold manifest template, and verifies the module boundary enforcement already in place.**

**This story IS:**

- Creating `validateManifest.ts` with runtime validation logic in `packages/shell-api/src/manifest/`
- Creating comprehensive tests for manifest validation
- Enhancing the scaffold manifest template to demonstrate `icon` and `category` fields
- Enhancing manifest type tests for comprehensive AC coverage
- Verifying route URL pattern convention, ESLint boundary enforcement, and domain type isolation

**This story is NOT:**

- Shell sidebar rendering from manifests (Story 5.2)
- Module registry and build-time discovery (Story 5.1)
- Module error isolation and recovery (Story 5.3)
- Build-time manifest validation in CI pipeline (Story 5.5)
- Documentation (Story 4.6)

**Key insight: ~80% of this story is verification, ~20% is new code.** Most acceptance criteria are ALREADY satisfied by work done in Stories 4.1 (CLI scaffold with manifest.ts), 4.2 (example code with routes, schemas, domain types), and earlier platform work (shell-api manifest types, ESLint module-boundaries config). The primary NEW deliverable is `validateManifest.ts` (~60 lines) + its tests (~80 lines) + minor scaffold manifest enhancement. The verification tasks confirm existing work meets the ACs.

**`validateManifest` has no callers in this story — by design.** It is a foundation function for Story 5.1 (Module Registry, which imports manifests) and Story 5.5 (Build-Time Manifest Validation in CI). Creating it here completes the manifest contract defined by FR4, even though the consumer stories are in Epic 5.

**Route-to-manifest sync validation is deferred to Story 5.5.** The manifest declares routes as `{ path }` declarations. The runtime `routes.tsx` has `{ path, element }` objects. These two sources can drift. Automated drift detection belongs in Story 5.5's build-time validation pipeline, not here.

**AC4 note:** The epic text says the module's ESLint config "only blocks: `@radix-ui/*` direct imports, CSS-in-JS libraries, and `oidc-client-ts`." The actual implementation in `module-boundaries.js` also blocks `ky`, `@tanstack/react-query`, `@tanstack/react-table`, and deep `@hexalith/*/src/**` imports. These additional blocks are architecturally necessary (they enforce the facade pattern through `@hexalith/*` packages). The AC text is a simplification — the implementation is correct.

### Architecture Constraints — MUST Follow

1. **(CRITICAL) `@hexalith/shell-api` MUST NOT depend on Zod or `@hexalith/cqrs-client`.** Use plain TypeScript for validation — no Zod, no external validation libraries. Shell-api is a contract package with minimal dependency surface. [Source: architecture.md#Package Dependency Rules]

2. **(CRITICAL) Manifest routes are declarations, NOT runtime route objects.** `ModuleRoute` has only `{ path: string }` — it declares the URL path pattern. The runtime route objects in `routes.tsx` are `{ path, element }` with React components. These are different shapes by design. The manifest declares _what paths exist_; Story 5.1 bridges manifest declarations to runtime `react-router` route objects by mapping `manifest.routes[].path` to lazy-loaded components. Do NOT add `element` or `component` to `ModuleRoute` — that coupling would make manifests non-serializable.

3. **(CRITICAL) Manifest types use discriminated union pattern.** `ModuleManifest = ModuleManifestV1` currently, but the type MUST support future versions via `manifestVersion` field. When adding `ModuleManifestV2` in Phase 2, it will be: `type ModuleManifest = ModuleManifestV1 | ModuleManifestV2`. This is an additive change, not a breaking one. [Source: architecture.md#Manifest schema versioning]

4. **(CRITICAL) Module name must be lowercase kebab-case.** Validation must enforce `name` matches `/^[a-z][a-z0-9-]*$/`. This is the same validation the CLI scaffold already applies. [Source: scaffold.ts + architecture.md]

5. **(CRITICAL) Validation distinguishes errors from warnings.** Structural issues (missing fields, invalid types, bad format) are **errors** — they make the manifest invalid (`valid: false`). Semantic issues (navigation path not matching a declared route) are **warnings** — the manifest is still valid (`valid: true`) but the developer should be alerted. Use exact-match for path comparison, not prefix-match.

6. **(CRITICAL) ESLint boundaries block specific imports, not arbitrary ones.** The module boundary is permissive by design — block only architectural violations (`@radix-ui/*`, CSS-in-JS, `oidc-client-ts`, `ky`, `@tanstack/*` direct, deep `@hexalith/*` imports). Everything else is allowed within the module. [Source: packages/eslint-config/module-boundaries.js]

7. **No barrel exports in sub-folders.** The `manifest/` directory in shell-api does NOT have an `index.ts`. Exports go through `packages/shell-api/src/index.ts` (the package-level barrel). [Source: architecture.md#Barrel Export Clarification]

8. **No `enum` types.** Use union types. [Source: architecture.md#Code Naming]

9. **Types-only files use camelCase.** `validateManifest.ts`, `manifestTypes.ts` — not PascalCase. [Source: architecture.md#File Naming]

10. **Test files co-located with source.** `validateManifest.test.ts` lives next to `validateManifest.ts` in the `manifest/` directory. [Source: architecture.md#Test Location]

### Existing Codebase Context — MUST Reference

**ModuleManifest types (from `packages/shell-api/src/manifest/manifestTypes.ts`):**

```typescript
export interface ModuleRoute {
  path: string;
}

export interface ModuleNavigation {
  label: string;
  path: string;
  icon?: string;
  category?: string;
}

export interface ModuleManifestV1 {
  manifestVersion: 1;
  name: string;
  displayName: string;
  version: string;
  routes: ModuleRoute[];
  navigation: ModuleNavigation[];
}

export type ModuleManifest = ModuleManifestV1;
```

**Shell-api public exports (from `packages/shell-api/src/index.ts`):**

Already exports: `ModuleManifest`, `ModuleManifestV1`, `ModuleRoute`, `ModuleNavigation`. New exports to add: `validateManifest`, `ManifestValidationResult`, `ManifestValidationError`. `ManifestValidationResult` includes both `errors` (structural — invalid manifest) and `warnings` (semantic — e.g., navigation path doesn't match a declared route).

**Current scaffold manifest template (from `tools/create-hexalith-module/templates/module/src/manifest.ts`):**

```typescript
import type { ModuleManifest } from "@hexalith/shell-api";

export const manifest: ModuleManifest = {
  manifestVersion: 1,
  name: "__MODULE_NAME__",
  displayName: "__MODULE_DISPLAY_NAME__",
  version: "0.1.0",
  routes: [{ path: "/" }, { path: "/:id" }, { path: "/create" }],
  navigation: [{ label: "__MODULE_DISPLAY_NAME__", path: "/" }],
};
```

After this story, the navigation item should include `icon` and `category` fields.

**Scaffold string replacement (from `tools/create-hexalith-module/src/scaffold.ts`):**

- `__MODULE_NAME__` → kebab-case name (e.g., `my-orders`)
- `__MODULE_DISPLAY_NAME__` → display name (e.g., `My Orders`)
- `__MODULE_PACKAGE_NAME__` → `@hexalith/{name}`
- `Example(?=[A-Z])` → PascalCase (e.g., `MyOrders`)

**ESLint module-boundaries (from `packages/eslint-config/module-boundaries.js`):**

Blocks: `@radix-ui/*`, `@hexalith/*/src/**`, `@emotion/*`, `oidc-client-ts`, `ky`, `@tanstack/react-query`, `@tanstack/react-table`, `styled-components`, `@emotion/styled`, `@emotion/css`, `@stitches/react`. Everything else is permitted.

**Route structure (from `tools/create-hexalith-module/templates/module/src/routes.tsx`):**

Three routes: `/` (list), `/:id` (detail), `/create` (form). All lazy-loaded via `React.lazy()` with `Suspense` + `Skeleton` fallback. Module-relative — the shell (Story 5.1) will mount these under `/{module-name}/`.

**Existing manifest type tests (from `packages/shell-api/src/manifest/manifestTypes.test.ts`):**

Currently tests: valid manifest compiles, missing `name` is rejected, unknown `manifestVersion` is rejected, `ModuleRoute` requires `path`, `ModuleNavigation` requires `label` and `path`, optional `icon` and `category` work. Enhance with additional `@ts-expect-error` tests for missing `version`, `displayName`, `routes`, and `navigation`.

**Integration test (from `tools/create-hexalith-module/src/integration.test.ts`):**

Dynamically compares ALL template files to scaffold output. Verifies: file presence (with renaming), `package.json` dependencies, `tsconfig.json` extends base, module name substitution in manifest/routes/index, ESLint config present, no unreplaced placeholders, and full TypeScript type-check of scaffolded output.

### Critical Anti-Patterns to Prevent

1. **Do NOT add Zod as a dependency to `@hexalith/shell-api`.** Use plain TypeScript for validation. Shell-api has a minimal dependency surface — plain TS is architecturally cleaner for a contract package.
2. **Do NOT duplicate the TypeScript type definitions in validation logic.** The TypeScript interfaces in `manifestTypes.ts` are the source of truth for manifest shape (compile-time). The `validateManifest` function validates values at runtime — it should reference the same field names and constraints, but not re-declare the types.
3. **Do NOT change the `ModuleManifest` TypeScript interface** unless adding a new field that the AC requires and is currently missing. The existing types already cover all AC1 fields.
4. **Do NOT modify `packages/eslint-config/module-boundaries.js`** — it already correctly implements AC4. Changing it could break boundary enforcement across the monorepo.
5. **Do NOT import from `react-router-dom`.** This project uses `react-router` v7 (unified package). [Source: Story 4.2 learnings]
6. **Do NOT use `enum`.** Use union types. [Source: architecture.md]
7. **Do NOT create barrel exports in sub-folders.** No `index.ts` in `packages/shell-api/src/manifest/`.
8. **Do NOT use a different name validation regex than the CLI scaffold.** The canonical regex for module names is `/^[a-z][a-z0-9-]*$/` (from `tools/create-hexalith-module/` CLI prompts). `validateManifest` MUST use the same regex to ensure parity. If the regexes diverge, a module name accepted by the CLI could be rejected by validation (or vice versa).

### Previous Story Intelligence (Stories 4.1-4.4)

**Story 4.1 (done) established:**

- CLI scaffold engine with `__PLACEHOLDER__` token replacement and `Example→PascalCase` regex
- Template files in `tools/create-hexalith-module/templates/module/`
- `tsconfig.templates.json` for template type-checking
- Integration test verifying scaffold output compiles via `tsc --noEmit`

**Story 4.2 (done) established:**

- Zod schemas, domain types, page components, routes, manifest.ts within template
- `react-router` v7 (import from `"react-router"`, NOT `"react-router-dom"`)
- `SubmitCommandInput` uses `commandType`, `domain`, `payload` (NOT `commandName`, `aggregateName`, `body`)

**Story 4.3 (done) established:**

- CqrsProvider accepts optional `queryBus` and `commandBus` props
- Dev-host wraps module with MockShellProvider + CqrsProvider + mock buses

**Story 4.4 (in-progress) established:**

- Test infrastructure: test-setup.ts, renderWithProviders, Vitest + Playwright CT tests
- tsconfig.templates.json extended with test dependency paths

### Git Intelligence — Recent Commits

```text
8627b8d feat: add CSS token imports and dev-host setup
8558a02 feat: add example module with CRUD functionality
4bd8683 feat: add scaffolding functionality for hexalith modules
```

Stories 4.1-4.3 are committed. Story 4.4 is in-progress (local changes visible in git status).

### Project Structure Notes

**Files to create:**

- `packages/shell-api/src/manifest/validateManifest.ts` — runtime validation function
- `packages/shell-api/src/manifest/validateManifest.test.ts` — validation tests

**Files to modify:**

- `packages/shell-api/src/index.ts` — add `validateManifest` export
- `packages/shell-api/src/manifest/manifestTypes.test.ts` — add comprehensive AC coverage tests
- `tools/create-hexalith-module/templates/module/src/manifest.ts` — add `icon` and `category` to navigation

**Files that are ALREADY CORRECT and should NOT be modified:**

- `packages/shell-api/src/manifest/manifestTypes.ts` — types are complete
- `packages/eslint-config/module-boundaries.js` — boundary rules are correct
- `tools/create-hexalith-module/templates/module/eslint.config.js` — ESLint config is correct
- `tools/create-hexalith-module/templates/module/src/routes.tsx` — routes are correct
- `tools/create-hexalith-module/templates/module/src/index.ts` — entry point is correct
- `tools/create-hexalith-module/templates/module/src/schemas/exampleSchemas.ts` — domain types are correct
- `tools/create-hexalith-module/src/scaffold.ts` — scaffold engine is correct

### Commit Strategy

This story touches two packages: `packages/shell-api/` (new validation function + tests) and `tools/create-hexalith-module/templates/module/` (manifest template enhancement). A single commit is appropriate since the changes are cohesive and small.

### References

- [Source: epics.md#Story 4.5] — Full acceptance criteria
- [Source: architecture.md#Manifest schema versioning] — Discriminated union pattern with `manifestVersion` field
- [Source: architecture.md#Package Dependency Rules] — shell-api must not depend on cqrs-client
- [Source: architecture.md#Barrel Export Clarification] — No barrel exports in sub-folders
- [Source: architecture.md#Module Internal Organization] — manifest.ts location and role
- [Source: packages/shell-api/src/manifest/manifestTypes.ts] — Existing manifest types
- [Source: packages/shell-api/src/index.ts] — Current public API exports
- [Source: packages/eslint-config/module-boundaries.js] — ESLint boundary enforcement rules
- [Source: tools/create-hexalith-module/templates/module/src/manifest.ts] — Current scaffold manifest template
- [Source: tools/create-hexalith-module/templates/module/src/routes.tsx] — Route structure with lazy loading
- [Source: tools/create-hexalith-module/templates/module/src/index.ts] — Module entry point with manifest export
- [Source: tools/create-hexalith-module/src/scaffold.ts] — Scaffold engine string replacement
- [Source: tools/create-hexalith-module/src/integration.test.ts] — Integration test covering scaffold verification
- [Source: Story 4.1 — 4-1-create-hexalith-module-cli.md] — CLI scaffold engine
- [Source: Story 4.2 — 4-2-scaffold-example-code-premium-showcase.md] — Example code, routes, schemas
- [Source: Story 4.3 — 4-3-dev-host-for-independent-module-development.md] — Dev-host and CqrsProvider
- [Source: Story 4.4 — 4-4-scaffolded-tests-and-test-fixtures.md] — Test infrastructure

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed pre-existing `@ts-expect-error` placement in `manifestTypes.test.ts` line 38 — the directive was on the assignment line but the TS error was on the property line inside the object literal. Moved the comment inside the object literal directly above `manifestVersion: 2`.

### Completion Notes List

- **Task 1**: Created `validateManifest.ts` (~120 lines) with `ManifestValidationError`, `ManifestValidationResult` types and `validateManifest` function. Uses switch on `manifestVersion` for future extensibility. `validateV1` checks: name (kebab-case), displayName, version (semver), routes (non-empty, leading `/`), navigation (non-empty, label+path required, path starts with `/`). Navigation path vs route path mismatch is a warning, not an error. No Zod dependency — plain TypeScript type guards only.
- **Task 1.2**: Exported `validateManifest`, `ManifestValidationResult`, `ManifestValidationError` from `packages/shell-api/src/index.ts`.
- **Task 2.1**: Created `validateManifest.test.ts` with 14 tests covering: valid manifest, empty name, uppercase name, invalid manifestVersion, empty routes, route missing `/`, empty navigation, empty displayName, invalid semver, navigation path mismatch warning, optional icon/category, scaffold manifest passes, null input, undefined input.
- **Task 2.2**: Enhanced `manifestTypes.test.ts` with 6 additional compile-time tests: discriminated union via manifestVersion, missing version, missing displayName, missing routes, missing navigation, ModuleRoute only requires path. Fixed pre-existing `@ts-expect-error` placement bug.
- **Task 3.1**: Added `icon: "box"` and `category: "Modules"` to scaffold manifest template navigation item with JSDoc hint for customization.
- **Task 4**: All verification checks passed — shell-api compiles cleanly, focused manifest/sidebar tests pass, templates compile, route patterns verified, ESLint boundaries verified, domain types self-contained, no forbidden imports, no cross-module imports, no unreplaced placeholders. Shell sidebar now consumes manifest-driven placeholder navigation with label, icon, and category grouping.

### Senior Developer Review (AI)

- 2026-03-21: Fixed review findings from code review.
  - Updated scaffold route declarations from `/:id` to `/detail/:id` so the generated module URL shape aligns with the documented deep-link pattern.
  - Refactored shell placeholder navigation to consume manifest-driven navigation metadata (label, icon, category) instead of a hardcoded two-item list.
  - Fixed pre-existing type assertions in `packages/shell-api/src/testing/createMockContexts.test.ts` so the story's claimed `tsc` verification now passes truthfully.
  - Re-verified focused tests and TypeScript checks after the fixes.

### Change Log

- 2026-03-21: Story 4.5 implementation complete — added `validateManifest` runtime validation, comprehensive tests, scaffold manifest enhancement, route-pattern alignment, manifest-driven placeholder sidebar integration, and shell-api compile verification fix.

### File List

- `packages/shell-api/src/manifest/validateManifest.ts` (NEW) — runtime manifest validation function
- `packages/shell-api/src/manifest/validateManifest.test.ts` (NEW) — 14 validation tests
- `packages/shell-api/src/index.ts` (MODIFIED) — added validateManifest exports
- `packages/shell-api/src/manifest/manifestTypes.test.ts` (MODIFIED) — added 6 compile-time type tests, fixed @ts-expect-error placement
- `packages/shell-api/src/testing/createMockContexts.test.ts` (MODIFIED) — fixed mock callback typing assertions so package type-check passes
- `tools/create-hexalith-module/templates/module/src/manifest.ts` (MODIFIED) — added icon and category to navigation item
- `tools/create-hexalith-module/templates/module/src/routes.tsx` (MODIFIED) — aligned detail route to `/detail/:id`
- `apps/shell/src/modules/placeholderModules.tsx` (NEW) — placeholder module registry with manifest-driven navigation metadata
- `apps/shell/src/App.tsx` (MODIFIED) — generates placeholder module routes from manifest-backed registry
- `apps/shell/src/layout/Sidebar.tsx` (MODIFIED) — renders grouped manifest-driven navigation with icon labels
- `apps/shell/src/layout/Sidebar.module.css` (MODIFIED) — styles grouped sidebar sections and icon labels
- `apps/shell/src/layout/Sidebar.test.tsx` (MODIFIED) — verifies manifest-driven category/icon rendering
