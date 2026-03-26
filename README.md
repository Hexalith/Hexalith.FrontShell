# Hexalith FrontShell

A unified micro-frontend shell for composing independently developed application modules into a single, consistent user interface.

**One shell. Any module. Consistent experience.**

## What is FrontShell?

Hexalith FrontShell is a host application that handles cross-cutting concerns — authentication, multi-tenancy, theming, routing, and real-time updates — so that module developers can focus entirely on domain logic.

Any microservice can provide a UI module. Modules plug into the shell via typed manifests, inherit the design system, and communicate with backends through a standardized CQRS client. The result is a unified application where every module looks and behaves consistently, regardless of who built it.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite + Turborepo + pnpm workspaces |
| Styling | CSS Modules + design tokens (Radix UI primitives) |
| State | React Context (shell) + CQRS hooks (modules) |
| Real-time | SignalR with polling fallback |
| Auth | OIDC (configurable provider) |
| Testing | Vitest + Playwright + contract tests |

## Project Structure

```
hexalith-frontshell/
├── apps/shell/              # Shell application
├── packages/
│   ├── shell-api/           # Contracts between shell and modules
│   ├── cqrs-client/         # CQRS hooks, command/query buses, SignalR
│   ├── ui/                  # Design system (~20 components, tokens, Storybook)
│   ├── eslint-config/       # Shared linting rules
│   └── tsconfig/            # Shared TypeScript configs
├── modules/                 # Feature modules (plugin architecture)
│   ├── hexalith-orders/     # Order management
│   ├── hexalith-tenants/    # Multi-tenant administration
│   └── ...
├── tools/                   # Module scaffold CLI
└── docs/                    # Developer documentation
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)

### Run locally

```bash
git clone https://github.com/Hexalith/Hexalith.FrontShell.git
cd Hexalith.FrontShell
pnpm install
pnpm dev
```

### Create a new module

```bash
pnpm create-module my-module-name
```

This scaffolds a complete module with manifest, pages, schemas, tests, and a standalone dev-host. See [Getting Started](docs/getting-started.md) for the full guide.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Scaffold to shipping in 30 minutes |
| [Module Development](docs/module-development.md) | Full module lifecycle reference |
| [CQRS Frontend Guide](docs/cqrs-frontend-guide.md) | Command/query patterns for frontend |
| [API Reference](docs/api-reference.md) | Complete export catalog for all packages |
| [Testing Strategy](docs/testing-strategy.md) | Test pyramid, quality standards, contract testing |
| [Product Vision](design-artifacts/A-Product-Brief/product-vision.md) | Strategic direction and roadmap |
| [UX Patterns](design-artifacts/C-UX-Scenarios/ux-interaction-patterns.md) | Mandatory page templates and conventions |
| [Component Guidelines](design-artifacts/D-Design-System/component-usage-guidelines.md) | When and why to use each component |
| [AI Knowledge Bundle](docs/ai-knowledge-bundle/index.md) | AI-assisted module generation reference |

## Quality

All code passes 15+ automated quality gates:

- TypeScript strict mode (0 errors)
- ESLint with import boundaries and module isolation
- Stylelint enforcing design token compliance
- Test coverage: 95% foundation packages, 80% modules
- ATDD compliance (code changes require tests)
- Visual regression screenshots (Playwright)
- Design system health checks
- Module manifest validation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, workflow, and architecture decisions.

## License

[MIT](LICENSE)
