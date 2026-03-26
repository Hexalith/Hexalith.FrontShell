# Hexalith Module Developer Documentation

Welcome to the Hexalith module developer documentation. These guides cover everything you need to build, test, and ship a frontend module.

## Guides

- **[Getting Started](./getting-started.md)** — Scaffold to shipping in 30 minutes. Prerequisites, registry access, scaffold CLI, dev host, first modifications, testing, and shell integration.

- **[Module Development](./module-development.md)** — Full lifecycle reference. Manifest definition, CQRS hooks, UI component patterns, Zod schemas, testing strategy, dev host, and shell integration.

- **[CQRS for Frontend Developers](./cqrs-frontend-guide.md)** — Commands, projections, error handling, and the command lifecycle. Explains the CQRS pattern from a frontend perspective — no backend expertise required.

- **[API Reference](./api-reference.md)** — Complete export catalog for `@hexalith/shell-api`, `@hexalith/cqrs-client`, and `@hexalith/ui`.

## I want to

| Task                        | Guide                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| Create a new module         | [Getting Started](./getting-started.md) or [Build Your First Module](./tutorials/build-your-first-module.md) |
| Send a command              | [CQRS Guide — Commands](./cqrs-frontend-guide.md#commands)                                            |
| Query data                  | [CQRS Guide — Projections](./cqrs-frontend-guide.md#projections)                                      |
| Add a table, form, or page  | [Module Development — UI Patterns](./module-development.md#ui-component-patterns)                     |
| Write tests                 | [Module Development — Testing](./module-development.md#testing-strategy)                              |
| Write E2E or component tests| [E2E & Component Testing Guide](./e2e-testing-guide.md)                                               |
| Understand bundle optimization | [Performance & Bundle Optimization Guide](./performance-guide.md)                                  |
| Publish my module           | [Module Development — Shell Integration](./module-development.md#shell-integration-via-git-submodule) |
| Look up a hook or component | [API Reference](./api-reference.md)                                                                   |
| Choose the right component  | [Component Usage Guidelines](../design-artifacts/D-Design-System/component-usage-guidelines.md)       |
| Use a design token          | [Design Token Reference](../design-artifacts/D-Design-System/design-token-reference.md)               |
| Build a page correctly      | [UX Interaction Patterns](../design-artifacts/C-UX-Scenarios/ux-interaction-patterns.md)              |
| Contribute to the platform  | [CONTRIBUTING.md](../CONTRIBUTING.md)                                                                 |

## Design & UX

- **[Product Vision](../design-artifacts/A-Product-Brief/product-vision.md)** — Strategic direction, priorities, and roadmap for Hexalith FrontShell.

- **[UX Interaction Patterns](../design-artifacts/C-UX-Scenarios/ux-interaction-patterns.md)** — Mandatory page templates (List, Detail, Create, Edit), state handling, navigation, forms, CQRS integration, and styling rules.

- **[Design Token Reference](../design-artifacts/D-Design-System/design-token-reference.md)** — Complete catalog of CSS custom properties: colors, spacing, typography, motion, radius, z-index, and shadows.

- **[Component Usage Guidelines](../design-artifacts/D-Design-System/component-usage-guidelines.md)** — Decision trees, composition recipes, variant guides, and common mistakes.

## Quality & Testing

- **[Testing Strategy](./testing-strategy.md)** — Test pyramid, quality standards, AC markers, and contract testing approach.

- **[E2E & Component Testing Guide](./e2e-testing-guide.md)** — Playwright E2E and component tests: configuration, mock providers, visual regression, accessibility validation, CI integration, and how to add tests for new modules.

- **[Accessibility Audit](../design-artifacts/F-Testing/accessibility-audit.md)** — WCAG 2.1 AA compliance report — fully compliant.

## Performance

- **[Performance & Bundle Optimization Guide](./performance-guide.md)** — Chunk splitting, lazy loading, caching strategy, Turborepo, CI performance gates, Docker build, and font loading.

## Tutorials

- **[Build Your First Module](./tutorials/build-your-first-module.md)** — Step-by-step walkthrough: scaffold a module, customize the domain, wire sample data, write tests, and verify in the dev host. ~45 minutes.

## AI Module Generation

- **[AI Knowledge Bundle](./ai-knowledge-bundle/index.md)** — Structured, machine-readable platform knowledge for AI agents. Includes manifest schema (JSON Schema), CQRS hook APIs, UI component catalog, naming conventions, scaffold structure, and test fixtures. Use this bundle when generating modules with AI assistance.

## Interactive Documentation

- **Storybook** — Interactive component catalog with live examples, prop controls, accessibility audits, and dark theme previews. Run with `pnpm storybook` (or `pnpm -F @hexalith/ui storybook`).
