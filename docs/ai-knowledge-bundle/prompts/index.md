# AI Prompt Templates

<!-- Verified against bundle v0.1.0 -->

Structured prompt templates for AI-assisted Hexalith module generation. Each template accepts domain-specific inputs and produces code that follows all platform conventions.

## Template Inventory

| Template       | File                                     | Purpose                                                                                               |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| New Module     | [new-module.md](./new-module.md)         | Generate a complete module from a domain description (manifest, schemas, pages, hooks, tests, routes) |
| Add Command    | [add-command.md](./add-command.md)       | Add a new command (Zod schema, form page, route, test) to an existing module                          |
| Add Projection | [add-projection.md](./add-projection.md) | Add a projection (Zod schemas, list page, detail page, routes, tests) to an existing module           |

## Usage

1. Choose the template matching your scenario.
2. Provide the input parameters listed in the template.
3. Answer any clarifying questions the AI agent asks.
4. The AI agent generates files following the template instructions, referencing the [Knowledge Bundle](../index.md) for API contracts and conventions.
5. Run the quality checklist at the end of each template before considering generation complete.

## Scope

These templates generate **entity-based CRUD modules** (list, detail, create pages). They do **not** cover:

- Dashboards or analytics views
- Wizards or multi-step workflows
- File upload interfaces
- Real-time streaming views

For non-CRUD modules, use the scaffold CLI (`pnpm create hexalith-module`) and customize manually.

## Knowledge Bundle References

All templates reference these bundle files as the single source of truth:

- [manifest-schema.json](../manifest-schema.json) — Manifest JSON Schema
- [manifest-guide.md](../manifest-guide.md) — Manifest field documentation
- [cqrs-hooks.md](../cqrs-hooks.md) — Hook API signatures and usage
- [ui-components.md](../ui-components.md) — Component catalog and props
- [conventions.md](../conventions.md) — Naming and file organization rules
- [scaffold-structure.md](../scaffold-structure.md) — Module directory layout
- [test-fixtures.md](../test-fixtures.md) — Mock implementations and test setup
