# Story 3.1: UI Package Setup & Structural Layout Components

Status: done

## Story

As a module developer,
I want layout primitives that use the design token system and enforce the CSS layer cascade,
So that I can compose page layouts with consistent spacing that cannot be overridden by module styles.

## Acceptance Criteria

1. **Package Configuration:** `@hexalith/ui` package in `packages/ui/` has tsup configured to produce ESM output with `.d.ts` declarations, `@hexalith/shell-api` as a peer dependency (for `useLocale`), test libraries (`@testing-library/react`, `@testing-library/jest-dom`, `jsdom`) as devDependencies, Vitest configured to handle CSS Module imports, and ESLint `no-restricted-imports` blocking direct Radix imports from outside the package. Note: Radix packages are added as direct dependencies in Story 3.2 when first consumed — not in this story.

2. **CSS Layer Cascade:** Layers are declared in order: `reset, tokens, primitives, components, density, module`. Component styles live in the `components` layer. Module styles live in the `module` layer which cannot override `components` layer token references.

3. **PageLayout Component:** Renders a CSS Grid layout with designated areas for page header and page content. All spacing uses design tokens via `gap` property (zero hardcoded values). Zero external margin. Classified as complex (≤ 20 props).

4. **Stack Component:** Arranges children vertically with `gap` from spacing tokens. Zero external margin. Classified as simple (≤ 12 props).

5. **Inline Component:** Arranges children horizontally with `gap` and `align` options. Zero external margin. Classified as simple (≤ 12 props).

6. **Divider Component:** Renders a horizontal rule using `--color-border-default`. Zero external margin. Classified as simple (≤ 12 props).

7. **API Quality:** Each component has ≤ 12 props (simple) or ≤ 20 props (complex: PageLayout only). All prop names are expressed in domain terms, not primitive terms. Co-located Vitest tests pass for each component.

## Tasks / Subtasks

