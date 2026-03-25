# Story 7.4: Generation Validation Feedback

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a module developer,
I want clear, actionable validation results when an AI-generated module fails quality gates,
so that I can fix specific issues rather than debugging blind.

## Acceptance Criteria

1. **AC1 — Per-Gate Failure Diagnostics** — Given an AI-generated module fails one or more quality gates, when the developer runs the validation, then each failure is reported with: the specific gate that failed (e.g., "Token Compliance", "TypeScript Build", "Coverage"), the exact file and line number of the violation, the expected value or pattern, and a remediation suggestion (e.g., "Replace `#f5f5f5` with `var(--color-surface-secondary)`").

2. **AC2 — Manifest Validation Feedback** — Given the manifest validation fails, when viewing the results, then the error identifies the missing or incorrectly typed field, and the expected type and an example value are shown.

3. **AC3 — Token Compliance Feedback** — Given the token compliance scan fails, when viewing the results, then each non-token value is identified with its file location, and the correct token name is suggested as replacement.

4. **AC4 — Import Boundary Feedback** — Given the ESLint import boundary check fails, when viewing the results, then the forbidden import is identified (e.g., "Direct import of `@radix-ui/react-dialog` in module code"), and the correct `@hexalith/ui` component alternative is suggested (e.g., "Use `<Modal>` from `@hexalith/ui` instead").

5. **AC5 — Coverage Feedback** — Given test coverage is below the threshold, when viewing the results, then uncovered files and functions are listed, and the current coverage percentage and required threshold are shown.

6. **AC6 — Dual Output Format** — Given validation results are available, when the developer reviews them, then results can be output as structured JSON (for programmatic consumption by AI tools) or human-readable text, and the AI agent can use the structured feedback to self-correct and regenerate.

## Tasks / Subtasks

