# Contributing to Hexalith FrontShell

Thank you for your interest in contributing. This guide covers everything you need to get started.

## Code of Conduct

Be respectful, constructive, and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Git

### Setup

```bash
git clone https://github.com/Hexalith/Hexalith.FrontShell.git
cd Hexalith.FrontShell
pnpm install
pnpm build
pnpm test
```

### Run the shell locally

```bash
pnpm dev
```

## Project Structure

```
hexalith-frontshell/
├── apps/shell/              # Main shell application (Vite + React 19)
├── packages/
│   ├── shell-api/           # Contracts between shell and modules
│   ├── cqrs-client/         # CQRS hooks, command/query buses, SignalR
│   ├── ui/                  # Design system (Radix UI + CSS tokens)
│   ├── eslint-config/       # Shared ESLint rules
│   └── tsconfig/            # Shared TypeScript configs
├── modules/                 # Feature modules (plugin architecture)
├── tools/                   # Module scaffold CLI
├── docs/                    # Developer documentation
└── scripts/                 # Quality gate scripts
```

### How it works

Hexalith FrontShell is a **micro-frontend shell**. The shell handles cross-cutting concerns (auth, tenants, theming, routing). Modules are independently developed UIs that plug into the shell via manifests.

For a deeper understanding, see:
- [Getting Started](docs/getting-started.md) — Scaffold to shipping quickstart
- [Module Development](docs/module-development.md) — Full module lifecycle
- [CQRS Frontend Guide](docs/cqrs-frontend-guide.md) — Command/query patterns
- [API Reference](docs/api-reference.md) — Package export catalog
- [Testing Strategy](docs/testing-strategy.md) — Test pyramid and quality standards
- [UX Interaction Patterns](design-artifacts/C-UX-Scenarios/ux-interaction-patterns.md) — Mandatory page templates and conventions

## How to Contribute

### Types of Contributions

| Type | Where | Example |
|------|-------|---------|
| **New module** | `modules/` | Add a new domain UI (inventory, invoicing, etc.) |
| **UI component** | `packages/ui/` | Add or improve a design system component |
| **Platform feature** | `packages/shell-api/`, `packages/cqrs-client/` | New hook, provider, or contract |
| **Shell improvement** | `apps/shell/` | Layout, navigation, auth improvements |
| **Documentation** | `docs/` | Guides, examples, corrections |
| **Bug fix** | Anywhere | Fix issues across the codebase |
| **Tooling** | `tools/`, `scripts/` | Improve scaffold CLI, validation scripts |

### Contribution Workflow

1. **Check existing issues** — Look for open issues or discussions before starting
2. **Create a branch** — Branch from `main` with a descriptive name (`feat/add-inventory-module`, `fix/table-sort-bug`)
3. **Make your changes** — Follow the conventions below
4. **Run quality gates locally** before pushing:
   ```bash
   pnpm build && pnpm lint && pnpm test
   ```
5. **Open a pull request** — Include a clear description of what and why
6. **CI must pass** — All 15+ quality gates must be green

### Conventions

#### Code

- **TypeScript** for everything — strict mode enabled
- **Zod** for runtime validation — never TypeScript enums, use `z.union([z.literal(...)])`
- **Import ordering** — React → external → @hexalith/* → relative → CSS modules (enforced by ESLint)
- **Type imports** — Use `import type` for types, separated from value imports
- **No direct Radix imports** — Always use `@hexalith/ui` components (enforced by ESLint)
- **No hardcoded values** — Use design tokens for colors, spacing, typography (enforced by Stylelint)

#### Modules

All modules follow the [UX Interaction Patterns](design-artifacts/C-UX-Scenarios/ux-interaction-patterns.md):
- Page templates: List, Detail, Create, Edit
- State handling order: loading → error → empty → data
- Navigation: relative paths only
- Forms: Zod schema as single validation source
- Formatting: `Intl.DateTimeFormat` for dates, `Intl.NumberFormat` for currency

Use the scaffold CLI to start:
```bash
pnpm create-module my-module-name
```

See the [AI Knowledge Bundle](docs/ai-knowledge-bundle/index.md) for detailed generation guidance.

#### Testing

- Tests co-located with source files (never `__tests__/` directories)
- `.test.ts(x)` for unit tests (Vitest), `.spec.ts(x)` for E2E (Playwright)
- Coverage thresholds: **95%** for foundation packages, **80%** for modules
- ATDD gate: code changes in PRs must include tests
- See [Testing Strategy](docs/testing-strategy.md) for full details

#### Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Keep commits focused — one logical change per commit

### Quality Gates (CI)

Your PR must pass all gates:

| Gate | What it checks |
|------|----------------|
| Build | TypeScript compilation (0 errors) |
| ESLint | Import boundaries, naming, no direct Radix imports |
| Stylelint | Design token compliance (no hardcoded values) |
| Tests | Vitest with coverage thresholds |
| Test quality | Deterministic, isolated, explicit, focused, fast |
| ATDD compliance | Code changes must include tests |
| Manifest validation | Module manifests are valid |
| Scaffold smoke test | Module generator works |
| Bundle freshness | AI knowledge bundle matches current API |
| Storybook | Component catalog builds |
| Playwright CT | Component tests pass |
| Design system health | Token compliance verified |

### Adding a New Module

The fastest path:

1. `pnpm create-module your-module-name`
2. Edit the generated manifest, schemas, and pages for your domain
3. Run `pnpm check:validate-module modules/hexalith-your-module-name` to verify
4. Open a PR

See [Module Development](docs/module-development.md) for the full guide.

### Adding a UI Component

1. Create the component in `packages/ui/src/components/`
2. Use design tokens — no hardcoded colors/spacing
3. Add Storybook story (`.stories.tsx`)
4. Add tests (`.test.tsx` for unit, `.spec.tsx` for Playwright CT)
5. Export from `packages/ui/src/index.ts`
6. Update `docs/ai-knowledge-bundle/ui-components.md`

## Architecture Decisions

Key design choices and their rationale:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Module loading | Manifest-driven lazy loading | Modules are independent; shell discovers them via typed manifests validated at build time |
| State management | React Context + CQRS hooks | No global store (Redux/Zustand); shell contexts for cross-cutting concerns, CQRS hooks for domain data |
| Component library | Custom on Radix UI | Full control over design tokens and styling while leveraging accessible primitives |
| Styling | CSS Modules + design tokens | Scoped styles with enforced token usage; no CSS-in-JS runtime overhead |
| Validation | Zod (runtime) + TypeScript (compile) | Runtime validation ensures frontend matches backend schemas; compile-time types for DX |
| API pattern | CQRS (Command/Query separation) | Aligns with Hexalith's event-sourced backend; command pipeline with status polling + SignalR real-time |
| Testing | Vitest + Playwright + contracts | Fast unit tests, real browser component tests, and contract tests to prevent mock/real divergence |
| Monorepo | pnpm workspaces + Turborepo | Dependency management + cached parallel builds across packages |

## Need Help?

- Open a [GitHub Issue](https://github.com/Hexalith/Hexalith.FrontShell/issues) for bugs or feature requests
- Check existing [documentation](docs/index.md) for guides and references
- Read the [Product Vision](design-artifacts/A-Product-Brief/product-vision.md) to understand project direction