- [x] Task 0: Pre-implementation verification (AC: #1, #2)
  - [x] Token inventory check: verify all referenced tokens exist in token CSS files — `--spacing-0` through `--spacing-8`, `--spacing-section`, `--color-border-default`, `--color-text-primary`, `--font-size-lg`, `--font-weight-semibold`, `--line-height-tight`
  - [x] **SPIKE:** Verify `@layer components { }` inside CSS Modules survives the Vite build pipeline — create a minimal test CSS Module with `@layer components { .test { color: red; } }`, build with tsup/Vite, inspect output to confirm layer declaration is preserved. **Fallback if @layer is stripped:** declare `@layer` order in a global CSS file imported by the shell app (already in `layers.css`), and have CSS Modules contain only component-scoped rules *without* an `@layer` wrapper. The cascade still works because the layer order declaration in `layers.css` establishes priority; component styles will fall into the default (unlayered) scope which has *higher* priority than layered rules — so the fallback actually requires moving component rules INTO the `components` layer via the global import chain. Document whichever approach works. Verified in-repo via `packages/ui/src/utils/CssLayerSmoke.test.ts` (smoke test asserts built `packages/ui/dist/index.css` contains `@layer components`).
  - [x] Verify or create `src/tokens/reset.css` with minimal CSS reset in `@layer reset { }` (box-sizing: border-box, margin: 0 on all elements, border: 0 on hr). The `reset` layer is declared in `layers.css` but currently empty.
- [x] Task 1: Package configuration updates (AC: #1)
  - [x] Add test devDependencies to `packages/ui/package.json`: `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - [x] Add `clsx` (~2KB) as a direct dependency — used for className merging in all components. Pattern: `className={clsx(styles.root, className)}`
  - [x] Verify tsup is configured for ESM output with `.d.ts` — already done, confirm
  - [x] Add or verify ESLint `no-restricted-imports` rule blocking direct `@radix-ui/*` imports (Radix is encapsulated; `@hexalith/ui` layout primitives must not import Radix directly)
  - [x] Add CSS-in-JS library blocks to ESLint: `styled-components`, `@emotion/styled`, `@emotion/css`, `@stitches/react`
  - [x] Configure `vitest.config.ts` with `css: { modules: true }` to enable CSS Module class name resolution. Guard: if `styles.xxx` resolves to `undefined` in test output, CSS Module handling is broken — do not proceed.
  - [x] Note: Radix packages, `@tanstack/react-table`, and `react-hook-form` are NOT added in this story — add them when their consuming stories arrive (3.2+). This is a deliberate deviation from the literal AC text in epics.md, which bundles Radix deps with package configuration. Since no layout component imports Radix, deferring avoids unused dependencies.
- [x] Task 2: Verify CSS @layer cascade (AC: #2)
  - [x] Confirm `packages/ui/src/tokens/layers.css` declares `@layer reset, tokens, primitives, components, density, module;` — already exists
  - [x] Ensure all new component CSS Modules use `@layer components { }` wrapper
- [x] Task 3: Implement `<PageLayout>` component (AC: #3)
  - [x] Create `packages/ui/src/components/layout/PageLayout.tsx`
  - [x] Create `packages/ui/src/components/layout/PageLayout.module.css` using CSS Grid with `@layer components`
  - [x] Create `packages/ui/src/components/layout/PageLayout.test.tsx` (Vitest)
  - [x] Export from `packages/ui/src/index.ts`
- [x] Task 4: Implement `<Stack>` component (AC: #4)
  - [x] Create `packages/ui/src/components/layout/Stack.tsx`
  - [x] Create `packages/ui/src/components/layout/Stack.module.css` with `@layer components`
  - [x] Create `packages/ui/src/components/layout/Stack.test.tsx` (Vitest)
  - [x] Export from `packages/ui/src/index.ts`
- [x] Task 5: Implement `<Inline>` component (AC: #5)
  - [x] Create `packages/ui/src/components/layout/Inline.tsx`
  - [x] Create `packages/ui/src/components/layout/Inline.module.css` with `@layer components`
  - [x] Create `packages/ui/src/components/layout/Inline.test.tsx` (Vitest)
  - [x] Export from `packages/ui/src/index.ts`
- [x] Task 6: Implement `<Divider>` component (AC: #6)
  - [x] **Prerequisite:** `src/tokens/reset.css` MUST exist before implementing Divider — `<hr>` has browser default margins/borders that the reset layer must neutralize. Do not proceed without reset.css.
  - [x] Create `packages/ui/src/components/layout/Divider.tsx` — horizontal-only for MVP (renders `<hr>` with token styling). Vertical orientation deferred — no concrete use case in MVP; adding it later is a non-breaking minor version bump.
  - [x] Create `packages/ui/src/components/layout/Divider.module.css` with `@layer components`
  - [x] Create `packages/ui/src/components/layout/Divider.test.tsx` (Vitest)
  - [x] Export from `packages/ui/src/index.ts`
- [x] Task 7: Update barrel export and verify build (AC: #7)
  - [x] Update `packages/ui/src/index.ts` with organized category comments
  - [x] Run `pnpm build` — confirm tsup produces ESM + .d.ts successfully
  - [x] Run `pnpm test` — confirm all Vitest tests pass
  - [x] Run `pnpm lint` — confirm ESLint + token compliance passes

## Dev Notes

### Existing Package State

The `packages/ui/` package already exists with:
- **Token files:** `src/tokens/layers.css` (layer cascade), `colors.css`, `spacing.css`, `typography.css`, `motion.css`
- **Utilities:** `src/utils/tokenCompliance.ts`, `contrastMatrix.ts`, `complianceScore.ts`
- **Build:** tsup configured for ESM + .d.ts (confirmed in `tsup.config.ts`)
- **Package.json:** `@hexalith/shell-api` as peer dep, React 19 as peer dep
- **Current exports:** Only utility functions (complianceScore, contrastMatrix)

The CSS @layer declaration already exists in `src/tokens/layers.css`:
```css
@layer reset, tokens, primitives, components, density, module;
```

### Architecture Constraints — MUST Follow

1. **File naming:** Components use PascalCase.tsx, CSS Modules use PascalCase.module.css, tests use PascalCase.test.tsx. [Source: architecture.md#Naming Patterns]

2. **Component location:** All layout components go in `src/components/layout/`. [Source: architecture.md#File Structure — packages/ui/src/components/layout/]

3. **CSS Modules + @layer:** All component styles MUST use CSS Modules (`.module.css`) and wrap styles in `@layer components { }`. Use design token CSS custom properties exclusively — zero hardcoded color, spacing, typography, or motion values. [Source: architecture.md#Styling Solution, UX spec#CSS Layer Cascade]

4. **Zero external margin:** ALL `@hexalith/ui` components have zero external margin. Spacing between components is controlled by parent layout containers via `gap` property using spacing tokens. This eliminates margin collapse and composition spacing conflicts. [Source: UX spec#Margin-Free Components]

5. **CSS class names:** Use camelCase for CSS Module class names (e.g., `.pageLayout`, `.pageHeader`). [Source: architecture.md#CSS class names (modules)]

6. **Barrel export:** The root `src/index.ts` is the ONLY barrel file. Organize with category comments. Each export points directly to the source file. No nested barrels. [Source: architecture.md#Barrel Export Clarification]

7. **Prop naming:** Use domain terms, not primitive terms. Event handlers use `on` + PascalCase verb. Boolean props use `is`/`has`/`should` prefix. [Source: architecture.md#Code Naming]

8. **Package dependency rules:** `@hexalith/ui` may import from React and `@hexalith/shell-api` (peer dep for useLocale). It MUST NOT import from `@hexalith/cqrs-client`. [Source: architecture.md#Package Dependency Rules]

9. **Radix encapsulation:** Module developers never import Radix directly. Radix is encapsulated inside `@hexalith/ui`. ESLint `no-restricted-imports` enforces this boundary. [Source: architecture.md, UX spec#Implementation Approach]

10. **Storybook sidebar categories:** Layout components use title `@hexalith/ui/Layout/{ComponentName}`. [Source: architecture.md#Storybook Sidebar Convention]

11. **CSS Module type safety:** Verify `typescript-plugin-css-modules` is configured in tsconfig so that `styles.pageLayout` is typed, not `any`. Without this, CSS Module imports violate strict mode. [Source: architecture.md#CSS Module type generation]

12. **API freeze contract:** These 4 components are structural layout primitives. After this story ships, their public API is frozen — changes require a major version bump of `@hexalith/ui`. Design the API carefully; you cannot change it later without breaking downstream. [Source: UX spec#Structural vs. Content Component Distinction]

### Design Token References

All layout components consume these existing design tokens:

**Spacing tokens** (from `src/tokens/spacing.css`):
- `--spacing-0` through `--spacing-8` (4px grid, 8px preferred rhythm)
- `--spacing-section` (1.5rem comfortable, 1rem compact)
- `--spacing-cell`, `--spacing-field-gap`

**Color tokens** (from `src/tokens/colors.css`):
- `--color-border-default` — for Divider color
- `--color-surface-primary`, `--color-surface-secondary` — for PageLayout background if needed
- `--color-text-primary` — for page header text

**Typography tokens** (from `src/tokens/typography.css`):
- `--font-size-lg` (1.563rem) — for page header title
- `--font-weight-semibold` (600) — for page header title
- `--line-height-tight` (1.2) — for headings

**Motion tokens** (from `src/tokens/motion.css`):
- Not needed for structural layout components (they are static)

### Component API Specifications

**Shared type — export from `src/components/layout/types.ts`:**
```tsx
/**
 * Maps to design token --spacing-{value}. Enforces the 4px/8px rhythm.
 * Values are strings (not numbers) to signal these are token references, not raw pixels.
 * This prevents arithmetic (gap={base + 1}) which would bypass the design system.
 *
 * '0' = 0px, '1' = 4px, '2' = 8px, '3' = 12px, '4' = 16px (default),
 * '5' = 24px, '6' = 32px, '7' = 48px, '8' = 64px
 *
 * Phase 2 consideration: responsive variant (e.g., SpacingScale | Partial<Record<Breakpoint, SpacingScale>>).
 * Do NOT add responsive support in this story.
 */
export type SpacingScale = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
```

**Prop-to-CSS Mapping Pattern (PRECEDENT — all Epic 3 components MUST follow):**
Map variant props to CSS via inline CSS custom properties. This avoids generating class names for every variant combination and keeps the CSS Module simple:
```tsx
// Example: Stack with gap="3"
<div
  className={clsx(styles.root, className)}
  style={{ '--stack-gap': `var(--spacing-${gap ?? '4'})` } as React.CSSProperties}
>
```
```css
/* Stack.module.css */
@layer components {
  .root {
    display: flex;
    flex-direction: column;
    gap: var(--stack-gap);
  }
}
```
This pattern keeps CSS Modules static (one class per component) while allowing prop-driven variation through CSS custom properties. All components in Epic 3 follow this pattern.

**className Merging Pattern (PRECEDENT):**
All components use `clsx` for className merging: `className={clsx(styles.root, className)}`. The consumer's `className` is appended, never replaces the base class.

**Default Prop Values (PRECEDENT):**
All optional props with defaults must have the default value documented in the interface comment AND enforced via destructuring defaults in the component implementation.

**`<PageLayout>` (complex — ≤ 20 props, currently 5 — room to grow):**
```tsx
interface PageLayoutProps {
  title?: string;           // Page header title text
  subtitle?: string;        // Page header subtitle/description
  actions?: React.ReactNode; // Slot for action buttons in page header
  children: React.ReactNode; // Main content area
  className?: string;        // Additional CSS class for module customization
}
```
- CSS Grid with rows: `auto` (header) + `1fr` (content). Named areas: `pageHeader` and `pageContent`.
- Page header height is content-driven (`auto`). Content area fills remaining space via `1fr`. No independent scrolling — the page scrolls as a unit.
- `gap` between header and content uses `--spacing-section`
- Page header renders only if `title` or `actions` are provided. When absent, the grid collapses to content-only.
- Zero external margin — fits inside parent container
- Start minimal. PageLayout will gain props (sidebar slot, breadcrumb area, density) in later stories. The complex classification is a ceiling, not a target.
- Content area is full-width by default. Constrained-width variant deferred to DetailView/Form stories.
- The page header is internal to PageLayout. If other components later need a standalone `PageHeader`, extract it as a sub-component in a future story. For now, it is NOT a separate export.
- **Usage guidance for modules:** Use PageLayout with default props for standard pages. Custom gap values should be exceptional — consistency across modules is the priority.

**`<Stack>` (simple — ≤ 12 props):**
```tsx
interface StackProps {
  gap?: SpacingScale;       // Spacing token scale — defaults to '4' (1rem)
  align?: 'start' | 'center' | 'end' | 'stretch'; // Cross-axis alignment — defaults to 'stretch'
  children: React.ReactNode;
  className?: string;
}
```
- `display: flex; flex-direction: column;`
- `gap` mapped via CSS custom property: `--stack-gap: var(--spacing-{value})`
- Renders as `<div>`. Polymorphic `as` prop deferred — no concrete use case yet.

**`<Inline>` (simple — ≤ 12 props):**
```tsx
interface InlineProps {
  gap?: SpacingScale;       // Same spacing token scale as Stack — defaults to '4'
  align?: 'start' | 'center' | 'end' | 'baseline'; // Vertical alignment — defaults to 'center'
  justify?: 'start' | 'center' | 'end' | 'between'; // Horizontal distribution — defaults to 'start'
  wrap?: boolean;           // Allow wrapping — defaults to false
  children: React.ReactNode;
  className?: string;
}
```
- `display: flex; flex-direction: row;`
- `gap` mapped via CSS custom property: `--inline-gap: var(--spacing-{value})`
- Renders as `<div>`. Polymorphic `as` prop deferred.

**`<Divider>` (simple — ≤ 12 props, currently 1):**
```tsx
interface DividerProps {
  className?: string;
}
```
- Horizontal-only for MVP. Renders an `<hr>` with token styling. Vertical orientation deferred — no concrete MVP use case (sidebar borders are structural in Sidebar component, table separators are built into Table). Adding `orientation` later is a non-breaking minor version bump.
- Uses `--color-border-default` for color
- 1px solid line, no margin (parent controls spacing)
- `<hr>` browser defaults (margin, border) are reset via `src/tokens/reset.css`

### Testing Approach

- **Co-located Vitest tests** (`.test.tsx`) for each component
- Test rendering, prop variations, accessibility attributes
- Use `@testing-library/react` for rendering and assertions
- Test that correct CSS classes are applied (e.g., gap variant class, alignment class) — do NOT assert resolved pixel values since Vitest/jsdom won't load the full CSS cascade with token values
- Test that `className` prop is merged with component classes for extensibility
- Test conditional rendering (e.g., PageLayout header renders only when `title` or `actions` provided)
- Test default prop values (e.g., Stack gap defaults to '4', Inline wrap defaults to false)

### Storybook Stories (Optional for This Story, Required by Story 3.9)

Story 3.9 will add comprehensive Storybook stories. If dev has time, co-locate basic `.stories.tsx` files following the title convention: `@hexalith/ui/Layout/PageLayout`, etc. Not blocking for this story.

### Project Structure Notes

Components align with the architecture's file tree:
```
packages/ui/src/
├── index.ts                     # Barrel export (update with Layout section)
├── tokens/                      # Already exists — DO NOT modify (except reset.css)
│   ├── layers.css
│   ├── reset.css                # NEW — minimal CSS reset in @layer reset { }
│   ├── colors.css
│   ├── spacing.css
│   ├── typography.css
│   └── motion.css
├── components/
│   └── layout/                  # NEW — this story creates this directory
│       ├── PageLayout.tsx
│       ├── PageLayout.module.css
│       ├── PageLayout.test.tsx
│       ├── Stack.tsx
│       ├── Stack.module.css
│       ├── Stack.test.tsx
│       ├── Inline.tsx
│       ├── Inline.module.css
│       ├── Inline.test.tsx
│       ├── Divider.tsx
│       ├── Divider.module.css
│       ├── Divider.test.tsx
│       └── types.ts             # SpacingScale type export
└── utils/                       # Already exists — DO NOT modify
    ├── tokenCompliance.ts
    ├── contrastMatrix.ts
    └── complianceScore.ts
```

### Precedent Patterns — MUST Be Followed by All Epic 3 Stories

This is the first story in Epic 3. The following patterns established here are **binding conventions** for all subsequent Epic 3 stories (3.2-3.9). Deviating from these patterns requires updating all existing components for consistency.

1. **Prop-to-CSS mapping:** Variant props map to CSS via inline CSS custom properties (e.g., `style={{ '--stack-gap': 'var(--spacing-3)' } as React.CSSProperties}`). CSS Modules remain static — one root class per component. No generated variant classes.
2. **CSS custom property cast:** Always use `as React.CSSProperties` for style objects with CSS custom properties. Do NOT use index signatures (`[key: string]: string`) — this opens the door to arbitrary inline styles.
3. **className merging:** `clsx(styles.root, className)` — consumer's class is appended, never replaces.
4. **CSS Module structure:** One `.module.css` per component, all rules wrapped in `@layer components { }`, all values from design tokens.
5. **Test structure:** Co-located `.test.tsx` using `@testing-library/react`. Assert structure and classes, not pixel values.
6. **Export pattern:** Direct export from `src/index.ts` with category comments. No nested barrels.
7. **Type exports:** Component props interfaces and shared types (like `SpacingScale`) are exported alongside the component.
8. **Default props:** Documented in interface comments and enforced via destructuring defaults.

### Composition Story (Optional but Recommended)

Optional: Create `packages/ui/src/components/layout/LayoutComposition.stories.tsx` composing all 4 components (simple page, sectioned page with Dividers, action header with Inline) for visual sanity check. Use plain React rendering — Storybook config is not available until Story 3.9.

### Anti-Patterns to Avoid

- **NO hardcoded values.** Every color, spacing, font-size, font-weight, line-height, and border must reference a design token CSS custom property.
- **NO external margins.** Components use `gap` on parents, not `margin` on children.
- **NO inline styles** except for the CSS custom property pattern for prop-to-CSS mapping (e.g., `style={{ '--stack-gap': 'var(--spacing-3)' }}`). All visual styling via CSS Modules + design tokens.
- **NO `!important`.** CSS layers handle precedence.
- **NO barrel files** in subdirectories. Only `src/index.ts`.
- **NO importing from `@hexalith/cqrs-client`** in any UI component.
- **NO `any` type.** TypeScript strict mode enforced.
- **NO `__tests__/` directories.** Tests are co-located with source files.
- **DO NOT modify existing token files** — they are established in Story 1.2.
- **DO NOT add Radix imports** yet for layout components — PageLayout, Stack, Inline, Divider are pure CSS/HTML components that don't need Radix. Radix is for behavior-heavy components (Select, Dialog, Tooltip, etc.) in later stories.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1] — acceptance criteria and story definition
- [Source: _bmad-output/planning-artifacts/architecture.md#Code Organization] — file structure for packages/ui/
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — file and code naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Barrel Export Clarification] — index.ts organization
- [Source: _bmad-output/planning-artifacts/architecture.md#Package Dependency Rules] — dependency boundaries
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#CSS Layer Cascade Order] — @layer enforcement
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Margin-Free Components] — zero external margin rule
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component API Complexity Tiers] — prop budgets
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Delivery Roadmap] — Week 1-2 structural layout

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- SPIKE: @layer components { } in CSS Modules survives tsup CSS extraction (preserved in dist/index.css). However, tsup does not handle CSS Module class name mapping — styles.xxx resolves to undefined in bundled output. Solution: package.json exports point to source (./src/index.ts) so Vite processes CSS Modules directly in the consuming app. This is standard for private workspace packages.
- Vitest 3 deprecated `environmentMatchGlobs` — migrated to `test.projects` configuration with separate unit (node) and component (jsdom) project definitions.
- @testing-library/react cleanup required explicit `afterEach(cleanup)` in test-setup.ts when using Vitest projects configuration.

### Completion Notes List

- All 4 layout components implemented: PageLayout, Stack, Inline, Divider
- SpacingScale type exported as shared type for all layout components
- Prop-to-CSS mapping pattern established using inline CSS custom properties with `as React.CSSProperties`
- className merging via `clsx(styles.root, className)` pattern established
- CSS Modules with `@layer components { }` wrapper verified working
- reset.css created with box-sizing, margin reset, and hr border reset in `@layer reset { }`
- ESLint module-boundaries updated to block `@emotion/styled`, `@emotion/css`, `@stitches/react`
- All 38 new component tests pass (10 PageLayout, 11 Stack, 13 Inline, 4 Divider)
- Full monorepo regression: 611 tests across all packages — 0 failures
- Build: ESM + DTS produced successfully; Lint: clean pass

### Change Log

- 2026-03-20: Implemented Story 3.1 — UI Package Setup & Structural Layout Components

### File List

New files:
- packages/ui/src/tokens/reset.css
- packages/ui/src/css-modules.d.ts
- packages/ui/src/test-setup.ts
- packages/ui/src/components/layout/types.ts
- packages/ui/src/components/layout/PageLayout.tsx
- packages/ui/src/components/layout/PageLayout.module.css
- packages/ui/src/components/layout/PageLayout.test.tsx
- packages/ui/src/components/layout/Stack.tsx
- packages/ui/src/components/layout/Stack.module.css
- packages/ui/src/components/layout/Stack.test.tsx
- packages/ui/src/components/layout/Inline.tsx
- packages/ui/src/components/layout/Inline.module.css
- packages/ui/src/components/layout/Inline.test.tsx
- packages/ui/src/components/layout/Divider.tsx
- packages/ui/src/components/layout/Divider.module.css
- packages/ui/src/components/layout/Divider.test.tsx

Modified files:
- packages/ui/package.json (added deps, updated exports to source)
- packages/ui/vitest.config.ts (projects config, jsdom, CSS modules)
- packages/ui/src/index.ts (added layout component exports)
- packages/eslint-config/module-boundaries.js (added CSS-in-JS library blocks)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status update)
