# Story 1.2: Design Tokens & Visual Identity

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a shell team developer,
I want to define the design token system with light and dark themes and a CI compliance scanner,
So that all future components inherit a consistent, premium visual identity that is structurally enforced.

## Scope Boundaries

### IN Scope

- Design token CSS files in `packages/ui/src/tokens/` — colors, spacing, typography, motion, layers, density stub
- CSS `@layer` cascade declaration: `reset, tokens, primitives, components, density, module`
- CSS reset layer (box-sizing, margins normalization)
- Light and dark theme definitions via `:root[data-theme="light"]` and `:root[data-theme="dark"]`
- Token compliance scanner as custom Stylelint plugin — detects hardcoded colors, spacing, typography values
- Scanner dual modes: `development` (warn) and `ci` (fail)
- Workspace-level `.stylelintrc.json` configuration
- Contrast matrix utility for automated accessibility validation
- Integration with `pnpm lint` (Stylelint added alongside existing ESLint)
- Global styles entry point in `apps/shell/src/styles/global.css`
- Tests for compliance scanner and contrast matrix

### OUT of Scope

- Component implementation (Epic 3) — tokens are consumed by components, not built here
- Storybook token showcase (Story 3.9)
- ThemeProvider/useTheme React hook (Story 1.4) — this story defines CSS tokens; the React provider comes later
- Radix primitives integration (Story 3.1)
- Any module-specific styling
- Tier 3 (component-specific) tokens — defined per-component in Epic 3
- Signature micro-interactions implementation — motion tokens defined here, animations implemented in components

## Dependencies

- **Story 1.1** (Monorepo Scaffold) — provides `packages/ui/` stub, `packages/eslint-config/`, Turborepo build pipeline, Vitest infrastructure. Stories 1.1 and 1.2 CAN run in parallel per epic spec, but 1.2 builds on 1.1's package stubs.

## Acceptance Criteria

1. **Given** the token package is created in `packages/ui/src/tokens/`
   **When** a developer inspects the token definitions
   **Then** Tier 1 (primitive) tokens exist with naming pattern `--primitive-{category}-{value}` covering colors, spacing, typography, and motion
   **And** Tier 2 (semantic) tokens exist with naming pattern `--{category}-{element}-{property}-{variant?}` for text, surface, border, spacing, font, and motion

2. **Given** theme definitions are created
   **Then** both `light` and `dark` theme definitions exist under `:root[data-theme="light"]` and `:root[data-theme="dark"]`
   **And** dark theme uses warm dark grays (not pure black `#000000`), with warm off-white text (not pure white)
   **And** dark theme surfaces increase in luminance for elevation (opposite of light theme shadows)
   **And** accent color maintains same hue/saturation across themes, luminance adjusted for dark backgrounds
   **And** spatial tokens (spacing, radius, sizing) have identical values across themes — only color and shadow tokens differ
   **And** every light theme semantic token has a corresponding dark theme definition (parity enforced)

3. **Given** the CSS `@layer` cascade is defined
   **Then** the layer order is: `reset, tokens, primitives, components, density, module`
   **And** a CSS reset layer normalizes `box-sizing: border-box` and resets margins/padding on `body`, `h1`-`h6`, `p`, `ul`, `ol`
   **And** the layer declaration is in `packages/ui/src/tokens/layers.css`
   **And** the reset is applied in `apps/shell/src/styles/global.css` which imports the layers

4. **Given** spacing tokens are defined
   **Then** they follow a 4px base grid with 12 values: 0, 4, 8, 12, 16, 24, 32, 48, 64px
   **And** 8px is the preferred rhythm unit
   **And** semantic spacing tokens exist for density variants (`--spacing-cell`, `--spacing-field-gap`, `--spacing-section`) with comfortable (default) and compact values

5. **Given** typography tokens are defined
   **Then** a distinctive non-system typeface is selected (candidates: Inter, Geist, Plus Jakarta Sans — NOT system fonts)
   **And** a matched monospace typeface is selected (candidates: JetBrains Mono, Geist Mono, Fira Code)
   **And** a 7-step type scale exists using 1.250 ratio (Major Third): `--font-size-xs` (0.64rem) through `--font-size-2xl` (2.441rem)
   **And** font weights are defined: Regular (400), Medium (500), Semibold (600), Bold (700)
   **And** line heights are defined: tight (1.2), normal (1.5), relaxed (1.75), table (1.3)
   **And** no font-size outside the 7-step scale is permitted

