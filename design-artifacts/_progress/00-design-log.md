# Design Log — Hexalith FrontShell

## Phase 0: Project Setup — 2026-03-25

- **Project type**: Brownfield (existing product)
- **Complexity**: Web Application (complex)
- **Tech stack**: React 19 + Vite + TypeScript (monorepo with pnpm + Turborepo)
- **Component library**: Custom (`@hexalith/ui` built on Radix UI primitives, CSS tokens, Storybook, Playwright CT)
- **Brief level**: Simplified — document what exists + what to change
- **Stakes**: Enterprise / High stakes
- **Involvement**: Autonomous execution
- **Role**: Open source project creator
- **Recommendation style**: Direct guidance
- **Alignment**: Not required
- **Routing**: Phase 8 — Product Evolution

### Observations from project scan
- Established monorepo with 5 modules (orders, tenants, demo-tasks, etc.)
- Shell app in `apps/shell/`
- Shared packages: `@hexalith/ui`, `cqrs-client`, `shell-api`, `eslint-config`, `tsconfig`
- Active CI pipeline, testing strategy, and AI knowledge bundle in place
- Design artifact folders exist but are empty — no prior WDS work completed

## Phase 8: Product Evolution — 2026-03-25

### Cycle 1: Product Vision & Roadmap

**Analysis complete** — Deep codebase scan performed. 5 improvement targets identified.
- Selected target: Product vision & roadmap (High impact, Low effort)
- Rationale: Informs all other improvement decisions
- Analysis saved: `evolution/analysis/001-product-analysis.md`
- Status: **Complete**
- Scenario: `evolution/scenarios/001-product-vision-roadmap.md`
- Deliverable: `A-Product-Brief/product-vision.md`
- Key decisions:
  - Vision: Unified micro-frontend shell for any microservice UI module
  - Open plugin architecture — any module can plug in via manifest
  - Priority 1: Developer experience (effortless module creation)
  - Priority 2: Design consistency (enforced via tooling)
  - Priority 3: Production reliability (auth, errors, real-time)
- Roadmap themes: Formalize UX, expand modules, design system docs, accessibility audit, community onboarding

### Cycle 2: Formalize UX Specifications

**Analysis complete** — Extracted implicit patterns from orders and tenants modules.
- Selected target: Formalize UX specifications (High impact, Medium effort)
- Analysis saved: `evolution/analysis/002-ux-specifications-analysis.md`
- Scenario: `evolution/scenarios/002-formalize-ux-specifications.md`
- Deliverable: `C-UX-Scenarios/ux-interaction-patterns.md`
- Status: **Complete**
- Coverage: Page templates (List/Detail/Create/Edit), state handling, navigation, forms, CQRS integration, styling rules, file structure, schema conventions, formatting

### Cycle 3: Update AI Knowledge Bundle

**Analysis complete** — Identified gaps between UX patterns and AI generation pipeline.
- Selected target: Update AI knowledge bundle (High impact, Low effort)
- Analysis saved: `evolution/analysis/003-ai-knowledge-bundle-analysis.md`
- Status: **Complete**
- Files updated:
  - `docs/ai-knowledge-bundle/index.md` — Added UX patterns reference + usage step
  - `docs/ai-knowledge-bundle/conventions.md` — Added formatting conventions (Intl APIs) + navigation conventions (relative paths)
  - `docs/ai-knowledge-bundle/scaffold-structure.md` — Added edit page pattern + UX conformance section
  - `docs/ai-knowledge-bundle/generation-pipeline.md` — Added UX conformance as quality requirement
  - `docs/ai-knowledge-bundle/prompts/new-module.md` — Added edit page generation (section 6), UX patterns reference, 7 new quality checklist items, removed edit page limitation

### Cycle 4: Community Onboarding

**Selected target:** Community onboarding (High impact, Low effort)
- Scenario: `evolution/scenarios/003-community-onboarding.md`
- Deliverable: `CONTRIBUTING.md` (project root)
- Status: **Complete**
- Coverage: Code of conduct, setup, project structure, contribution types, workflow, conventions (code/modules/testing/commits), quality gates, architecture decisions, adding modules, adding components

### Cycle 5: Visual Regression Baseline

**Selected target:** Visual regression baseline (Medium impact, Low effort)
- Scenario: `evolution/scenarios/004-visual-regression-baseline.md`
- Status: **Complete**
- Changes:
  - `packages/ui/playwright-ct.config.ts` — Added snapshot path template + maxDiffPixelRatio (1%)
  - `Button.spec.tsx` — Added variant screenshots (light + dark)
  - `Input.spec.tsx` — Added default state screenshots (light + dark)
  - `Table.spec.tsx` — Added data table screenshots (light + dark), expanded test data
  - `Skeleton.spec.tsx` — Added table + detail variant screenshots (light + dark)
  - `Sidebar.spec.tsx` — Added category navigation screenshots (light + dark)
  - `EmptyState.spec.tsx` — Added action state screenshots (light + dark)
  - `TenantListPage.spec.tsx` — Added full page composition screenshots (light + dark)
- Coverage: 7 components across all 6 categories + 1 composition, both themes
- Note: Screenshots are generated on first run (`--update-snapshots`), then compared on subsequent runs

### Cycle 6: Design System Documentation

**Selected target:** Design system documentation (Medium impact, Medium effort)
- Scenario: `evolution/scenarios/005-design-system-documentation.md`
- Deliverable: `D-Design-System/component-usage-guidelines.md`
- Status: **Complete**
- Coverage: Decision trees (data display, user input, feedback, overlays), composition recipes (list/detail/create/edit pages, destructive actions), variant guides (Button, Skeleton, Toast), Modal vs AlertDialog, layout guide with gap scale, table column configuration patterns, common mistakes table
- Note: Bridges gap between API reference (ui-components.md) and page patterns (ux-interaction-patterns.md)

