# AI Module Generation Pipeline

## Overview

The generation pipeline produces production-ready Hexalith frontend modules from domain descriptions. Generated modules pass the same quality gates as human-authored modules — no special exceptions.

## Pipeline Steps

1. **Domain Description** — Provide a domain description (e.g., "Order management with order list, order detail, and create order form") with entity names, commands, and projections.

2. **Prompt Template** — Use `prompts/new-module.md` with the domain description as input. The template references the knowledge bundle for API contracts, conventions, and patterns.

3. **AI Generation** — An AI agent reads the prompt template + knowledge bundle and generates the complete module: package config, schemas, pages, tests, dev-host, and sample data.

4. **Local Validation** — Run the validation script to verify all quality gates pass:
   ```bash
   pnpm check:validate-module modules/hexalith-{name}
   ```
   Gates (fail-fast order):
   - Dependency check: peerDependencies on shell-api, cqrs-client, ui
   - Build: TypeScript compilation via tsup
   - ESLint: import boundaries, naming, no direct Radix imports
   - Stylelint: design token compliance (no hardcoded colors/spacing)
   - Tests: Vitest with coverage >= 80%
   - Manifest: validateManifest from @hexalith/shell-api

5. **CI Pipeline** — The CI workflow includes an AI Module Validation step that runs the same validation script. See `.github/workflows/ci.yml`.

## UX Conformance

Generated modules must conform to the [UX Interaction Patterns](../../design-artifacts/C-UX-Scenarios/ux-interaction-patterns.md). This is not optional. Key requirements:

- Page templates (List, Detail, Create, Edit) follow the prescribed structure
- State handling order: loading → error → empty → data
- Navigation uses relative paths only
- Dates formatted with `Intl.DateTimeFormat`, currency with `Intl.NumberFormat`
- Status badges use CSS module variants with design tokens
- Forms use Zod schemas as single validation source

## Reference Module

The `modules/hexalith-orders` module is the reference AI-generated module. It demonstrates:
- Order list with Table, sorting, pagination, global search
- Order detail with DetailView sections and status badges
- Order creation with Form, useCommandPipeline, and status lifecycle
- Zod schemas with inferred types
- Complete test coverage (unit + component tests)
- Dev-host for standalone development with mock data

## Quality Gate Parity

AI-generated and human-authored modules pass identical gates:

| Gate | Threshold |
|------|-----------|
| TypeScript | 0 errors |
| ESLint | 0 violations |
| Stylelint | 100% token compliance |
| Test coverage | >= 80% branches/functions/lines/statements |
| Manifest validation | All fields valid |

## Validation Script

`scripts/validate-module.ts` validates any module in the workspace:

```bash
# Validate a specific module
pnpm check:validate-module modules/hexalith-orders

# Also works for human-authored modules
pnpm check:validate-module modules/hexalith-tenants
```

Output is structured text with PASS/FAIL per gate. Exit code: 0 (all pass) or 1 (any fail).