6. **Given** motion tokens are defined
   **Then** the default transition is 200ms ease-out (`--transition-duration-default: 200ms`)
   **And** `prefers-reduced-motion` media query disables all transitions globally
   **And** input acknowledgment target is ≤ 100ms

7. **Given** the token compliance scanner (Stylelint plugin) is created
   **When** a CSS file contains a hardcoded color value like `#f5f5f5`, `rgba()`, `oklch()`, or `color-mix()` instead of a token
   **Then** the scanner reports a violation with actionable remediation guidance suggesting the correct token
   **And** the scanner allows `transparent`, `currentColor`, and `inherit` as valid non-token values
   **And** the scanner validates that every light theme semantic (Tier 2) token has a corresponding dark theme definition (Tier 1 primitives are theme-independent and excluded from parity check)
   **And** spatial tokens (spacing, radius, sizing) have identical values across themes
   **And** the scanner runs as part of `pnpm lint` and produces a compliance score
   **And** the scanner flags any `font-size` value not in the 7-step scale
   **And** the scanner flags any `margin`, `padding`, or `gap` value not in the spacing scale
   **And** the scanner flags `calc()` expressions containing hardcoded values in spacing properties (e.g., `calc(100% - 16px)` — the `16px` should be a token)
   **And** the scanner flags hardcoded `transition-duration` and `animation-duration` values — must use motion tokens
   **And** the scanner flags `!important` in module code as a violation

8. **Given** the scanner supports two modes
   **Then** `development` mode (default for local `pnpm lint`) reports violations as warnings but does NOT fail the build
   **And** `ci` mode fails on violations with clear error messages identifying the violation and suggesting the correct token
   **And** mode is controlled via environment variable (e.g., `HEXALITH_SCANNER_MODE=ci`)

9. **Given** the contrast matrix utility is created
   **Then** it validates that `--color-text-primary` has ≥ 7:1 contrast on `--color-surface-primary` in BOTH light and dark themes
   **And** `--color-text-secondary` has ≥ 4.5:1 contrast on `--color-surface-primary` in both themes
   **And** `--color-text-tertiary` has ≥ 3:1 contrast on surfaces in both themes
   **And** focus ring tokens guarantee ≥ 3:1 contrast against all surface tokens — validated as a cross-product: 3 surfaces (primary, secondary, elevated) × 2 themes = 6 checks
   **And** the utility has co-located Vitest tests that pass

10. **Given** the token system and scanner are integrated
    **Then** `pnpm build` succeeds with the new token files
    **And** `pnpm lint` runs both ESLint AND Stylelint without errors
    **And** `pnpm test` passes with scanner and contrast matrix tests
    **And** token budget is tracked: Tier 1 + Tier 2 ≤ 150 tokens total

## Tasks / Subtasks

