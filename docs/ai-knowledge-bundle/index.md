# Hexalith AI Knowledge Bundle

version: 0.1.0
bundle_version: 0.1.0
last_synced: 2026-03-24

This bundle provides structured, machine-readable platform knowledge for AI agents generating Hexalith frontend modules. Read this file first, then follow links to specific sections.

## Sections

| Section            | File                                             | Description                                                      |
| ------------------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| Manifest Schema    | [manifest-schema.json](./manifest-schema.json)   | JSON Schema (draft 2020-12) for `ModuleManifestV1`               |
| Manifest Guide     | [manifest-guide.md](./manifest-guide.md)         | Field documentation, validation rules, examples, anti-patterns   |
| CQRS Hooks         | [cqrs-hooks.md](./cqrs-hooks.md)                 | All public CQRS hook APIs: signatures, usage, error handling     |
| UI Components      | [ui-components.md](./ui-components.md)           | Component catalog: props, usage examples, accessibility          |
| Conventions        | [conventions.md](./conventions.md)               | File naming, code naming, import ordering, organization rules    |
| Scaffold Structure | [scaffold-structure.md](./scaffold-structure.md) | Module directory layout, state handling patterns, page templates |
| Test Fixtures      | [test-fixtures.md](./test-fixtures.md)           | Mock implementations, test setup, AC marker convention           |
| Prompt Templates   | [prompts/index.md](./prompts/index.md)           | AI prompt templates for module, command, and projection generation |
| Generation Pipeline | [generation-pipeline.md](./generation-pipeline.md) | End-to-end generation workflow: domain → prompt → AI → validate → CI |

## How to Use This Bundle

1. Read this index to understand the bundle structure.
2. Generate a `ModuleManifestV1` conforming to `manifest-schema.json`.
3. Use hooks from `cqrs-hooks.md` for commands, queries, and real-time updates.
4. Use components from `ui-components.md` — import from `@hexalith/ui`, never `@radix-ui/*`.
5. Follow naming and file organization rules from `conventions.md`.
6. Match the scaffold structure from `scaffold-structure.md`.
7. Write tests using fixtures from `test-fixtures.md`.

## Related Documentation

- [Getting Started](../getting-started.md) — Scaffold to shipping quickstart
- [Module Development](../module-development.md) — Full module lifecycle reference
- [CQRS Frontend Guide](../cqrs-frontend-guide.md) — CQRS pattern for frontend developers
- [API Reference](../api-reference.md) — Complete export catalog for all `@hexalith/*` packages
- [Testing Strategy](../testing-strategy.md) — Test pyramid, quality standards, contract testing
