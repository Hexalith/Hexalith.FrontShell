# Story 7.2: AI Prompt Templates

Status: done

## Story

As a developer using AI tools for module generation,
I want prompt templates optimized for generating correct FrontShell modules,
so that I can generate modules by providing a domain description without crafting prompts from scratch.

## Acceptance Criteria

1. **New Module Template** — Given prompt templates are created in the repository, when a developer uses the "new module" template, then the template accepts: module name, domain description, entity list, command list, and projection list. The template references the knowledge bundle for schema and API details. The template includes instructions for: manifest creation, Zod schema definition, page generation, hook integration, and test generation.

2. **Template Collection** — Given prompt templates exist for common generation scenarios, when reviewing the template collection, then templates include:
   - **New module from domain description** — generates complete module with pages, schemas, hooks, tests
   - **Add command to existing module** — generates command type, form page, useCommandPipeline integration
   - **Add projection page** — generates Zod schema, list page with Table, detail page with DetailView
   - Each template produces output that follows all naming and structure conventions.

3. **Quality Guidance** — Given the templates include quality guidance, when an AI agent follows the template, then generated code includes: loading states (`<Skeleton>`), error states (`<ErrorDisplay>`), empty states (`<EmptyState>`). All forms use Zod schemas as the single source of validation truth. No inline styles, no direct Radix imports, no TypeScript enums are generated.

4. **Template Maintenance** — Given the templates are maintained, when the platform API or conventions change, then templates are updated and tested — stale templates that produce non-compiling output are a P1 bug.

## Tasks / Subtasks