- [x] Task 1: Create CSS `@layer` declaration and reset (AC: #3)
  - [x] 1.1 Create `packages/ui/src/tokens/layers.css` with `@layer reset, tokens, primitives, components, density, module`
  - [x] 1.2 Create `apps/shell/src/styles/global.css` importing layers and applying CSS reset in `@layer reset`
  - [x] 1.3 Import `global.css` in `apps/shell/src/main.tsx`
- [x] Task 2: Define Tier 1 (primitive) color tokens (AC: #1, #2)
  - [x] 2.1 Create `packages/ui/src/tokens/colors.css`
  - [x] 2.2 Define primitive color palette: warm neutrals (gray with amber undertone), accent color candidates, semantic status colors, data visualization palette (8 color-blind safe colors: `--color-data-1` through `--color-data-8`, tested against deuteranopia/protanopia simulation)
  - [x] 2.3 Define `:root[data-theme="light"]` with all semantic color tokens (surface, text, border, accent, status)
  - [x] 2.4 Define `:root[data-theme="dark"]` as parallel design — warm dark grays, off-white text, luminance-based elevation, recalibrated status colors
  - [x] 2.5 Verify parity: every light token has dark counterpart; spatial tokens identical across themes
- [x] Task 3: Define spacing tokens (AC: #4)
  - [x] 3.1 Create `packages/ui/src/tokens/spacing.css`
  - [x] 3.2 Define primitive spacing scale: 0, 4, 8, 12, 16, 24, 32, 48, 64px (9 values on 4px grid)
  - [x] 3.3 Define semantic spacing tokens with density variants (comfortable default, compact alternative)
- [x] Task 4: Define typography tokens (AC: #5)
  - [x] 4.1 Create `packages/ui/src/tokens/typography.css`
  - [x] 4.2 Select and configure distinctive typeface (Inter, Geist, or Plus Jakarta Sans) + matched monospace
  - [x] 4.3 Define 7-step type scale on 1.250 ratio: xs through 2xl
  - [x] 4.4 Define font weight tokens: regular (400), medium (500), semibold (600), bold (700)
  - [x] 4.5 Define line height tokens: tight (1.2), normal (1.5), relaxed (1.75), table (1.3)
- [x] Task 5: Define motion tokens (AC: #6)
  - [x] 5.1 Create `packages/ui/src/tokens/motion.css`
  - [x] 5.2 Define `--transition-duration-default: 200ms`, `--transition-easing-default: ease-out`
  - [x] 5.3 Add `prefers-reduced-motion` media query that sets all transition durations to `0ms`
- [x] Task 6: Build token compliance scanner — Stylelint plugin (AC: #7, #8)
  - [x] 6.1 Create `packages/ui/src/utils/tokenCompliance.ts` — custom Stylelint plugin using `stylelint.createPlugin`
  - [x] 6.2 Implement rule: detect hardcoded color values (`#hex`, `rgb()`, `rgba()`, `hsl()`, `oklch()`, `color-mix()`) and suggest token replacements; allowlist: `transparent`, `currentColor`, `inherit`
  - [x] 6.3 Implement rule: detect hardcoded spacing/sizing values not in the 4px grid scale; also flag `calc()` with hardcoded px values in spacing properties
  - [x] 6.4 Implement rule: detect font-size values not in the 7-step scale
  - [x] 6.5 Implement rule: flag `!important` usage
  - [x] 6.6 Implement rule: flag hardcoded `transition-duration` and `animation-duration` values — must use motion tokens
  - [x] 6.7 Implement rule: flag non-system custom property definitions (`--*`) that contain hardcoded color/spacing values (prevents token bypass via intermediate variables)
  - [x] 6.8 Implement light/dark parity check — only semantic (Tier 2) tokens; primitives are theme-independent and excluded
  - [x] 6.9 Implement dual mode: `development` (warnings) vs `ci` (errors) via `HEXALITH_SCANNER_MODE` env var
  - [x] 6.10 Generate compliance score (percentage of clean declarations)
  - [x] 6.11 Write Vitest tests for scanner rules
- [x] Task 7: Build contrast matrix utility (AC: #9)
  - [x] 7.1 Create `packages/ui/src/utils/contrastMatrix.ts` — WCAG contrast ratio calculation
  - [x] 7.2 Implement automated validation: text-primary ≥ 7:1, text-secondary ≥ 4.5:1, text-tertiary ≥ 3:1, focus ring ≥ 3:1 — validate in BOTH light and dark themes
  - [x] 7.3 Implement focus ring cross-product validation: 3 surfaces (primary, secondary, elevated) × 2 themes = 6 contrast checks
  - [x] 7.4 Write Vitest tests for contrast calculations and token compliance
- [x] Task 8: Configure workspace Stylelint (AC: #10)
  - [x] 8.1 Create `.stylelintrc.json` at workspace root — reference scanner via BUILT output path (`./packages/ui/dist/tokenCompliance.js`), NOT `.ts` source; add `ignoreFiles: ["**/tokens/*.css"]` to prevent scanner from flagging token definition files themselves
  - [x] 8.2 Add separate `lint:styles` task in `turbo.json` with `dependsOn: ["^build"]` (scanner must be built before Stylelint can load it); keep existing `lint` (ESLint) task fast with no build dependency
  - [x] 8.3 Add `stylelint` and dependencies to root or `packages/ui` devDependencies
  - [x] 8.4 Update `packages/ui/src/index.ts` barrel to export scanner/contrast utilities for CI usage
- [x] Task 9: Verify integration (AC: #10)
  - [x] 9.1 Run `pnpm build` — all packages including tokens build successfully
  - [x] 9.2 Run `pnpm lint` — ESLint + Stylelint pass (scanner in development mode)
  - [x] 9.3 Run `pnpm test` — scanner and contrast matrix tests pass
  - [x] 9.4 Verify token count: Tier 1 + Tier 2 = 121 (≤ 150 budget)

## Dev Notes

### Technical Requirements

- **Token Format:** CSS custom properties (`--property-name: value`) — NOT CSS-in-JS, NOT SCSS variables
- **Token Location:** `packages/ui/src/tokens/` — CSS files organized by category
- **Scanner Technology:** Custom Stylelint plugin using `stylelint.createPlugin` API
- **Theme Mechanism:** `:root[data-theme="light|dark"]` attribute selectors — ThemeProvider (Story 1.4) will toggle this attribute
- **CSS Layers:** `@layer` declaration establishes cascade priority — structural enforcement, not just convention
- **Build:** Token CSS files bundled via tsup alongside TypeScript; global.css imported directly by shell app

### Architecture Compliance

**Token Naming — Three-Tier System (from architecture.md + UX spec):**

| Tier              | Purpose                                | Pattern                                        | Example                                             | Budget      |
| ----------------- | -------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | ----------- |
| Tier 1: Primitive | Raw values, never used in components   | `--primitive-{category}-{value}`               | `--primitive-color-gray-200`, `--primitive-space-4` | ~60         |
| Tier 2: Semantic  | Meaningful aliases used in components  | `--{category}-{element}-{property}-{variant?}` | `--color-text-primary`, `--spacing-md`              | ~80         |
| Tier 3: Component | Component-specific (NOT in this story) | `--{component}-{element}-{property}`           | `--table-row-height`                                | ~30 (later) |

**ADR: Token Naming Resolution** — Architecture.md references `--hx-{category}-{name}` prefix but this conflicts with the three-tier system from the UX spec. **Decision: No `--hx-` prefix.** Primitives use `--primitive-{category}-{value}`, semantics use `--{category}-{element}-{property}-{variant?}`. This avoids double-prefixing and matches the UX spec exactly. If future namespacing is needed, it can be added at that time.

**Token Budget Enforcement:** Tier 1 + Tier 2 ≤ 150 tokens total. Track count via `/* Token count: N/150 */` comment at the top of each token file. CI validates total across all files.

**CSS @layer Cascade (six layers — structural enforcement):**

```css
@layer reset, tokens, primitives, components, density, module;
```

- `reset` — box-sizing, margin normalization
- `tokens` — CSS custom property definitions (this story)
- `primitives` — Radix primitive overrides (Epic 3)
- `components` — @hexalith/ui component styles (Epic 3)
- `density` — density profile overrides via `[data-density="compact"]`
- `module` — module-specific styles (lowest priority; cannot override components)

Module CSS cannot override component tokens because of layer ordering. `!important` in module code is flagged by scanner.

**CSS Modules + @layer Interaction:** Components using CSS Modules do NOT declare `@layer` themselves. The global `layers.css` declares all layers; component `.module.css` files are automatically scoped to the `components` layer by build tooling. Only `layers.css` and `global.css` contain `@layer` declarations.

**File Locations (from architecture.md):**

- Token definitions: `packages/ui/src/tokens/` (colors.css, spacing.css, typography.css, motion.css, layers.css)
- Compliance scanner: `packages/ui/src/utils/tokenCompliance.ts`
- Contrast validator: `packages/ui/src/utils/contrastMatrix.ts`
- Global styles: `apps/shell/src/styles/global.css`
- Stylelint config: `.stylelintrc.json` (workspace root)

**Design System Health Gate (from architecture.md):**

- Every PR displays a single Design System Health score
- 100% = pass; any violation = fail with remediation guidance
- Scanner runs as part of `pnpm lint`
- Emergency override: `HEXALITH_SCANNER_MODE=warn` env var (24h resolution window)

### Library & Framework Requirements

**New dependencies for this story:**

- `stylelint` — latest stable (workspace devDependency)
- `postcss` — latest stable (peer dependency of stylelint)
- Chosen typeface: install via `@fontsource/{typeface}` package (e.g., `@fontsource/inter`, `@fontsource/geist-sans`, `@fontsource/plus-jakarta-sans`)
- Matched monospace: `@fontsource/{mono-typeface}`

**Font Loading Location:** `@fontsource` CSS imports (`import '@fontsource/inter/400.css'`) MUST be in the shell app (`apps/shell/src/main.tsx` or `apps/shell/src/styles/global.css`), NOT in token CSS files. Token CSS only references `font-family` names — the actual font file loading is the composition root's responsibility.

**NOT to install:**

- `styled-components`, `@emotion/*` — CSS-in-JS is architecturally banned
- `tailwindcss` — not in the architecture
- `sass`, `less` — CSS custom properties + CSS Modules is the chosen approach
- `postcss-preset-env` — not needed for tokens (raw CSS custom properties)

### Color Palette Decisions

**Accent Color Candidates (from UX spec — choose ONE):**

| Candidate        | Hex Direction   | Character                                  | Risk                             |
| ---------------- | --------------- | ------------------------------------------ | -------------------------------- |
| **Indigo**       | `#5B6AD0` range | Trustworthy, modern, premium               | Common "modern SaaS"             |
| **Teal**         | `#2B9E8F` range | Fresh, distinctive, uncommon in enterprise | "Healthcare" association         |
| **Warm Violet**  | `#8B6CC1` range | Sophisticated, very uncommon               | Can feel playful                 |
| **Copper/Amber** | `#C07A4E` range | Warm, crafted, matches neutral base        | Low contrast on warm backgrounds |

**Decision:** Choose the accent that best complements the warm neutral base. Ship as `--color-accent` with derived variants (`--color-accent-subtle`, `--color-accent-hover`, `--color-accent-active`). Modules never reference the raw hue.

**Dark Theme Principles (from UX spec — NON-NEGOTIABLE):**

- Warm dark gray base (e.g., `#1A1917` range), NOT `#000000`
- Text contrast targets 10:1 (not 15:1+ — pure white causes eye strain)
- Text color is warm off-white, NOT `#FFFFFF`
- Elevation = increased luminance (opposite of light theme shadows)
- Status colors individually recalibrated for dark backgrounds (not same hex with opacity)

### Semantic Color Tokens (from UX spec)

| Token                                     | Purpose                             | Contrast Requirement                                                     |
| ----------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `--color-text-primary`                    | Main body text                      | ≥ 7:1 on surface-primary                                                 |
| `--color-text-secondary`                  | Muted/metadata text                 | ≥ 4.5:1                                                                  |
| `--color-text-tertiary`                   | Non-essential labels                | ≥ 3:1                                                                    |
| `--color-text-disabled`                   | Disabled states                     | ≥ 3:1, explicit gray                                                     |
| `--color-surface-primary`                 | Page canvas                         | Warm neutral base                                                        |
| `--color-surface-secondary`               | Cards, elevated surfaces            | Slightly elevated                                                        |
| `--color-surface-elevated`                | Dropdowns, popovers                 | Maximum elevation                                                        |
| `--color-border-default`                  | Dividers, table lines               | Muted                                                                    |
| `--color-accent`                          | Interactive focus, selected         | Single hue from candidates                                               |
| `--color-accent-subtle`                   | Subtle accent background            | Lower saturation                                                         |
| `--color-accent-hover`                    | Hover state                         | Darker variant                                                           |
| `--color-accent-active`                   | Active/pressed state                | Maximum contrast variant                                                 |
| `--color-status-success`                  | Positive feedback                   | Green family                                                             |
| `--color-status-warning`                  | Cautionary info                     | Amber/yellow family                                                      |
| `--color-status-danger`                   | Errors, destructive                 | Red family                                                               |
| `--color-status-info`                     | Informational emphasis              | Blue family                                                              |
| `--color-data-1` through `--color-data-8` | Data visualization (charts, graphs) | 8 color-blind safe colors, distinguishable under deuteranopia/protanopia |

### Spacing Scale Reference

| Token         | Primitive             | Value | Usage                       |
| ------------- | --------------------- | ----- | --------------------------- |
| `--spacing-0` | `--primitive-space-0` | 0px   | Reset                       |
| `--spacing-1` | `--primitive-space-1` | 4px   | Icon-to-label gap           |
| `--spacing-2` | `--primitive-space-2` | 8px   | Input padding, compact card |
| `--spacing-3` | `--primitive-space-3` | 12px  | Form field gap, table cell  |
| `--spacing-4` | `--primitive-space-4` | 16px  | Card padding, section gap   |
| `--spacing-5` | `--primitive-space-5` | 24px  | Section separation          |
| `--spacing-6` | `--primitive-space-6` | 32px  | Page section separation     |
| `--spacing-7` | `--primitive-space-7` | 48px  | Major layout divisions      |
| `--spacing-8` | `--primitive-space-8` | 64px  | Page-level rhythm           |

### Typography Scale Reference (1.250 Major Third)

| Token              | Size              | Weight         | Usage                        |
| ------------------ | ----------------- | -------------- | ---------------------------- |
| `--font-size-xs`   | 0.64rem (10.2px)  | Regular        | Fine print, timestamps       |
| `--font-size-sm`   | 0.8rem (12.8px)   | Regular/Medium | Table cells, form labels     |
| `--font-size-body` | 1rem (16px)       | Regular        | Body text, form inputs       |
| `--font-size-md`   | 1.25rem (20px)    | Medium         | Section headers, card titles |
| `--font-size-lg`   | 1.563rem (25px)   | Semibold       | Page section headings        |
| `--font-size-xl`   | 1.953rem (31.3px) | Semibold       | Page titles                  |
| `--font-size-2xl`  | 2.441rem (39px)   | Bold           | Dashboard hero numbers       |

### Token Compliance Scanner — Implementation Guide

**Stylelint Plugin API pattern:**

```typescript
import stylelint from "stylelint";
const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;
```

**Rules to implement:**

1. `hexalith/no-hardcoded-colors` — flags `#hex`, `rgb()`, `rgba()`, `hsl()`, `oklch()`, `color-mix()` values; allows `transparent`, `currentColor`, `inherit`; suggests nearest token
2. `hexalith/no-hardcoded-spacing` — flags `margin`, `padding`, `gap` values not in 4px grid; also flags `calc()` containing hardcoded px in spacing props; suggests nearest token
3. `hexalith/no-hardcoded-typography` — flags `font-size` values not in the 7-step scale
4. `hexalith/no-hardcoded-motion` — flags hardcoded `transition-duration` and `animation-duration` values; must use motion tokens
5. `hexalith/no-important` — flags `!important` in module-layer CSS
6. `hexalith/no-hardcoded-custom-props` — flags non-system `--*` custom property definitions containing hardcoded color/spacing values (prevents token bypass via intermediate variables)
7. `hexalith/theme-parity` — validates every light theme semantic (Tier 2) token has dark counterpart; primitives excluded

**Dual mode via env var:**

```typescript
const mode = process.env.HEXALITH_SCANNER_MODE || "development";
// development: severity = 'warning'
// ci: severity = 'error'
```

**Compliance score:** Count clean declarations / total declarations × 100

### Testing Requirements

- **Scanner tests:** Each rule gets its own test file — pass cases (tokens used correctly) and fail cases (hardcoded values)
- **Contrast matrix tests:** Verify WCAG ratio calculation accuracy, validate all token pairs meet thresholds
- **Theme parity tests:** Verify every light token has dark counterpart, spatial tokens identical across themes
- **Framework:** Vitest (already configured from Story 1.1)
- **Coverage target:** ≥ 95% for foundation packages (scanner and contrast matrix are `@hexalith/ui` internals)

### File Structure (new/modified files only)

```
packages/ui/
├── src/
│   ├── index.ts                    (MODIFIED — add token + scanner exports)
│   ├── tokens/
│   │   ├── layers.css              (NEW — @layer declaration)
│   │   ├── colors.css              (NEW — primitive + semantic color tokens, light + dark)
│   │   ├── spacing.css             (NEW — primitive + semantic spacing tokens)
│   │   ├── typography.css          (NEW — font family, scale, weights, line heights)
│   │   └── motion.css              (NEW — transition defaults, prefers-reduced-motion)
│   └── utils/
│       ├── tokenCompliance.ts      (NEW — Stylelint plugin with 7 rules)
│       ├── tokenCompliance.test.ts (NEW — tests for each scanner rule)
│       ├── contrastMatrix.ts       (NEW — WCAG contrast ratio calculator)
│       └── contrastMatrix.test.ts  (NEW — contrast validation tests)
apps/shell/
└── src/
    └── styles/
        └── global.css              (NEW — imports layers, applies reset)
.stylelintrc.json                   (NEW — workspace Stylelint config)
```

### Previous Story Intelligence (from Story 1-1)

- `packages/ui/` exists as stub with `src/index.ts` (`export {}`), `tsup.config.ts`, `vitest.config.ts`, `package.json` (private, peerDeps: react)
- `packages/eslint-config/` has `base.js`, `react.js`, `module-boundaries.js` — already blocks `styled-components`, `@emotion/*`
- Vitest 3.x with `test.projects` in root `vitest.config.ts`
- turbo.json has `lint` task with no `dependsOn` (runs in parallel) — this story adds a SEPARATE `lint:styles` task with `dependsOn: ["^build"]` for Stylelint
- `.stylelintrc.json` does NOT exist yet — must be created in this story
- `apps/shell/src/main.tsx` renders placeholder page — will need to import `global.css`
- tsup config: `entry: ['src/index.ts'], format: ['esm'], dts: true, clean: true`

### Git Intelligence

**Story 1-1 is currently `in-progress`.** Stories 1.1 and 1.2 can run in parallel per epic spec (parallel track A: scaffold + tokens). If 1.1 is not complete when you start, you may need to create the `packages/ui/` structure yourself or wait for 1.1 to complete.

### Latest Tech Information

**Stylelint (current stable):**

- Custom plugins use `stylelint.createPlugin(ruleName, ruleFunction)`
- Rule function signature: `(primary, secondaryOptions) => (root, result) => { ... }`
- Use `root.walkDecls()` to iterate CSS declarations
- Use `stylelint.utils.report()` to report violations
- Config in `.stylelintrc.json` references plugin via BUILT output: `"plugins": ["./packages/ui/dist/tokenCompliance.js"]` — Stylelint cannot load `.ts` files directly
- Scanner must be built (tsup) BEFORE Stylelint can load it — hence `lint:styles` turbo task needs `dependsOn: ["^build"]`
- Add `"ignoreFiles": ["**/tokens/*.css"]` in `.stylelintrc.json` to prevent scanner from flagging token definition files themselves (which legitimately contain hardcoded values)

**CSS @layer (browser support):**

- Supported in all modern browsers (Chrome 99+, Firefox 97+, Safari 15.4+)
- No polyfill needed for the target audience
- `@layer` declarations must be first in the stylesheet

**CSS custom properties:**

- Inheritance works naturally through the DOM
- `:root[data-theme]` selector specificity is sufficient for theme switching
- `var(--token, fallback)` syntax for graceful degradation

**@fontsource packages:**

- Self-hosted fonts via npm packages
- Import specific weights: `import '@fontsource/inter/400.css'`
- Reduces external dependency on Google Fonts CDN
- Supports variable font variants for smaller bundle size

### Project Structure Notes

- **Alignment:** All file paths match architecture.md specification exactly
- **Package boundary:** Token CSS files are in `packages/ui/` (the design system package), NOT in `apps/shell/`
- **Global styles exception:** `apps/shell/src/styles/global.css` is the ONLY place that imports token files and applies the reset — this is the shell app's responsibility as the composition root
- **Scanner as internal utility:** `tokenCompliance.ts` and `contrastMatrix.ts` are in `packages/ui/src/utils/` and exported for CI usage, but are NOT part of the component API
- **Token File Format:** One token per line for parseability. Each token CSS file starts with a `/* Token count: N/150 */` comment tracking contribution to the 150-token budget. This enables future JSON export tooling to parse tokens without a CSS parser
- **turbo.json Lint Topology:** `lint` (ESLint) has no `dependsOn` and runs fast. `lint:styles` (Stylelint) has `dependsOn: ["^build"]` because the scanner plugin must be compiled first

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — CSS @layer enforcement, token naming (--hx-*), file locations, design system health gate, CI pipeline]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.2 acceptance criteria, scanner dual modes, token categories]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Color palette (warm neutrals + accent candidates), typography scale (1.250 Major Third), spacing (4px grid), motion (200ms), dark theme parallel design, contrast requirements, token budget, semantic token table]
- [Source: _bmad-output/planning-artifacts/prd.md — FR39-FR41 component library, NFR17-NFR20 accessibility, NFR42 ≤15 public exports]
- [Source: Stylelint docs — createPlugin API, rule function pattern, .stylelintrc.json config]
- [Source: Story 1-1 — packages/ui stub structure, ESLint config, Vitest 3.x setup, turbo.json lint task]

## Dev Agent Record

### Agent Model Used

GitHub Copilot (GPT-5.4)

### Debug Log References

- Code review remediation: moved token consumption back into `apps/shell/src/styles/global.css` so the shell composition root owns CSS imports and the app entry no longer hardcodes token styling inline.
- Scanner parity hardening: extended `hexalith/no-hardcoded-custom-props` to catch spacing literals in custom properties and tightened `hexalith/theme-parity` to compare spatial token values across themes, not just token presence.
- Compliance gate integration: added `scripts/run-stylelint.mjs` to execute Stylelint after a workspace build, emit the design-system health score, and keep `pnpm lint` as the single enforcement entry point.
- Contrast drift prevention: added tests that read `packages/ui/src/tokens/colors.css` directly so utility snapshots stay aligned with token source-of-truth values.

### Completion Notes List

- Token count: 121/150 budget (28 primitive colors + 31 semantic colors + 9 primitive spacing + 12 semantic spacing + 17 primitive typography + 18 semantic typography + 3 primitive motion + 3 semantic motion)
- Accent color: Indigo (#5B6AD0) chosen — complements warm neutral base, premium feel
- Typefaces: Inter (variable) for sans, JetBrains Mono (variable) for monospace — loaded via @fontsource-variable in shell app
- Data visualization palette: Tol's vibrant qualitative palette (8 color-blind safe colors), brightened for dark theme
- Dark theme: Warm dark grays (#1E1D19 base), off-white text (#FAF9F7, ~13.5:1 contrast), luminance-based elevation
- All WCAG contrast requirements met and validated by automated tests
- 75 tests total: 49 scanner + 26 contrast matrix — all passing
- Stylelint scanner now runs inside `pnpm lint` through the workspace compliance runner and reports a Design System Health score of 100% (11/11 declarations compliant)
- Post-review remediation removed inline hardcoded shell styles, restored global token imports to `global.css`, and aligned the story with the architectural composition-root guidance
- `pnpm build`, `pnpm lint`, and `pnpm test` all pass clean after review fixes

### File List

**New files:**

- `packages/ui/src/tokens/colors.css` — Tier 1 + Tier 2 color tokens, light/dark themes (53 tokens)
- `packages/ui/src/tokens/spacing.css` — Tier 1 + Tier 2 spacing tokens, density variants (21 tokens)
- `packages/ui/src/tokens/typography.css` — Font families, type scale, weights, line heights (34 tokens)
- `packages/ui/src/tokens/motion.css` — Transition duration, easing, reduced-motion (6 tokens)
- `packages/ui/src/utils/tokenCompliance.ts` — Stylelint plugin with 7 custom rules
- `packages/ui/src/utils/tokenCompliance.test.ts` — 49 tests for scanner rules
- `packages/ui/src/utils/contrastMatrix.ts` — WCAG contrast ratio calculator + theme validation
- `packages/ui/src/utils/contrastMatrix.test.ts` — 26 tests for contrast validation
- `packages/ui/src/utils/complianceScore.ts` — Compliance score utility (separated from scanner for clean DTS)
- `.stylelintrc.json` — Workspace Stylelint config with 7 hexalith/\* rules
- `scripts/run-stylelint.mjs` — Workspace Stylelint runner that prints the Design System Health score after building scanner artifacts

**Modified files:**

- `packages/ui/src/index.ts` — Barrel exports for contrast matrix + compliance score utilities
- `packages/ui/tsup.config.ts` — Split config: index (with DTS) + tokenCompliance (no DTS, external stylelint)
- `packages/ui/package.json` — Added devDependencies: stylelint, @types/node
- `apps/shell/src/main.tsx` — Font imports plus token-driven shell composition without inline hardcoded styles
- `apps/shell/src/styles/global.css` — Global composition-root stylesheet importing token CSS and applying reset + app-shell layout styling
- `apps/shell/package.json` — Added @hexalith/ui, @fontsource-variable/inter, @fontsource-variable/jetbrains-mono
- `turbo.json` — Added lint:styles task with dependsOn: ["^build"]
- `package.json` (root) — Added lint:styles script into the main lint flow, stylelint + postcss devDependencies
- `apps/shell/tsconfig.json` — Removed deprecated path aliases no longer needed for token CSS consumption