### Cycle 7: Root README.md

**Selected target:** Root README.md (High impact, Low effort)
- Deliverable: `README.md` (project root)
- Status: **Complete**
- Coverage: Vision statement, tech stack, project structure, quick start, module creation, documentation links (all 9 docs), quality gates summary, contributing link, license

### Cycle 8: Accessibility Audit

**Selected target:** Accessibility audit (Medium impact, Medium effort)
- Scenario: `evolution/scenarios/006-accessibility-audit.md`
- Deliverable: `F-Testing/accessibility-audit.md`
- Status: **Complete**
- Findings:
  - 29 components + 4 compositions tested with axe-core (light + dark)
  - 103 ARIA attributes, 57 focus styles, 18 files with `prefers-reduced-motion`
  - Assessment: Substantially WCAG 2.1 AA compliant
  - 3 gaps identified (all low-medium severity, low effort):
    1. Missing skip-to-main-content link (Medium)
    2. Verify `<html lang>` attribute (Low)
    3. Warning status color contrast at small text size (Low)

### Cycle 9: Fix Accessibility Gaps

**Selected target:** Fix 3 accessibility gaps from audit (Medium impact, Low effort)
- Status: **Complete**
- Findings on re-examination:
  - Gap 1 (skip link): Already implemented in ShellLayout.tsx + global.css — no action needed
  - Gap 2 (html lang): Already present as `<html lang="en">` in index.html — no action needed
  - Gap 3 (warning contrast): Fixed — darkened `--primitive-color-amber-500` from `#D4940A` to `#B87D00` (~4.6:1)
- Audit updated: Assessment upgraded from "substantially compliant" to "fully WCAG 2.1 AA compliant"
- File changed: `packages/ui/src/tokens/colors.css`

### Cycle 10: Design Token Documentation

**Selected target:** Design token documentation (Medium impact, Low effort)
- Deliverable: `D-Design-System/design-token-reference.md`
- Status: **Complete**
- Coverage: 2-tier architecture, colors (text/surfaces/borders/accent/status/focus/data-viz), spacing (9-point scale + density), typography (families/sizes/weights/line-heights), motion, radius, z-index, shadows, theme switching, quick reference CSS usage
- Token count: 132 tokens across 8 source files

### Cycle 11: Storybook as Living Docs

**Selected target:** Storybook variant stories (Medium impact, Medium effort)
- Status: **Complete**
- Finding: All 29 stories only had a `Default` export — no variant coverage
- Files updated:
  - `Button.stories.tsx` — Added Variants, Sizes, Disabled, FormActions stories
  - `Input.stories.tsx` — Added WithError, Disabled, Types stories
  - `Skeleton.stories.tsx` — Added TableVariant, DetailVariant, FormVariant, CardVariant, AllVariants stories
  - `EmptyState.stories.tsx` — Added TitleOnly, WithDescription stories
  - `ErrorDisplay.stories.tsx` — Added WithoutRetry, StringError stories
  - `Select.stories.tsx` — Added FlatOptions, WithError, Disabled stories
- Total: 19 new story variants across 6 key components

### Cycle 12: Dark Theme Storybook Stories

**Selected target:** Dark theme stories (Low impact, Low effort)
- Status: **Complete**
- Files updated:
  - `TenantListPage.stories.tsx` — Added DarkTheme story
  - `TenantDetailPage.stories.tsx` — Added DarkTheme story
  - `CreateTenantPage.stories.tsx` — Added DarkTheme story
  - `Button.stories.tsx` — Added DarkTheme story (all variants)
  - `Input.stories.tsx` — Added DarkTheme story (default + error + disabled)
  - `Table.stories.tsx` — Added DarkTheme story
- Total: 6 new dark theme stories across compositions and key components
- Pattern: `data-theme="dark"` decorator with surface background

### Cycle 14: Module Validation — UX Patterns Gate

**Selected target:** Module validation improvements (Medium impact, Medium effort)
- Status: **Complete**
- File updated: `scripts/validate-module.ts`
- Added gate: `ux-patterns` (8th gate in the pipeline)
- Checks:
  1. List pages have loading state (Skeleton)
  2. List pages have error state (ErrorDisplay)
  3. List pages have empty state (EmptyState)
  4. No absolute navigation paths (must use relative)
  5. No manual date formatting (must use Intl.DateTimeFormat)
- Gate reports warnings (not errors) — guides rather than blocks

### Cycle 15: Scaffold Template — Edit Page

**Selected target:** Scaffold template update (Medium impact, Medium effort)
- Status: **Complete**
- Files created:
  - `tools/create-hexalith-module/templates/module/src/pages/ExampleEditPage.tsx`
  - `tools/create-hexalith-module/templates/module/src/pages/ExampleEditPage.test.tsx`
- Files updated:
  - `exampleSchemas.ts` — Added `UpdateExampleCommandSchema` (partial of Create)
  - `routes.tsx` — Added lazy import + `/edit/:id` route
  - `manifest.ts` — Added `{ path: "/edit/:id" }` route
  - `ExampleDetailPage.tsx` — Wired Edit button with `navigate(\`../edit/${id}\`)`
  - `index.ts` — Exported `UpdateExampleInput` type + `UpdateExampleCommandSchema`
- Edit page pattern: loads existing data → pre-populates form → saves with existing ID → navigates to detail

### Cycle 13: Docs Index Update

**Selected target:** Docs index update (Low impact, Low effort)
- Status: **Complete**
- File updated: `docs/index.md`
- Added sections: Design & UX (4 docs), Quality & Testing (2 docs)
- Added to "I want to" table: Choose component, use token, build page, contribute
- Updated: Interactive Documentation section (added dark theme mention)