- [ ] Task 1: Extend validate-module.ts with structured result types (AC: #1, #6)
  - [ ] Add `ValidationResult` interface to `scripts/validate-module.ts`:
    ```typescript
    interface GateViolation {
      gate: string;           // "dependency" | "build" | "lint" | "stylelint" | "test" | "coverage" | "manifest"
      severity: "error" | "warning";
      file?: string;          // Relative path from module root
      line?: number;
      column?: number;
      rule?: string;          // ESLint rule name, Stylelint rule name, etc.
      message: string;        // Human-readable description
      expected?: string;      // Expected value or pattern
      actual?: string;        // Actual value found
      remediation?: string;   // Actionable fix suggestion
    }

    interface GateResult {
      gate: string;
      status: "pass" | "fail" | "skip";
      violations: GateViolation[];
      duration_ms: number;
    }

    interface ValidationReport {
      module: string;         // Module name (e.g., "hexalith-orders")
      modulePath: string;     // Absolute path to module directory
      timestamp: string;      // ISO 8601
      overall: "pass" | "fail";
      gates: GateResult[];
      summary: {
        total_gates: number;
        passed: number;
        failed: number;
        skipped: number;
        total_violations: number;
        total_errors: number;
        total_warnings: number;
      };
    }
    ```
  - [ ] Add `--format` CLI flag: `text` (default, human-readable) or `json` (structured `ValidationReport`)
  - [ ] Add `--output` CLI flag: write JSON report to file path (default: stdout)
  - [ ] Refactor each gate function to return `GateResult` instead of printing directly
  - [ ] Keep the existing text output as default — the `--format json` flag activates structured output
  - [ ] Follow the CLI pattern from `check-test-quality.ts`: `process.argv` parsing with `--help`

- [ ] Task 2: Enhance build gate with file:line diagnostics (AC: #1)
  - [ ] Parse `tsc --noEmit` stderr output for TypeScript errors
  - [ ] TypeScript error format: `src/pages/OrderListPage.tsx(42,5): error TS2345: Argument of type...`
  - [ ] Extract file, line, column, error code, message from each diagnostic
  - [ ] Map to `GateViolation` with `gate: "build"`, remediation from TypeScript error message
  - [ ] Parse `tsup` build errors similarly if build step fails
  - [ ] Note: build gate uses `turbo build --filter=@hexalith/{module}` — capture stderr from turbo output

- [ ] Task 3: Enhance lint gate with import boundary remediation (AC: #1, #4)
  - [ ] Parse ESLint JSON output: run with `--format json` flag to get structured violations
  - [ ] ESLint JSON format: `[{ filePath, messages: [{ ruleId, line, column, message, severity }] }]`
  - [ ] For `@hexalith/eslint-config/module-isolation` rule violations (direct Radix imports, cross-module imports):
    - Map known Radix packages to `@hexalith/ui` alternatives using the component catalog from `docs/ai-knowledge-bundle/ui-components.md`
    - Build remediation map (embed in script or load from knowledge bundle):
      - `@radix-ui/react-dialog` → "Use `<Modal>` from `@hexalith/ui`"
      - `@radix-ui/react-dropdown-menu` → "Use `<DropdownMenu>` from `@hexalith/ui`"
      - `@radix-ui/react-select` → "Use `<Select>` from `@hexalith/ui`"
      - `@radix-ui/react-tabs` → "Use `<Tabs>` from `@hexalith/ui`"
      - `@radix-ui/react-tooltip` → "Use `<Tooltip>` from `@hexalith/ui`"
      - `@radix-ui/react-popover` → "Use `<Popover>` from `@hexalith/ui`"
      - `@radix-ui/react-accordion` → "Use `<Accordion>` from `@hexalith/ui`"
      - (extend from `docs/ai-knowledge-bundle/ui-components.md` for full mapping)
    - For cross-module imports: "Import from `@hexalith/shell-api` or `@hexalith/ui` instead"
  - [ ] For other ESLint violations: include rule name and message as remediation
  - [ ] Map each violation to `GateViolation` with `gate: "lint"`, file, line, column, ruleId as `rule`

- [ ] Task 4: Enhance Stylelint gate with token compliance feedback (AC: #1, #3)
  - [ ] Parse Stylelint JSON output: run with `--formatter json` flag
  - [ ] Stylelint JSON format: `[{ source, warnings: [{ rule, line, column, text, severity }] }]`
  - [ ] For token compliance violations (hardcoded colors, spacing, typography):
    - Build token suggestion map from design tokens (or reference `docs/ai-knowledge-bundle/conventions.md`)
    - Common hardcoded-to-token mappings:
      - Hex colors → `var(--hx-color-*)` token name
      - `px` spacing values → `var(--hx-space-*)` token name
      - Font sizes → `var(--hx-font-size-*)` token name
    - Set `actual` to the hardcoded value, `expected` to the token pattern, `remediation` to specific replacement
  - [ ] Map each warning to `GateViolation` with `gate: "stylelint"`, file, line, column

- [ ] Task 5: Enhance test/coverage gate with uncovered file reporting (AC: #1, #5)
  - [ ] Run Vitest with `--reporter json --coverage` to get structured test results
  - [ ] Parse coverage JSON output (Vitest uses Istanbul coverage format in `coverage/coverage-summary.json`)
  - [ ] Coverage summary format: `{ total: { lines: { pct }, branches: { pct }, functions: { pct }, statements: { pct } }, "/path/file.ts": { ... } }`
  - [ ] For each file below threshold: create `GateViolation` with file path, current percentage, required threshold
  - [ ] Set `actual` to current percentage (e.g., "65%"), `expected` to threshold (e.g., ">= 80%")
  - [ ] Set `remediation` to "Add tests covering uncovered functions in this file"
  - [ ] For test failures: parse Vitest JSON output for failing test names and assertion messages
  - [ ] Note: test gate uses `turbo test --filter=@hexalith/{module}` — need to pass Vitest reporter flags through turbo

- [ ] Task 6: Enhance manifest validation gate feedback (AC: #1, #2)
  - [ ] Import `validateManifest` from `@hexalith/shell-api` (already exists in story 7-3)
  - [ ] `validateManifest` already returns `ManifestValidationResult` with `errors: ManifestValidationError[]` and `warnings: ManifestValidationError[]`
  - [ ] Each `ManifestValidationError` has `{ field, message }` — sufficient for basic feedback
  - [ ] Enhance with example values for each field type:
    - `name` → expected: "lowercase kebab-case", example: `"my-module"`
    - `displayName` → expected: "non-empty string", example: `"My Module"`
    - `version` → expected: "semver string", example: `"1.0.0"`
    - `routes[].path` → expected: "string starting with /", example: `"/detail/:id"`
    - `navigation[].label` → expected: "non-empty string", example: `"My Module"`
    - `navigation[].path` → expected: "string matching a declared route", example: `"/"`
  - [ ] Map each ManifestValidationError to `GateViolation` with `gate: "manifest"`, `field` as rule, `expected` with type + example

- [ ] Task 7: Implement JSON formatter output (AC: #6)
  - [ ] When `--format json` is passed, output `ValidationReport` as pretty-printed JSON to stdout
  - [ ] When `--output <path>` is passed, write JSON to file
  - [ ] JSON must be valid, parseable by AI tools — no console.log interleaving
  - [ ] Suppress all human-readable output (pass/fail markers, section headers) in JSON mode
  - [ ] Ensure exit code still reflects overall pass/fail (0 or 1) regardless of format

- [ ] Task 8: Implement human-readable text formatter (AC: #1, #6)
  - [ ] Default output format — enhance existing text output from story 7-3
  - [ ] Format pattern per gate (following check-bundle-freshness.ts style):
    ```
    ── Build ──────────────────────────
    ❌ FAIL  src/pages/OrderListPage.tsx:42:5
            TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
            Fix: Check the type of the argument passed to this function

    ── Lint ───────────────────────────
    ❌ FAIL  src/pages/OrderListPage.tsx:3:1
            @hexalith/no-direct-radix: Direct import of @radix-ui/react-dialog
            Fix: Use <Modal> from @hexalith/ui instead

    ── Token Compliance ───────────────
    ❌ FAIL  src/pages/OrderListPage.module.css:12:3
            custom-property-pattern: Found hardcoded color #f5f5f5
            Fix: Replace with var(--hx-color-surface-secondary)

    ── Coverage ───────────────────────
    ⚠️  WARN  src/pages/OrderCreatePage.tsx
            Coverage: 65% lines (required: >= 80%)
            Fix: Add tests covering uncovered functions in this file

    ── Manifest ───────────────────────
    ✅ PASS

    ═══════════════════════════════════
    RESULT: FAIL (3 gates failed, 1 warning)
    Violations: 3 errors, 1 warning
    ```
  - [ ] Group violations by gate for readability
  - [ ] Include summary line at bottom with pass/fail counts

- [ ] Task 9: Add tests for validation feedback (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Create `scripts/__tests__/validate-module.test.ts` (or co-located `scripts/validate-module.test.ts`)
  - [ ] Test: `GateViolation` construction from TypeScript error output
  - [ ] Test: `GateViolation` construction from ESLint JSON output
  - [ ] Test: `GateViolation` construction from Stylelint JSON output
  - [ ] Test: `GateViolation` construction from coverage JSON output
  - [ ] Test: Manifest validation errors map correctly with example values
  - [ ] Test: JSON format output is valid, parseable JSON matching `ValidationReport` schema
  - [ ] Test: Text format output includes file:line, remediation suggestions
  - [ ] Test: `--format json` flag activates JSON output
  - [ ] Test: `--format text` flag (default) activates text output
  - [ ] Test: Exit code 0 when all gates pass, 1 when any gate fails
  - [ ] Use realistic mock outputs for each tool (capture real ESLint/Stylelint/tsc output samples)
  - [ ] AC markers: `// AC: 7-4#1, 7-4#6`

- [ ] Task 10: End-to-end validation with hexalith-orders module (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Run `tsx scripts/validate-module.ts modules/hexalith-orders` — should PASS all gates (orders module from 7-3 is correct)
  - [ ] Run `tsx scripts/validate-module.ts modules/hexalith-orders --format json` — verify JSON output is valid
  - [ ] Run `tsx scripts/validate-module.ts modules/hexalith-tenants` — should also PASS (quality parity)
  - [ ] Introduce deliberate failures in a temp module to verify diagnostic output:
    - Hardcoded color in CSS → verify token suggestion appears
    - Direct Radix import → verify @hexalith/ui alternative appears
    - Missing manifest field → verify field name + example value appears
    - Broken TypeScript type → verify file:line + error message appears
  - [ ] Verify all existing tests pass (zero regressions)
  - [ ] Verify `pnpm check:bundle-freshness` still passes

## Dev Notes

### Critical Dependency: Story 7-3 Must Be Complete First

This story extends the `scripts/validate-module.ts` script created in story 7-3. The 7-3 script provides:
- CLI entry point accepting module path
- Gate execution order: dependency check → build → lint → test → manifest
- Text output with PASS/FAIL per gate
- Exit code 0/1
- Turbo delegation for build/lint/test, custom logic for dependency and manifest checks

Story 7-4 enhances the existing script — it does NOT rewrite it. The enhancements are:
1. Structured `GateViolation` and `ValidationReport` types
2. Tool-specific output parsing (ESLint JSON, Stylelint JSON, tsc stderr, coverage JSON)
3. Remediation suggestions per violation type
4. `--format json` output mode for AI tool consumption
5. Enhanced text output with file:line details

### What This Story Actually Proves

This story proves FR46: the validation feedback loop is actionable. When AI-generated code fails a gate, the developer (or AI agent) gets:
- Which gate failed (not just "lint failed")
- Which file and line caused the failure
- What the expected pattern or value is
- How to fix it

This is the feedback loop that makes AI generation iterative and self-correcting, not a one-shot gamble.

### Output Parsing Strategy

Each quality gate tool produces different output formats. The parsing approach:

| Gate | Tool | Output Format | Parsing Strategy |
|------|------|---------------|------------------|
| Build | `tsc --noEmit` via turbo | stderr text | Regex: `file(line,col): error TSxxxx: message` |
| Lint | ESLint via turbo | JSON (with `--format json`) | Native JSON parse |
| Stylelint | Stylelint via turbo | JSON (with `--formatter json`) | Native JSON parse |
| Test | Vitest via turbo | JSON (with `--reporter json`) | Native JSON parse |
| Coverage | Vitest/Istanbul | JSON file (`coverage/coverage-summary.json`) | File read + JSON parse |
| Manifest | `validateManifest()` | TypeScript return value | Direct use of `ManifestValidationResult` |
| Dependencies | Custom check | In-memory | Direct violation construction |

**Turbo passthrough for tool flags:** The turbo `--filter` approach used in story 7-3 may not easily pass tool-specific flags like `--format json` to ESLint. Options:
1. Run ESLint/Stylelint directly (not via turbo) for the validation script — acceptable since validate-module already runs each gate individually
2. Use turbo env vars or `--` passthrough
3. Run the module's own scripts with additional flags: `pnpm --filter @hexalith/{module} lint -- --format json`

Option 1 or 3 is recommended. The validation script needs structured output from each tool, which Turbo's aggregated output makes difficult to parse.

### Radix-to-UI Component Mapping

For AC4, the script needs to suggest `@hexalith/ui` alternatives when direct Radix imports are detected. The mapping is documented in `docs/ai-knowledge-bundle/ui-components.md`. Key mappings:

| Radix Package | @hexalith/ui Component |
|---|---|
| `@radix-ui/react-dialog` | `<Modal>` |
| `@radix-ui/react-dropdown-menu` | `<DropdownMenu>` |
| `@radix-ui/react-select` | `<Select>` |
| `@radix-ui/react-tabs` | `<Tabs>` |
| `@radix-ui/react-tooltip` | `<Tooltip>` |
| `@radix-ui/react-popover` | `<Popover>` |
| `@radix-ui/react-accordion` | `<Accordion>` |
| `@radix-ui/react-navigation-menu` | `<NavMenu>` |
| `@radix-ui/react-toast` | `<Toast>` |

The dev agent MUST read `docs/ai-knowledge-bundle/ui-components.md` to get the complete mapping — the above is a subset.

### Token Suggestion Strategy

For AC3, suggesting specific token names for hardcoded values is complex. Pragmatic approach:
1. For Stylelint violations, the rule message often includes the expected pattern (e.g., "Expected custom property")
2. Include the Stylelint rule name in the violation for AI tools to look up the token convention
3. For color values: suggest the closest `--hx-color-*` token from `docs/ai-knowledge-bundle/conventions.md`
4. For spacing values: suggest the closest `--hx-space-*` token
5. Don't try to build a perfect mapping — the remediation message should guide, not automate

### Existing Validation Interfaces to Reuse

- `ManifestValidationError` and `ManifestValidationResult` from `@hexalith/shell-api/src/manifest/validateManifest.ts` — already structured with `{ field, message }`
- `RegistryValidationResult` from `apps/shell/src/modules/validateRegistry.ts` — `{ valid, errors[], warnings[] }` pattern
- `Violation` interface from `scripts/check-test-quality.ts` — `{ severity: "warn" | "fail" }` pattern
- `HealthReport` from `packages/ui/scripts/design-system-health.ts` — machine-readable JSON report pattern

### Existing Script Patterns to Follow

**check-bundle-freshness.ts:**
- `pass()`, `warn()`, `fail()` helper functions for colored console output
- Section headers: `console.log("\n── Check Name ──")`
- Summary at end with counts
- Exit code based on failure count

**check-test-quality.ts:**
- CLI argument parsing with `process.argv`
- `--help`, `--all`, `--changed-only` flags
- Per-file violation collection
- Severity classification

**design-system-health.ts:**
- Full `HealthReport` interface with machine-readable JSON output
- External gate status via environment variables
- Multiple report sections with individual pass/fail

Follow these patterns. DO NOT invent a new reporting framework.

### Anti-Patterns to Prevent

1. **DO NOT** create a new validation script — extend the existing `scripts/validate-module.ts` from story 7-3
2. **DO NOT** parse turbo's aggregated stdout for tool-specific data — run tools directly or via pnpm filter to get structured output
3. **DO NOT** build a complete color-to-token mapping database — use Stylelint's error messages and convention docs for guidance
4. **DO NOT** add new npm dependencies — use Node.js built-ins (fs, child_process, path) and existing workspace tools
5. **DO NOT** modify the quality gates themselves — this story enhances reporting, not the gate logic
6. **DO NOT** create a separate validation CLI tool — extend the existing script with `--format` flag
7. **DO NOT** use `exec` — use `execFile` with argument arrays for safe subprocess execution
8. **DO NOT** forget to handle the case where turbo build/lint/test have already been delegated in story 7-3 — refactor gate execution to capture structured output alongside pass/fail
9. **DO NOT** break the default text output — `--format json` is additive; text format must remain the default
10. **DO NOT** interleave console.log with JSON output — in JSON mode, suppress all text and emit only the final JSON blob

### Scope Boundaries

- **In scope:** Structured output from validate-module.ts, remediation suggestions, JSON format, enhanced text format
- **Out of scope:** Automated re-generation (AI agent reads JSON and re-runs generation is future work)
- **Out of scope:** Web UI for validation results — CLI only
- **Out of scope:** IDE integration (VS Code diagnostic output)
- **Out of scope:** Historical validation tracking or trend reporting
- **Out of scope:** Modifying the quality gates themselves (ESLint rules, Stylelint config, coverage thresholds)

### Project Structure Notes

**Files to MODIFY:**
```
scripts/validate-module.ts          # Main enhancement target — add types, parsers, formatters
```

**Files to CREATE:**
```
scripts/validate-module.test.ts     # Unit tests for parsing and formatting logic
```

**Files to NOT TOUCH:**
- `packages/shell-api/src/manifest/validateManifest.ts` — manifest validation is already structured
- `packages/ui/scripts/design-system-health.ts` — separate design system gate
- `.github/workflows/ci.yml` — CI step added in 7-3, no changes needed
- `modules/hexalith-orders/` — AI-generated module from 7-3, used only for testing
- `modules/hexalith-tenants/` — reference module, used only for testing
- Existing quality gate configs (ESLint, Stylelint, Vitest) — reporting only, no gate changes

### Library/Framework Requirements

- No new dependencies
- Uses Node.js built-ins: `fs`, `child_process` (`execFile`), `path`
- Uses existing `@hexalith/shell-api` `validateManifest` export
- Uses existing ESLint `--format json`, Stylelint `--formatter json`, Vitest `--reporter json` flags
- `tsx` for script execution (already in workspace devDependencies)

### Testing Requirements

- Unit tests for output parsing: TypeScript error parsing, ESLint JSON parsing, Stylelint JSON parsing, coverage JSON parsing
- Unit tests for formatter output: JSON format validation, text format structure
- Integration test: run against hexalith-orders (should pass all gates)
- Integration test: run against hexalith-tenants (should pass — quality parity)
- Regression: all existing tests must pass
- Coverage: test the parsing edge cases (empty output, malformed JSON, missing fields)

### Import Order Convention

Every generated/modified file must follow this import order (ESLint enforces):
1. `node:*` built-ins (fs, child_process, path)
2. External libraries (none expected)
3. `@hexalith/*` packages (shell-api validateManifest)
4. Relative imports
5. Type-only imports separated with `import type`

### Quality Gate Thresholds (Reference)

| Gate | Threshold | Notes |
|------|-----------|-------|
| TypeScript | 0 errors | `tsc --noEmit` |
| ESLint | 0 violations | Import boundaries, no Radix direct imports, no cross-module |
| Stylelint | 100% token compliance | No hardcoded colors, spacing, typography |
| Test coverage | >= 80% branches/functions/lines/statements | For modules |
| Manifest validation | All fields valid | kebab-case name, semver version, valid routes |

### Previous Story Intelligence

**From Story 7-3 (AI Generation Pipeline & Quality Gate Pass-Through) — READY-FOR-DEV:**
- Creates `scripts/validate-module.ts` with text output (PASS/FAIL per gate)
- Gate execution: dependency check → build (turbo) → lint (turbo) → test (turbo) → manifest
- Uses `execFile` for subprocess safety
- Follows check-bundle-freshness.ts and check-test-quality.ts patterns
- Generates hexalith-orders reference module
- Adds `check:validate-module` script to root package.json
- Adds CI step in `.github/workflows/ci.yml`

**From Story 7-2 (AI Prompt Templates) — DONE:**
- 3 prompt templates created in `docs/ai-knowledge-bundle/prompts/`
- Extended freshness script with template validation
- Code review fixed: path references, placeholder formatting, scaffold command references

**From Story 7-1 (Machine-Readable Knowledge Bundle) — DONE:**
- Knowledge bundle with 8 files covering manifest, hooks, components, conventions, scaffold structure, test fixtures
- Freshness check script with 7 verification sections
- Key lesson: always read actual source, never trust architecture docs alone

**Codebase state:** CI pipeline has 14+ quality gates. Test fixtures stable. 466+ tests passing (1 pre-existing CSS layer timeout in @hexalith/ui).

### Git Intelligence

Recent commits:
- `9bc8511` — feat: add AI prompt templates for module generation
- `62d3c49` — fix: update status of AI prompt templates to in-progress
- `b40d56f` — chore: update subproject commit reference for Hexalith.Tenants
- `021c2f8` — feat: add AI knowledge bundle documentation and freshness check script

Pattern: Provider-based architecture, Zod-validated schemas, turbo-delegated builds, structured error hierarchy.

### References

- [Source: _bmad-output/planning-artifacts/epics.md, lines 2271-2312] Epic 7 Story 7.4 acceptance criteria (FR46)
- [Source: _bmad-output/planning-artifacts/prd.md, FR46] Module developer can view validation results when AI-generated module fails quality gates
- [Source: _bmad-output/planning-artifacts/architecture.md, lines 571-574] CI pipeline quality gates structure
- [Source: _bmad-output/planning-artifacts/architecture.md, lines 1093-1100] Enforcement gates summary
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md, line 359] Error grace: diagnostic feedback with specific token references
- [Source: packages/shell-api/src/manifest/validateManifest.ts] ManifestValidationError and ManifestValidationResult interfaces
- [Source: apps/shell/src/modules/validateRegistry.ts] RegistryValidationResult pattern
- [Source: scripts/check-bundle-freshness.ts] Validation script pattern (pass/warn/fail helpers, section headers)
- [Source: scripts/check-test-quality.ts] Test quality validation with Violation interface, CLI args, severity classification
- [Source: packages/ui/scripts/design-system-health.ts] Machine-readable JSON HealthReport pattern
- [Source: docs/ai-knowledge-bundle/ui-components.md] Radix-to-@hexalith/ui component mapping
- [Source: docs/ai-knowledge-bundle/conventions.md] Design token naming conventions
- [Source: _bmad-output/implementation-artifacts/7-3-ai-generation-pipeline-and-quality-gate-pass-through.md] Story 7-3 context (validate-module.ts design)
- [Source: _bmad-output/implementation-artifacts/7-2-ai-prompt-templates.md] Story 7-2 learnings
- [Source: _bmad-output/implementation-artifacts/7-1-machine-readable-knowledge-bundle.md] Story 7-1 learnings

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
