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
| Create a new module         | [Getting Started](./getting-started.md)                                                               |
| Send a command              | [CQRS Guide — Commands](./cqrs-frontend-guide.md#commands)                                            |
| Query data                  | [CQRS Guide — Projections](./cqrs-frontend-guide.md#projections)                                      |
| Add a table, form, or page  | [Module Development — UI Patterns](./module-development.md#ui-component-patterns)                     |
| Write tests                 | [Module Development — Testing](./module-development.md#testing-strategy)                              |
| Publish my module           | [Module Development — Shell Integration](./module-development.md#shell-integration-via-git-submodule) |
| Look up a hook or component | [API Reference](./api-reference.md)                                                                   |

## Interactive documentation

- **Storybook** — Interactive component catalog with live examples, prop controls, and accessibility audits. Run with `pnpm storybook` (or `pnpm -F @hexalith/ui storybook`).