- [x] Task 1: Create prompt template directory structure and index (AC: #1, #2)
  - [x] Create `docs/ai-knowledge-bundle/prompts/` directory
  - [x] Create `docs/ai-knowledge-bundle/prompts/index.md` with template inventory and usage guide
  - [x] Update `docs/ai-knowledge-bundle/index.md` to reference the prompts section

- [x] Task 2: Create "New Module" prompt template (AC: #1, #3)
  - [x] Create `docs/ai-knowledge-bundle/prompts/new-module.md`
  - [x] Include input parameters section: module name (kebab-case), domain description, entity list (PascalCase names, e.g., "OrderItem" not "orderItem"), command list, projection list
  - [x] Include "Clarifying Questions" section: instruct AI to ask user about ambiguous domain aspects before generating (e.g., status fields and valid values, optional vs required fields, entity relationships, date/timestamp fields)
  - [x] Include reserved module name list: `shell`, `shell-api`, `cqrs-client`, `ui`, `tsconfig`, `eslint-config` cannot be used
  - [x] Include manifest generation instructions referencing `manifest-schema.json` and `manifest-guide.md`
  - [x] Include Zod schema generation instructions with domain-specific field patterns
  - [x] Include domain modeling guidance: how to handle nested entities (separate schemas), one-to-many relationships (array fields in detail schema), optional fields (`z.optional()`), and status/enum fields (`z.union([z.literal(...)])`)
  - [x] Include page generation instructions for list, detail, and create pages — code-first with code skeletons, not prose-first
  - [x] Include hook integration instructions (useQuery, useCommandPipeline, useToast)
  - [x] Include destructive operation guidance: delete/remove commands must use `<AlertDialog>` for confirmation before sending
  - [x] Include test generation instructions with MockQueryBus/MockCommandBus patterns
  - [x] Include routes.tsx and index.ts generation with lazy loading
  - [x] Include dev-host mockSetup.ts generation with sample data
  - [x] Include CSS Module file generation with design tokens only
  - [x] Embed quality rules: loading/error/empty states, no inline styles, no direct Radix, no enums
  - [x] Embed quality checklist items: all user-facing text (page titles, toasts, empty states, button labels) must use domain-specific language — not generic placeholders like "Item created" or "No items yet"
  - [x] Embed quality checklist item: every route in manifest.ts must have a matching lazy import in routes.tsx (manifest-to-routes consistency)
  - [x] Embed quality checklist item: CSS class names in `.module.css` files must be camelCase (e.g., `.statusBadge` not `.status-badge`)
  - [x] Include a "Limitations" note: these templates generate entity-based CRUD modules only; dashboards, wizards, file uploads, multi-step workflows, and real-time streaming views are not covered
  - [x] Include a complete worked example: full "Input → Output" demonstration (e.g., given "Task management with tasks and projects," show the complete generated manifest, schemas, one page, and one test file)

- [x] Task 3: Create "Add Command" prompt template (AC: #2, #3)
  - [x] Create `docs/ai-knowledge-bundle/prompts/add-command.md`
  - [x] Include input parameters: command name, fields/payload, domain name, target module path
  - [x] Include "Clarifying Questions" section: instruct AI to ask about field types, validation rules, and whether the command is destructive
  - [x] Include Zod command schema generation instructions
  - [x] Include form page generation with useCommandPipeline, Form, FormField, status feedback — code-first with code skeleton
  - [x] Include destructive operation guidance: if command is destructive (delete, remove, disable), wrap trigger in `<AlertDialog>` confirmation
  - [x] Include route addition instructions (manifest routes + routes.tsx + lazy import)
  - [x] Include test generation for the form page
  - [x] Include index.ts re-export updates

- [x] Task 4: Create "Add Projection Page" prompt template (AC: #2, #3)
  - [x] Create `docs/ai-knowledge-bundle/prompts/add-projection.md`
  - [x] Include input parameters: projection name, fields, domain, query type, target module path
  - [x] Include Zod schema generation (list item + detail schemas)
  - [x] Include list page generation with Table, useQuery, column definitions
  - [x] Include detail page generation with DetailView, useQuery with aggregateId
  - [x] Include route additions and lazy imports
  - [x] Include test generation for both pages

- [x] Task 5: Add template completeness check to freshness script (AC: #4)
  - [x] Extend `scripts/check-bundle-freshness.ts` to verify all 3 prompt template files exist
  - [x] Verify each template references current hook names (useSubmitCommand, useCommandPipeline, useQuery)
  - [x] Verify each template references current component names from @hexalith/ui
  - [x] Verify hook parameter signatures in template code examples match actual hook exports (not just name presence — check that `useQuery` examples show `(schema, params, options)` shape, `useCommandPipeline` examples show `{ send, status, error }` return shape)
  - [x] Add WARN if template files haven't been updated since last bundle version bump

- [x] Task 6: Update documentation cross-references (AC: #1, #4)
  - [x] Update `docs/module-development.md` to reference prompt templates
  - [x] Update `docs/ai-knowledge-bundle/index.md` with prompts section entry
  - [x] Update `CLAUDE.md` if needed for prompt template awareness

- [x] Task 7: Final verification (AC: #1, #2, #3, #4)
  - [x] Run `pnpm check:bundle-freshness` — must pass with template checks
  - [x] Verify each template references the knowledge bundle sections correctly
  - [x] Verify no existing tests regressed
  - [x] Verify templates produce code matching scaffold template patterns exactly

## Dev Notes

### Critical Context from Story 7-1

Story 7-1 created the knowledge bundle in `docs/ai-knowledge-bundle/` with 8 files. The prompt templates MUST reference these files — they are the single source of truth for API contracts, component props, naming conventions, and scaffold structure.

**Key lesson from 7-1**: Architecture descriptions can differ from actual implementations. The knowledge bundle was built by reading actual source code, not architecture docs. Prompt templates MUST reference the knowledge bundle (which reflects reality), NOT the architecture doc or epics.

**Hook name mapping** (epic shorthand → actual names):

- `useCommand` → `useSubmitCommand` (fire-and-forget) or `useCommandPipeline` (recommended, full lifecycle)
- `useProjection` → `useQuery` (with Zod schema validation)
- Status transitions: `idle → sending → polling → completed | rejected | failed | timedOut`

### What Prompt Templates Are (and Are Not)

**ARE**: Markdown instruction documents that an AI agent reads to understand HOW to generate correct FrontShell module code. They are structured prompts with input parameters, step-by-step generation instructions, code patterns to follow, and anti-patterns to avoid.

**ARE NOT**: Scaffold code templates (those already exist in `tools/create-hexalith-module/templates/module/`). The CLI scaffold uses string replacement (`__MODULE_NAME__` → actual name). Prompt templates are higher-level — they tell an AI agent how to generate domain-specific code from a business description, not just rename placeholders.

**Difference from scaffold**: The scaffold produces generic "Example" entity code. Prompt templates instruct AI to generate domain-specific entities, schemas, pages, and tests based on a real domain description (e.g., "Order management with OrderList, OrderDetail, CreateOrder").

### Template Structure Pattern

Each prompt template should follow this structure:

1. **Purpose** — What this template generates
2. **Input Parameters** — What the user provides (with examples)
3. **Clarifying Questions** — Questions the AI agent should ask the user before generating (ambiguous domain aspects, field types, relationships, destructive operations)
4. **Knowledge Bundle References** — Which bundle files to read for contracts
5. **Generation Instructions** — Step-by-step file generation, **code-first** (lead with code skeletons/blocks showing the target output pattern, then explain variations — AI agents perform best with concrete examples, not abstract prose)
6. **Complete Worked Example** — Full input→output demonstration for the primary scenario (e.g., "Task management" domain → complete manifest + schema + one page + one test). This single example is worth more than pages of instructions.
7. **Quality Checklist** — Mandatory checks before considering generation complete (including: destructive operations wrapped in `<AlertDialog>`, all three states handled, no reserved module names)
8. **Anti-Patterns** — Specific mistakes to avoid

**Template length target:** ~2000 words per template. Front-load the most critical instructions (manifest, schemas, state handling). Put conventions and anti-patterns at the end as a checklist. AI agents lose accuracy when templates are too long — token budget matters.

### Code Patterns to Embed in Templates

Templates MUST instruct AI agents to generate code matching these exact patterns from the scaffold. Each pattern below should appear as a **code skeleton** in the template (AI agents learn best from concrete code, not prose descriptions).

For patterns without inline code blocks below, the dev agent MUST read the corresponding scaffold file and create a code skeleton from it. The scaffold files are the canonical source of truth.

**Manifest pattern** (`manifest.ts`):

```typescript
import type { ModuleManifest } from "@hexalith/shell-api";
export const manifest: ModuleManifest = {
  manifestVersion: 1,
  name: "{kebab-case-name}",
  displayName: "{Display Name}",
  version: "0.1.0",
  routes: [{ path: "/" }, { path: "/detail/:id" }, { path: "/create" }],
  navigation: [
    { label: "{Display Name}", path: "/", icon: "{icon}", category: "Modules" },
  ],
};
```

**Zod schema pattern** (`schemas/{domain}Schemas.ts`):

```typescript
import { z } from "zod";
// Reusable field schemas at top
const IdentifierSchema = z.string().uuid("ID must be a valid UUID");
// List item schema
export const {Entity}ItemSchema = z.object({ ... });
export type {Entity}Item = z.infer<typeof {Entity}ItemSchema>;
// Detail schema extends list schema
export const {Entity}DetailSchema = {Entity}ItemSchema.extend({ ... });
// Command schema
export const Create{Entity}CommandSchema = z.object({ ... });
```

**Field-type-to-component mapping** (for form page generation):

| Zod Field Type                    | UI Component   | Notes                                  |
| --------------------------------- | -------------- | -------------------------------------- |
| `z.string()` (short)              | `<Input>`      | Default for strings ≤200 chars         |
| `z.string()` (long, `.max(500+)`) | `<TextArea>`   | Use `rows={3}` default                 |
| `z.union([z.literal(...)])`       | `<Select>`     | Map literals to `options` array        |
| `z.string().datetime()`           | `<DatePicker>` | For date/timestamp fields              |
| `z.boolean()`                     | `<Checkbox>`   | With label prop                        |
| `z.string().uuid()`               | —              | Not rendered in forms (auto-generated) |

**DetailView section grouping rule:**

- **Primary section** ("General Information"): All domain-specific fields (name, status, category, etc.)
- **Audit Trail section**: Timestamps (createdAt, updatedAt) and system fields (createdBy, id)
- Additional sections for logical groupings if entity has 8+ fields

**List page pattern** — read and match: `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.tsx`

- Import order: react → react-router → zod → @hexalith/cqrs-client → @hexalith/ui → type imports → relative CSS → relative schemas
- `const ListSchema = z.array(ItemSchema)` at module scope
- Query params as `const` at module scope for referential stability
- Column definitions with `satisfies TableColumn<T>[]`
- Three-state rendering: `isLoading → Skeleton`, `error → ErrorDisplay`, `!data.length → EmptyState`, then `Table`
- `useCallback` for handlers with navigate dependency
- Table MUST include these props: `sorting`, `pagination={{ pageSize: 10 }}`, `globalSearch`, `onRowClick={handleRowClick}`, `caption="{Display Name} items"` — these ensure consistent UX across all generated modules

**Detail page pattern** — read and match: `tools/create-hexalith-module/templates/module/src/pages/ExampleDetailPage.tsx`

- `useParams` for route parameter extraction
- Query params builder function (not const, because aggregateId varies)
- `{ enabled: !!id }` option on useQuery
- `DetailView` with sections array — group fields per section grouping rule above
- Three-state rendering: loading/error/null-data guards

**Create page pattern** — read and match: `tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx`

- `useCommandPipeline` for command lifecycle
- `useEffect` watching `status === "completed"` for success toast + navigation
- `Form` wrapping `FormField` wrapping input components — use field-type-to-component mapping above
- `handleSubmit` async callback with `send()` including `commandType`, `domain`, `aggregateId: crypto.randomUUID()`, `payload`
- Status message display for sending/polling/rejected/failed/timedOut
- `isBusy` derived from status for button disable

**Routes pattern** — read and match: `tools/create-hexalith-module/templates/module/src/routes.tsx`

- `lazy()` imports for all pages with `.then(m => ({ default: m.PageName }))`
- `Suspense` wrapper component with `<Skeleton variant="card" />` fallback
- Route array matching manifest routes — **every route in manifest must have a matching lazy import**

**Index pattern** — read and match: `tools/create-hexalith-module/templates/module/src/index.ts`

- Default export of root page from routes
- Named exports: `manifest`, `routes`
- Type re-exports from schemas
- Schema re-exports from schemas

**Test pattern** — read and match: `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.test.tsx`

- `import { describe, it, expect } from "vitest"`
- `import { screen, waitFor } from "@testing-library/react"`
- `MockQueryBus` with configurable delay and responses
- `createMockTenantContext` for tenant ID
- Query key format: `{tenant}:{domain}:{queryType}:{aggregateId}:{entityId}`
- `renderWithProviders` helper — **copy verbatim from scaffold** (`tools/create-hexalith-module/templates/module/src/testing/renderWithProviders.tsx`), only changing entity-specific imports
- Test mock data MUST validate against the Zod schema — verify mentally that mock objects satisfy all required fields
- Test cases: loading state, data rendering, empty state, error state

### File Locations

**New files to create:**

```
docs/ai-knowledge-bundle/prompts/
├── index.md           # Template inventory and usage guide
├── new-module.md      # Complete module generation prompt
├── add-command.md     # Add command to existing module prompt
└── add-projection.md  # Add projection pages to existing module prompt
```

**Files to modify:**

- `docs/ai-knowledge-bundle/index.md` — add Prompts section entry
- `scripts/check-bundle-freshness.ts` — add template file existence + content checks
- `docs/module-development.md` — add prompt templates cross-reference

### Scope Boundaries & Architecture Compliance

- **Edit pages are OUT OF SCOPE** for the add-command template. The scaffold includes create but not edit. The tenants reference module has an edit page, but that pattern is a variation of create — it can be added as a separate template in a future story if needed.
- **Non-CRUD modules are OUT OF SCOPE** — these templates generate entity-based CRUD modules (list/detail/create pages). For dashboard-only, analytics, wizards, file uploads, multi-step workflows, or real-time streaming views, use the scaffold CLI directly (`pnpm create-module`) and customize manually.
- **Automated generation testing is OUT OF SCOPE** — story 7-3 (AI Generation Pipeline & Quality Gate Pass-Through) will validate that AI-generated output from these templates actually compiles and passes CI gates. This story validates template _content correctness_ (references, patterns, conventions), not template _output correctness_.
- **No source code changes** — this story only creates/modifies docs and scripts. No new runtime dependencies.
- **Bundle location**: `docs/ai-knowledge-bundle/prompts/` (within the knowledge bundle directory per architecture)
- **Template format**: Markdown (LLM-friendly, matches bundle format from 7-1). Extended freshness script catches stale templates in CI.

### Library/Framework Requirements

- **No new libraries needed** — templates are pure Markdown documents
- **Freshness script**: continues to use Node.js built-ins + `tsx` runner (pattern from 7-1)
- Templates MUST reference these exact library versions/imports:
  - `@hexalith/shell-api` — `ModuleManifest` type
  - `@hexalith/cqrs-client` — `useQuery`, `useCommandPipeline`, `useSubmitCommand`, `useCommandStatus`, `MockCommandBus`, `MockQueryBus`
  - `@hexalith/ui` — `PageLayout`, `Table`, `DetailView`, `Form`, `FormField`, `Input`, `Select`, `TextArea`, `Button`, `Skeleton`, `ErrorDisplay`, `EmptyState`, `Inline`, `useToast`, `Checkbox`, `DatePicker` (and `TableColumn` type)
  - `zod` — `z.object()`, `z.string()`, `z.union()`, `z.literal()`, `z.array()`, `z.infer`
  - `react-router` — `useNavigate`, `useParams`

### Testing Requirements

- **No new test files** — this story produces documentation and script extension
- Run `pnpm check:bundle-freshness` after all template files are created — must PASS
- Temporarily rename a template file and verify freshness script reports FAIL (then restore)
- All existing tests must continue to pass (zero regressions)

### Additional Scaffold Files to Read During Implementation

The following scaffold template files contain patterns needed for template generation instructions but are not shown inline in this story. The dev agent MUST read these during implementation:

- `tools/create-hexalith-module/templates/module/src/testing/renderWithProviders.tsx` — test wrapper with all required providers; templates should instruct AI to **copy this file verbatim** into generated modules (only changing entity-specific imports)
- `tools/create-hexalith-module/templates/module/src/data/sampleData.ts` — realistic mock data pattern (needed for new-module template dev-host/mockSetup instructions)
- `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.module.css` — CSS Module pattern with design tokens (needed for page generation CSS instructions)

### Code Examples in Templates — Freshness Note

Code examples embedded in prompt template Markdown files are invisible to TypeScript compilation. When writing code examples in templates, add a comment at the top of each template noting the bundle version the examples were verified against (e.g., `<!-- Verified against bundle v0.1.0 -->`). This helps future maintainers identify stale examples when the bundle version bumps.

### Anti-Patterns to Prevent

1. **DO NOT** create templates that just copy scaffold placeholders — templates must instruct AI to generate domain-specific code from business descriptions
2. **DO NOT** embed outdated hook names — use actual exports: `useQuery` not `useProjection`, `useCommandPipeline` not `useCommand`
3. **DO NOT** create monolithic templates — keep each scenario in its own focused file
4. **DO NOT** hardcode component props — reference `docs/ai-knowledge-bundle/ui-components.md` for current props
5. **DO NOT** skip the quality checklist section — every template must end with mandatory checks
6. **DO NOT** reference architecture.md for API details — reference the knowledge bundle files (source-verified in 7-1)
7. **DO NOT** forget state handling — every page must show Skeleton/ErrorDisplay/EmptyState
8. **DO NOT** use TypeScript enums — always use union types with `z.literal()` values
9. **DO NOT** import directly from `@radix-ui/*` — always use `@hexalith/ui` components
10. **DO NOT** use inline styles — use CSS Modules with `--hx-*` design tokens only

### Previous Story Intelligence & Codebase State

**From Story 7-1 implementation:**

- Knowledge bundle files were created by reading actual source code (packages/shell-api, packages/cqrs-client, packages/ui), not by copying from architecture docs
- Hook naming: epics use shorthand `useCommand`/`useProjection` but actual exports are `useSubmitCommand`, `useCommandPipeline`, `useQuery`, etc.
- Three provider-level hooks (`useCqrs`, `useQueryClient`, `useSignalRHub`) were discovered during implementation that weren't in epics — templates should NOT instruct generation of code using these internal hooks
- Freshness script pattern: TypeScript via tsx runner, text output with PASS/WARN/FAIL, reads package.json versions, reads source exports, exit code 1 on failure
- Bundle content priority for AI generation quality: manifest schema > hook API signatures > state handling patterns > component props > naming conventions > scaffold structure — prompt templates should follow this same priority
- Pre-existing issues (not caused by 7-1, not to fix in 7-2): CSS layer test timeout in @hexalith/ui, import ordering lint issue in tenants module

**Codebase state:** Test fixtures (MockCommandBus, MockQueryBus, MockShellProvider) and error hierarchy (HexalithError subtypes) are in place and stable for template reference (confirmed by recent commits `6e3a3bd` and `5640b26`).

### References

- [Source: docs/ai-knowledge-bundle/index.md] — Knowledge bundle master index (add prompts section)
- [Source: docs/ai-knowledge-bundle/manifest-schema.json] — JSON Schema for ModuleManifestV1 (referenced by new-module template)
- [Source: docs/ai-knowledge-bundle/manifest-guide.md] — Manifest field docs (referenced by new-module template)
- [Source: docs/ai-knowledge-bundle/cqrs-hooks.md] — Hook API reference (referenced by all templates)
- [Source: docs/ai-knowledge-bundle/ui-components.md] — Component catalog (referenced by all templates)
- [Source: docs/ai-knowledge-bundle/conventions.md] — Naming conventions (referenced by all templates)
- [Source: docs/ai-knowledge-bundle/scaffold-structure.md] — Module directory structure (referenced by new-module template)
- [Source: docs/ai-knowledge-bundle/test-fixtures.md] — Mock APIs (referenced by all templates)
- [Source: tools/create-hexalith-module/templates/module/] — Scaffold template files (canonical code patterns)
- [Source: tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.tsx] — List page pattern
- [Source: tools/create-hexalith-module/templates/module/src/pages/ExampleDetailPage.tsx] — Detail page pattern
- [Source: tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx] — Create/form page pattern
- [Source: tools/create-hexalith-module/templates/module/src/schemas/exampleSchemas.ts] — Zod schema pattern
- [Source: tools/create-hexalith-module/templates/module/src/routes.tsx] — Routes with lazy loading pattern
- [Source: tools/create-hexalith-module/templates/module/src/index.ts] — Module entry point pattern
- [Source: tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.test.tsx] — Test pattern with MockQueryBus
- [Source: scripts/check-bundle-freshness.ts] — Freshness validation script (extend for templates)
- [Source: _bmad-output/implementation-artifacts/7-1-machine-readable-knowledge-bundle.md] — Previous story learnings
- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 7 story 7-2 acceptance criteria (FR45)
- [Source: _bmad-output/planning-artifacts/architecture.md] — Architecture constraints for AI generation

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Created 3 AI prompt templates (new-module, add-command, add-projection) in `docs/ai-knowledge-bundle/prompts/`
- Each template follows the prescribed structure: Purpose, Input Parameters, Clarifying Questions, Knowledge Bundle References, Generation Instructions (code-first with skeletons), Quality Checklist, Anti-Patterns
- new-module.md includes a complete worked example (Task Management domain) showing manifest, schemas, list page excerpt, and test excerpt
- All templates reference the knowledge bundle files as single source of truth — never architecture.md
- All code skeletons match actual scaffold template patterns (verified against `tools/create-hexalith-module/templates/module/`)
- Extended `scripts/check-bundle-freshness.ts` with Section 7 (Prompt Templates): file existence, hook name references, component references, hook parameter signature verification, and template freshness warning
- `pnpm check:bundle-freshness` passes with all template checks green
- All existing tests pass (466/467 — 1 pre-existing CSS layer timeout in @hexalith/ui, documented in story Dev Notes)
- Updated cross-references in `docs/ai-knowledge-bundle/index.md`, `docs/module-development.md`, and `CLAUDE.md`
- Code review follow-up fixed prompt defects: corrected dev-host mock setup path, corrected detail navigation examples, removed malformed template-literal placeholders from test examples, and updated outdated scaffold CLI command references
- Strengthened `scripts/check-bundle-freshness.ts` to validate prompt-template structure and quality across all templates, including component references, hook signatures, malformed placeholder detection, detail-route navigation, dev-host path guidance, and scaffold command drift

### File List

**New files:**

- `docs/ai-knowledge-bundle/prompts/index.md` — Template inventory and usage guide
- `docs/ai-knowledge-bundle/prompts/new-module.md` — Complete module generation prompt template
- `docs/ai-knowledge-bundle/prompts/add-command.md` — Add command to existing module prompt template
- `docs/ai-knowledge-bundle/prompts/add-projection.md` — Add projection pages to existing module prompt template

**Modified files:**

- `docs/ai-knowledge-bundle/index.md` — Added Prompt Templates section entry to bundle index
- `scripts/check-bundle-freshness.ts` — Added Section 7: prompt template file existence, hook/component reference checks, signature verification, freshness warning
- `docs/module-development.md` — Added prompt templates cross-reference to AI-assisted generation callout
- `CLAUDE.md` — Added prompt template directory reference to AI knowledge bundle entry
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated 7-2 status: ready-for-dev → in-progress → review
- `_bmad-output/implementation-artifacts/7-2-ai-prompt-templates.md` — Updated task checkboxes, Dev Agent Record, File List, Status

### Change Log

- 2026-03-24: Implemented story 7-2 — created 3 AI prompt templates, extended freshness script, updated documentation cross-references
- 2026-03-24: Fixed code review follow-ups for story 7-2 and revalidated `pnpm check:bundle-freshness`
