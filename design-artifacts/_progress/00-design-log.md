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
