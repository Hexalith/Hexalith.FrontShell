/**
 * validate-module.ts
 * Validates a single module against all quality gates with structured output:
 *   1. Dependency check — verify peerDependency ranges in package.json
 *   2. Build — TypeScript compilation via turbo/tsup
 *   3. ESLint — lint with import boundary enforcement
 *   4. Stylelint — token compliance for CSS files
 *   5. Tests — vitest with coverage >= 80%
 *   6. Accessibility — axe-core component tests via Playwright
 *   7. Manifest — validateManifest from @hexalith/shell-api
 *
 * Usage:
 *   pnpm tsx scripts/validate-module.ts <module-path> [--format text|json] [--output <path>]
 *
 * Exit codes:
 *   0 - All gates pass
 *   1 - Any gate fails
 *
 * Security: Uses execFile with argument arrays (not exec) to prevent shell injection.
 */

import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

// execFile is safe — it does not spawn a shell and takes args as an array,
// preventing command injection. This is the recommended pattern per the
// project's security guidelines (equivalent to execFileNoThrow).
const execFile = promisify(execFileCb);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

// ─── Types ───

export interface GateViolation {
  gate: string;
  severity: "error" | "warning";
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  message: string;
  expected?: string;
  actual?: string;
  remediation?: string;
}

export interface GateResult {
  gate: string;
  status: "pass" | "fail" | "skip";
  violations: GateViolation[];
  duration_ms: number;
}

export interface ValidationReport {
  module: string;
  modulePath: string;
  timestamp: string;
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

export interface CliArgs {
  modulePath: string;
  format: "text" | "json";
  output?: string;
}

// ─── Helpers ───

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface WorkspacePackageVersion {
  name: string;
  version: string;
}

interface ManifestValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

interface CoverageSummaryMetric {
  pct: number;
}

interface CoverageSummaryEntry {
  lines: CoverageSummaryMetric;
  branches: CoverageSummaryMetric;
  functions: CoverageSummaryMetric;
  statements: CoverageSummaryMetric;
}

interface CoverageLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

interface CoverageDetailEntry {
  statementMap: Record<string, CoverageLocation>;
  s: Record<string, number>;
  branchMap: Record<string, { locations: CoverageLocation[] }>;
  b: Record<string, number[]>;
  fnMap: Record<string, { name: string; line: number }>;
  f: Record<string, number>;
}

async function run(
  command: string,
  args: string[],
  cwd?: string,
): Promise<ExecResult> {
  try {
    // On Windows, pnpm must be invoked via cmd.exe shell wrapper.
    // execFile with argument arrays is safe against injection.
    const [executable, executableArgs] =
      command === "pnpm"
        ? process.platform === "win32"
          ? ["cmd.exe", ["/d", "/s", "/c", "pnpm", ...args]]
          : ["pnpm", args]
        : [command, args];

    const { stdout, stderr } = await execFile(executable, executableArgs, {
      cwd: cwd ?? ROOT,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    const e = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
      status?: number;
    };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: e.status ?? e.code ?? 1,
    };
  }
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

function getWorkspacePackageVersion(relativePackagePath: string): WorkspacePackageVersion {
  return readJsonFile<WorkspacePackageVersion>(
    resolve(ROOT, relativePackagePath, "package.json"),
  );
}

function collectFiles(directoryPath: string, predicate: (filePath: string) => boolean): string[] {
  const entries = readdirSync(directoryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = resolve(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath, predicate));
      continue;
    }

    if (predicate(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function extractQuotedValue(text: string): string | undefined {
  const doubleQuotedMatch = text.match(/"([^"]+)"/);
  if (doubleQuotedMatch) {
    return doubleQuotedMatch[1];
  }

  const singleQuotedMatch = text.match(/'([^']+)'/);
  return singleQuotedMatch?.[1];
}

function nearestSpacingToken(value: string): string {
  const pxMatch = value.match(/(-?\d+\.?\d*)px\b/i);
  if (pxMatch) {
    const numericValue = Math.abs(parseFloat(pxMatch[1]));
    const spacingScale = [0, 4, 8, 12, 16, 24, 32, 48, 64];
    const nearest = spacingScale.reduce((currentNearest, candidate) => (
      Math.abs(candidate - numericValue) < Math.abs(currentNearest - numericValue)
        ? candidate
        : currentNearest
    ));

    return `var(--spacing-${spacingScale.indexOf(nearest)})`;
  }

  return "a spacing token (e.g., var(--spacing-2))";
}

function nearestFontSizeToken(value: string): string {
  const pxMatch = value.match(/(-?\d+\.?\d*)px\b/i);
  if (pxMatch) {
    const numericValue = Math.abs(parseFloat(pxMatch[1]));
    const fontScale = [
      { px: 10.24, token: "var(--font-size-xs)" },
      { px: 12.8, token: "var(--font-size-sm)" },
      { px: 16, token: "var(--font-size-body)" },
      { px: 20, token: "var(--font-size-md)" },
      { px: 25.008, token: "var(--font-size-lg)" },
      { px: 31.248, token: "var(--font-size-xl)" },
      { px: 39.056, token: "var(--font-size-2xl)" },
    ];

    return fontScale.reduce((currentNearest, candidate) => (
      Math.abs(candidate.px - numericValue) < Math.abs(currentNearest.px - numericValue)
        ? candidate
        : currentNearest
    )).token;
  }

  const remMatch = value.match(/(-?\d+\.?\d*)rem\b/i);
  if (remMatch) {
    const numericValue = Math.abs(parseFloat(remMatch[1]));
    const fontScale = [
      { rem: 0.64, token: "var(--font-size-xs)" },
      { rem: 0.8, token: "var(--font-size-sm)" },
      { rem: 1, token: "var(--font-size-body)" },
      { rem: 1.25, token: "var(--font-size-md)" },
      { rem: 1.563, token: "var(--font-size-lg)" },
      { rem: 1.953, token: "var(--font-size-xl)" },
      { rem: 2.441, token: "var(--font-size-2xl)" },
    ];

    return fontScale.reduce((currentNearest, candidate) => (
      Math.abs(candidate.rem - numericValue) < Math.abs(currentNearest.rem - numericValue)
        ? candidate
        : currentNearest
    )).token;
  }

  return "var(--font-size-body)";
}

function calculateCoveragePercent(covered: number, total: number): number {
  if (total === 0) {
    return 100;
  }

  return Number(((covered / total) * 100).toFixed(1));
}

function collectLineCoverage(
  statementMap: Record<string, CoverageLocation>,
  statementHits: Record<string, number>,
): { covered: number; total: number } {
  const allLines = new Set<number>();
  const coveredLines = new Set<number>();

  for (const [statementId, location] of Object.entries(statementMap)) {
    for (let line = location.start.line; line <= location.end.line; line++) {
      allLines.add(line);
      if ((statementHits[statementId] ?? 0) > 0) {
        coveredLines.add(line);
      }
    }
  }

  return {
    covered: coveredLines.size,
    total: allLines.size,
  };
}

function listUncoveredFunctions(entry: CoverageDetailEntry): string[] {
  return Object.entries(entry.fnMap)
    .filter(([functionId]) => (entry.f[functionId] ?? 0) === 0)
    .map(([, fn]) => ({
      name: fn.name || "<anonymous>",
      line: fn.line,
    }))
    .filter((fn) => fn.name !== "(empty-report)" && fn.name !== "<anonymous>")
    .map((fn) => `${fn.name} (line ${fn.line})`);
}

function isCoverageSummaryEntry(value: unknown): value is CoverageSummaryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<CoverageSummaryEntry>;
  return Boolean(
    entry.lines && entry.branches && entry.functions && entry.statements,
  );
}

function isCoverageDetailEntry(value: unknown): value is CoverageDetailEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<CoverageDetailEntry>;
  return Boolean(entry.statementMap && entry.s && entry.branchMap && entry.b && entry.fnMap && entry.f);
}

function shouldIgnoreCoverageFile(filePath: string): boolean {
  return (
    /[\\/](coverage|dist|dev-host|playwright)[\\/]/i.test(filePath) ||
    /\.(spec|test)\.[cm]?[jt]sx?$/i.test(filePath) ||
    /[\\/]src[\\/]testing[\\/]/i.test(filePath)
  );
}

// ─── CLI ───

export function parseArgs(argv: string[]): CliArgs | null {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help")) return null;

  let format: "text" | "json" = "text";
  let output: string | undefined;
  let modulePath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--format" && i + 1 < args.length) {
      const fmt = args[++i];
      if (fmt === "json" || fmt === "text") format = fmt;
    } else if (args[i] === "--output" && i + 1 < args.length) {
      output = args[++i];
    } else if (!args[i].startsWith("--")) {
      modulePath = args[i];
    }
  }

  if (!modulePath) return null;

  return { modulePath, format, output };
}

// ─── Radix-to-UI Component Mapping (AC: #4) ───

const RADIX_TO_UI_MAP: Record<string, string> = {
  "@radix-ui/react-dialog": "Use `<Modal>` from `@hexalith/ui`",
  "@radix-ui/react-dropdown-menu": "Use `<DropdownMenu>` from `@hexalith/ui`",
  "@radix-ui/react-select": "Use `<Select>` from `@hexalith/ui`",
  "@radix-ui/react-tabs": "Use `<Tabs>` from `@hexalith/ui`",
  "@radix-ui/react-tooltip": "Use `<Tooltip>` from `@hexalith/ui`",
  "@radix-ui/react-popover": "Use `<Popover>` from `@hexalith/ui`",
  "@radix-ui/react-accordion": "Use `<Accordion>` from `@hexalith/ui`",
  "@radix-ui/react-navigation-menu": "Use `<NavMenu>` from `@hexalith/ui`",
  "@radix-ui/react-toast": "Use `<Toast>` from `@hexalith/ui`",
};

// ─── Manifest Field Examples (AC: #2) ───

const MANIFEST_FIELD_EXAMPLES: Record<string, { expected: string; example: string }> = {
  name: { expected: "lowercase kebab-case string", example: "my-module" },
  displayName: { expected: "non-empty string", example: "My Module" },
  version: { expected: "semver string", example: "1.0.0" },
  "routes[].path": { expected: "string starting with /", example: "/detail/:id" },
  "navigation[].label": { expected: "non-empty string", example: "My Module" },
  "navigation[].path": { expected: "string matching a declared route", example: "/" },
};

// ─── Parsing Functions ───

/** Parse tsc stderr output for TypeScript errors (AC: #1) */
export function parseTscOutput(output: string): GateViolation[] {
  const violations: GateViolation[] = [];
  const errorRegex = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = errorRegex.exec(output)) !== null) {
    violations.push({
      gate: "build",
      severity: "error",
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      rule: match[4],
      message: match[5],
      remediation: `Fix TypeScript error ${match[4]}: ${match[5]}`,
    });
  }

  return violations;
}

/** Parse ESLint JSON output with import boundary remediation (AC: #1, #4) */
export function parseEslintJson(jsonOutput: string): GateViolation[] {
  const violations: GateViolation[] = [];

  let results: Array<{
    filePath: string;
    messages: Array<{
      ruleId: string | null;
      line: number;
      column: number;
      message: string;
      severity: number;
    }>;
  }>;

  try {
    results = JSON.parse(jsonOutput) as typeof results;
  } catch {
    return violations;
  }

  for (const result of results) {
    for (const msg of result.messages) {
      const ruleId = msg.ruleId ?? "unknown";
      let remediation = `Fix ESLint violation: ${ruleId}`;

      // Check for direct Radix imports
      for (const [radixPkg, suggestion] of Object.entries(RADIX_TO_UI_MAP)) {
        if (msg.message.includes(radixPkg)) {
          remediation = `${suggestion} instead of importing ${radixPkg} directly`;
          break;
        }
      }

      // Check for cross-module imports
      if (ruleId.includes("module-isolation") || msg.message.toLowerCase().includes("cross-module")) {
        remediation = "Import from `@hexalith/shell-api` or `@hexalith/ui` instead";
      }

      violations.push({
        gate: "lint",
        severity: msg.severity === 1 ? "warning" : "error",
        file: result.filePath,
        line: msg.line,
        column: msg.column,
        rule: ruleId,
        message: msg.message,
        remediation,
      });
    }
  }

  return violations;
}

/** Parse Stylelint JSON output with token compliance feedback (AC: #1, #3) */
export function parseStylelintJson(jsonOutput: string): GateViolation[] {
  const violations: GateViolation[] = [];

  let results: Array<{
    source: string;
    warnings: Array<{
      rule: string;
      line: number;
      column: number;
      text: string;
      severity: string;
    }>;
  }>;

  try {
    results = JSON.parse(jsonOutput) as typeof results;
  } catch {
    return violations;
  }

  for (const result of results) {
    for (const warning of result.warnings) {
      let remediation = `Fix Stylelint violation: ${warning.rule}`;
      let expected: string | undefined;
      let actual: string | undefined;

      // Token compliance suggestions
      const quotedValue = extractQuotedValue(warning.text);
      const hexMatch = warning.text.match(/#[0-9a-fA-F]{3,8}\b/);
      const pxMatch = warning.text.match(/(-?\d+\.?\d*)px\b/);
      const remMatch = warning.text.match(/(-?\d+\.?\d*)rem\b/);

      if (hexMatch) {
        actual = hexMatch[0];
        expected = "var(--color-*)";
        remediation = `Replace hardcoded color ${hexMatch[0]} with a semantic color token (e.g., var(--color-bg-*) for backgrounds, var(--color-text-*) for text, var(--color-border-*) for borders)`;
      } else if (
        warning.rule === "hexalith/no-hardcoded-spacing" ||
        warning.text.includes("hardcoded spacing") ||
        (pxMatch !== null && !warning.text.includes("font-size"))
      ) {
        actual = quotedValue ?? pxMatch?.[0] ?? remMatch?.[0];
        expected = nearestSpacingToken(actual ?? warning.text);
        remediation = `Replace hardcoded spacing ${actual ?? "value"} with ${expected}`;
      } else if (warning.rule === "hexalith/no-hardcoded-typography" || warning.text.includes("font-size")) {
        actual = quotedValue ?? pxMatch?.[0] ?? remMatch?.[0];
        expected = nearestFontSizeToken(actual ?? warning.text);
        remediation = `Replace hardcoded font size ${actual ?? "value"} with ${expected}`;
      } else if (warning.rule === "hexalith/no-hardcoded-colors" || warning.text.includes("hardcoded color")) {
        actual = quotedValue ?? hexMatch?.[0];
        expected = "var(--color-*)";
        remediation = `Replace hardcoded color ${actual ?? "value"} with a semantic color token (e.g., var(--color-bg-*) for backgrounds, var(--color-text-*) for text, var(--color-border-*) for borders)`;
      } else if (warning.text.includes("calc()") && warning.text.includes("spacing")) {
        expected = "calc(100% - var(--spacing-4))";
        remediation = "Use spacing tokens inside calc expressions (for example calc(100% - var(--spacing-4)))";
      } else if (
        warning.rule === "custom-property-pattern" ||
        warning.text.includes("custom property") ||
        warning.text.includes("Expected custom property")
      ) {
        expected = "CSS custom property (design token)";
        remediation = "Replace hardcoded value with the appropriate semantic design token";
      }

      violations.push({
        gate: "stylelint",
        severity: warning.severity === "error" ? "error" : "warning",
        file: result.source,
        line: warning.line,
        column: warning.column,
        rule: warning.rule,
        message: warning.text,
        expected,
        actual,
        remediation,
      });
    }
  }

  return violations;
}

/** Parse Vitest JSON reporter output for failing tests (AC: #1) */
export function parseVitestJson(jsonOutput: string): GateViolation[] {
  const violations: GateViolation[] = [];

  let results: {
    testResults?: Array<{
      name: string;
      status: string;
      message?: string;
      assertionResults?: Array<{
        fullName: string;
        status: string;
        failureMessages?: string[];
      }>;
    }>;
  };

  try {
    results = JSON.parse(jsonOutput) as typeof results;
  } catch {
    return violations;
  }

  if (!results.testResults) return violations;

  for (const testFile of results.testResults) {
    if (testFile.status !== "failed") continue;

    if (testFile.assertionResults) {
      for (const assertion of testFile.assertionResults) {
        if (assertion.status === "failed") {
          violations.push({
            gate: "test",
            severity: "error",
            file: testFile.name,
            message: `Test failed: ${assertion.fullName}`,
            remediation: assertion.failureMessages?.[0]?.split("\n")[0] ?? "Fix the failing test",
          });
        }
      }
    } else {
      violations.push({
        gate: "test",
        severity: "error",
        file: testFile.name,
        message: testFile.message ?? "Test suite failed",
        remediation: "Fix the failing test suite",
      });
    }
  }

  return violations;
}

/** Parse Istanbul coverage-summary.json for per-file coverage (AC: #1, #5) */
export function parseCoverageJson(
  coverageJson: string,
  threshold: number,
): GateViolation[] {
  const violations: GateViolation[] = [];

  let coverage: Record<string, CoverageSummaryEntry | CoverageDetailEntry>;

  try {
    coverage = JSON.parse(coverageJson) as typeof coverage;
  } catch {
    return violations;
  }

  for (const [filePath, data] of Object.entries(coverage)) {
    if (filePath === "total") continue;
    if (shouldIgnoreCoverageFile(filePath)) continue;

    let metrics: Array<{ name: string; pct: number }> = [];
    let uncoveredFunctions: string[] = [];

    if (isCoverageSummaryEntry(data)) {
      metrics = [
        { name: "lines", pct: data.lines.pct },
        { name: "branches", pct: data.branches.pct },
        { name: "functions", pct: data.functions.pct },
        { name: "statements", pct: data.statements.pct },
      ];
    } else if (isCoverageDetailEntry(data)) {
      const lineCoverage = collectLineCoverage(data.statementMap, data.s);
      const branchHits = Object.values(data.b).flat();
      const statementHits = Object.values(data.s);
      const functionHits = Object.values(data.f);

      metrics = [
        {
          name: "lines",
          pct: calculateCoveragePercent(lineCoverage.covered, lineCoverage.total),
        },
        {
          name: "branches",
          pct: calculateCoveragePercent(
            branchHits.filter((hitCount) => hitCount > 0).length,
            branchHits.length,
          ),
        },
        {
          name: "functions",
          pct: calculateCoveragePercent(
            functionHits.filter((hitCount) => hitCount > 0).length,
            functionHits.length,
          ),
        },
        {
          name: "statements",
          pct: calculateCoveragePercent(
            statementHits.filter((hitCount) => hitCount > 0).length,
            statementHits.length,
          ),
        },
      ];
      uncoveredFunctions = listUncoveredFunctions(data);
    } else {
      continue;
    }

    for (const metric of metrics) {
      if (metric.pct < threshold) {
        violations.push({
          gate: "coverage",
          severity: "warning",
          file: filePath,
          message: `${metric.name} coverage: ${metric.pct}% (required: >= ${threshold}%)`,
          actual: `${metric.pct}%`,
          expected: `>= ${threshold}%`,
          remediation: `Add tests covering uncovered ${metric.name} in this file`,
        });
      }
    }

    if (uncoveredFunctions.length > 0) {
      violations.push({
        gate: "coverage",
        severity: "warning",
        file: filePath,
        rule: "functions.uncovered",
        message: `Uncovered functions: ${uncoveredFunctions.join(", ")}`,
        remediation: `Add tests covering these functions: ${uncoveredFunctions.join(", ")}`,
      });
    }
  }

  return violations;
}

/** Map ManifestValidationError to GateViolation with field examples (AC: #1, #2) */
export function mapManifestErrors(
  errors: Array<{ field: string; message: string }>,
  severity: "error" | "warning",
): GateViolation[] {
  return errors.map((err) => {
    const fieldKey = err.field.replace(/\[\d+\]/, "[]");
    const example = MANIFEST_FIELD_EXAMPLES[fieldKey];

    return {
      gate: "manifest",
      severity,
      rule: err.field,
      message: err.message,
      expected: example?.expected,
      actual: undefined,
      remediation: example
        ? `Expected ${example.expected} (e.g., "${example.example}")`
        : err.message,
    };
  });
}

// ─── Report Builder ───

export function buildReport(
  moduleName: string,
  modulePath: string,
  gates: GateResult[],
): ValidationReport {
  const passed = gates.filter((g) => g.status === "pass").length;
  const failed = gates.filter((g) => g.status === "fail").length;
  const skipped = gates.filter((g) => g.status === "skip").length;
  const allViolations = gates.flatMap((g) => g.violations);

  return {
    module: moduleName,
    modulePath,
    timestamp: new Date().toISOString(),
    overall: failed > 0 ? "fail" : "pass",
    gates,
    summary: {
      total_gates: gates.length,
      passed,
      failed,
      skipped,
      total_violations: allViolations.length,
      total_errors: allViolations.filter((v) => v.severity === "error").length,
      total_warnings: allViolations.filter((v) => v.severity === "warning").length,
    },
  };
}

// ─── Formatters ───

const GATE_DISPLAY_NAMES: Record<string, string> = {
  dependency: "Dependencies",
  build: "Build",
  lint: "Lint",
  stylelint: "Token Compliance",
  test: "Tests",
  coverage: "Coverage",
  accessibility: "Accessibility",
  manifest: "Manifest",
};

/** Human-readable text format (AC: #1, #6) */
export function formatText(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push(`\n\u{1F50D} Module Validation: ${report.module}`);
  lines.push(`   Path: ${report.modulePath}`);
  lines.push("\u2550".repeat(60));

  for (const gate of report.gates) {
    const displayName = GATE_DISPLAY_NAMES[gate.gate] ?? gate.gate;
    lines.push(`\n\u2500\u2500 ${displayName} ${"\u2500".repeat(Math.max(0, 40 - displayName.length))}`);

    if (gate.status === "pass") {
      lines.push("\u2705 PASS");
      continue;
    }

    if (gate.status === "skip") {
      lines.push("\u23ED\uFE0F  SKIP");
      continue;
    }

    for (const v of gate.violations) {
      const icon = v.severity === "error" ? "\u274C FAIL" : "\u26A0\uFE0F  WARN";
      const location = v.file
        ? `${v.file}${v.line ? `:${v.line}` : ""}${v.column ? `:${v.column}` : ""}`
        : "";

      lines.push(`${icon}  ${location}`);
      lines.push(`        ${v.rule ? `${v.rule}: ` : ""}${v.message}`);
      if (v.remediation) {
        lines.push(`        Fix: ${v.remediation}`);
      }
    }
  }

  lines.push(`\n${"=".repeat(60)}`);

  if (report.overall === "fail") {
    lines.push(
      `RESULT: FAIL (${report.summary.failed} gate(s) failed, ${report.summary.passed} passed)`,
    );
    lines.push(
      `Violations: ${report.summary.total_errors} error(s), ${report.summary.total_warnings} warning(s)`,
    );
  } else {
    lines.push(`RESULT: PASS \u2014 All ${report.summary.total_gates} gates passed`);
  }

  return lines.join("\n");
}

/** Structured JSON format (AC: #6) */
export function formatJson(report: ValidationReport): string {
  return JSON.stringify(report, null, 2);
}

// ─── Gate Functions ───

function runDependencyGate(
  pkg: { peerDependencies?: Record<string, string> },
  requiredPeers: Array<{ name: string; expectedRange: string }>,
): GateResult {
  const start = Date.now();
  const violations: GateViolation[] = [];

  const peerDeps = pkg.peerDependencies;
  if (!peerDeps) {
    violations.push({
      gate: "dependency",
      severity: "error",
      message: "No peerDependencies found in package.json",
      remediation: "Add peerDependencies for @hexalith/shell-api, @hexalith/cqrs-client, and @hexalith/ui",
    });
    return { gate: "dependency", status: "fail", violations, duration_ms: Date.now() - start };
  }

  for (const { name, expectedRange } of requiredPeers) {
    if (!peerDeps[name]) {
      violations.push({
        gate: "dependency",
        severity: "error",
        rule: name,
        message: `Missing peerDependency: ${name}`,
        expected: expectedRange,
        remediation: `Add "${name}": "${expectedRange}" to peerDependencies`,
      });
    } else if (peerDeps[name] !== expectedRange) {
      violations.push({
        gate: "dependency",
        severity: "error",
        rule: name,
        message: `Version mismatch for ${name}`,
        expected: expectedRange,
        actual: peerDeps[name],
        remediation: `Update ${name} from "${peerDeps[name]}" to "${expectedRange}"`,
      });
    }
  }

  return {
    gate: "dependency",
    status: violations.length > 0 ? "fail" : "pass",
    violations,
    duration_ms: Date.now() - start,
  };
}

async function runBuildGate(packageName: string): Promise<GateResult> {
  const start = Date.now();

  const result = await run("pnpm", ["turbo", "build", `--filter=${packageName}`]);

  if (result.exitCode !== 0) {
    const output = result.stdout + "\n" + result.stderr;
    const violations = parseTscOutput(output);

    if (violations.length === 0) {
      violations.push({
        gate: "build",
        severity: "error",
        message: "TypeScript build failed",
        remediation: "Check build output for compilation errors",
      });
    }

    return { gate: "build", status: "fail", violations, duration_ms: Date.now() - start };
  }

  return { gate: "build", status: "pass", violations: [], duration_ms: Date.now() - start };
}

async function runEslintGate(
  moduleArg: string,
  absoluteModulePath: string,
): Promise<GateResult> {
  const start = Date.now();

  // Run ESLint directly with JSON format for structured output
  const result = await run(
    "pnpm",
    ["exec", "eslint", "src", "--format", "json"],
    absoluteModulePath,
  );

  // ESLint outputs JSON to stdout even on failure when --format json
  const violations = parseEslintJson(result.stdout);

  if (result.exitCode !== 0) {
    if (violations.length === 0) {
      violations.push({
        gate: "lint",
        severity: "error",
        message: "ESLint violations found",
        remediation: "Run ESLint manually to see detailed violations",
      });
    }
    return { gate: "lint", status: "fail", violations, duration_ms: Date.now() - start };
  }

  return { gate: "lint", status: "pass", violations, duration_ms: Date.now() - start };
}

async function runStylelintGate(moduleArg: string): Promise<GateResult> {
  const start = Date.now();

  const cssGlob = `${moduleArg.replace(/\\/g, "/")}/src/**/*.css`;

  // Run with JSON formatter for structured output
  const result = await run("pnpm", ["exec", "stylelint", cssGlob, "--formatter", "json"]);

  if (result.exitCode !== 0) {
    const output = (result.stdout + result.stderr).trim();

    if (output.includes("No files matching")) {
      return { gate: "stylelint", status: "pass", violations: [], duration_ms: Date.now() - start };
    }

    const violations = parseStylelintJson(result.stdout);

    if (violations.length === 0) {
      violations.push({
        gate: "stylelint",
        severity: "error",
        message: "Token compliance violations found",
        remediation: "Run stylelint manually to see detailed violations",
      });
    }

    return { gate: "stylelint", status: "fail", violations, duration_ms: Date.now() - start };
  }

  return { gate: "stylelint", status: "pass", violations: [], duration_ms: Date.now() - start };
}

async function runTestGate(absoluteModulePath: string): Promise<GateResult> {
  const start = Date.now();
  const allViolations: GateViolation[] = [];

  // Run vitest with JSON reporter for structured output
  const result = await run(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "--coverage",
      "--coverage.reporter=json-summary",
      "--coverage.reporter=json",
      "--coverage.reportsDirectory=coverage",
      "--reporter",
      "json",
    ],
    absoluteModulePath,
  );

  if (result.exitCode !== 0) {
    const testViolations = parseVitestJson(result.stdout);
    allViolations.push(...testViolations);

    if (allViolations.length === 0) {
      allViolations.push({
        gate: "test",
        severity: "error",
        message: "Test failures or insufficient coverage",
        remediation: "Run vitest manually to see detailed failures",
      });
    }
  }

  // Check coverage JSON if available
  const coverageCandidates = [
    resolve(absoluteModulePath, "coverage/coverage-final.json"),
    resolve(absoluteModulePath, "coverage/coverage-summary.json"),
  ];

  for (const coveragePath of coverageCandidates) {
    if (existsSync(coveragePath)) {
      try {
        const coverageJson = readFileSync(coveragePath, "utf-8");
        const coverageViolations = parseCoverageJson(coverageJson, 80);
        allViolations.push(...coverageViolations);
        break;
      } catch {
        // Coverage file unreadable; try next candidate.
      }
    }
  }

  const hasErrors = allViolations.some((v) => v.severity === "error");

  return {
    gate: "test",
    status: result.exitCode !== 0 || hasErrors ? "fail" : "pass",
    violations: allViolations,
    duration_ms: Date.now() - start,
  };
}

async function runAccessibilityGate(absoluteModulePath: string): Promise<GateResult> {
  const start = Date.now();

  const playwrightConfigPath = resolve(absoluteModulePath, "playwright-ct.config.ts");
  const playwrightHarnessPath = resolve(absoluteModulePath, "playwright/index.tsx");

  if (!existsSync(playwrightConfigPath) || !existsSync(playwrightHarnessPath)) {
    return {
      gate: "accessibility",
      status: "fail",
      violations: [{
        gate: "accessibility",
        severity: "error",
        message: "Missing Playwright component-test configuration required for axe-core validation",
        remediation: "Add playwright-ct.config.ts and playwright/index.tsx to the module",
      }],
      duration_ms: Date.now() - start,
    };
  }

  const sourceDirectory = resolve(absoluteModulePath, "src");
  const accessibilitySpecs = collectFiles(sourceDirectory, (fp) => fp.endsWith(".spec.tsx"));

  if (accessibilitySpecs.length === 0) {
    return {
      gate: "accessibility",
      status: "fail",
      violations: [{
        gate: "accessibility",
        severity: "error",
        message: "No component accessibility tests (*.spec.tsx) found",
        remediation: "Add Playwright accessibility tests with axe-core assertions",
      }],
      duration_ms: Date.now() - start,
    };
  }

  const result = await run(
    "pnpm",
    ["exec", "playwright", "test", "-c", "playwright-ct.config.ts"],
    absoluteModulePath,
  );

  if (result.exitCode !== 0) {
    return {
      gate: "accessibility",
      status: "fail",
      violations: [{
        gate: "accessibility",
        severity: "error",
        message: "axe-core component accessibility check failed",
        remediation: "Run playwright test manually to see accessibility violations",
      }],
      duration_ms: Date.now() - start,
    };
  }

  return { gate: "accessibility", status: "pass", violations: [], duration_ms: Date.now() - start };
}

async function runManifestGate(absoluteModulePath: string): Promise<GateResult> {
  const start = Date.now();

  const manifestPath = resolve(absoluteModulePath, "src/manifest.ts");
  if (!existsSync(manifestPath)) {
    return {
      gate: "manifest",
      status: "fail",
      violations: [{
        gate: "manifest",
        severity: "error",
        message: "No src/manifest.ts found",
        remediation: "Create a manifest.ts file exporting a manifest object",
      }],
      duration_ms: Date.now() - start,
    };
  }

  try {
    const manifestModule = (await import(
      pathToFileURL(manifestPath).href
    )) as { manifest?: Record<string, unknown> };
    const { manifest } = manifestModule;

    if (!manifest) {
      return {
        gate: "manifest",
        status: "fail",
        violations: [{
          gate: "manifest",
          severity: "error",
          message: "No 'manifest' named export found",
          remediation: "Add `export const manifest = { ... }` to manifest.ts",
        }],
        duration_ms: Date.now() - start,
      };
    }

    const validatePath = resolve(ROOT, "packages/shell-api/src/index.ts");
    const { validateManifest } = (await import(
      pathToFileURL(validatePath).href
    )) as {
      validateManifest: (manifest: unknown) => ManifestValidationResult;
    };

    const result = validateManifest(manifest);

    const violations = [
      ...mapManifestErrors(result.errors, "error"),
      ...mapManifestErrors(result.warnings, "warning"),
    ];

    return {
      gate: "manifest",
      status: result.valid ? "pass" : "fail",
      violations,
      duration_ms: Date.now() - start,
    };
  } catch (error: unknown) {
    const e = error as Error;
    return {
      gate: "manifest",
      status: "fail",
      violations: [{
        gate: "manifest",
        severity: "error",
        message: `Validation error: ${e.message}`,
        remediation: "Fix the error in manifest.ts and ensure it exports a valid manifest",
      }],
      duration_ms: Date.now() - start,
    };
  }
}

// ─── Output ───

function outputReport(report: ValidationReport, args: CliArgs): void {
  if (args.format === "json") {
    const json = formatJson(report);
    if (args.output) {
      writeFileSync(args.output, json, "utf-8");
    } else {
      console.log(json);
    }
  } else {
    console.log(formatText(report));
  }
}

// ─── Main ───

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);

  if (!cliArgs) {
    console.log("Usage: tsx scripts/validate-module.ts <module-path> [--format text|json] [--output <path>]");
    console.log("");
    console.log("Options:");
    console.log("  --format text|json  Output format (default: text)");
    console.log("  --output <path>     Write JSON report to file (requires --format json)");
    console.log("  --help              Show this help message");
    console.log("");
    console.log("Example: tsx scripts/validate-module.ts modules/hexalith-orders --format json");
    process.exit(process.argv.includes("--help") ? 0 : 1);
  }

  const absoluteModulePath = resolve(ROOT, cliArgs.modulePath);

  if (!existsSync(absoluteModulePath)) {
    console.error(`Module not found: ${cliArgs.modulePath}`);
    process.exit(1);
  }

  const pkgJsonPath = resolve(absoluteModulePath, "package.json");
  if (!existsSync(pkgJsonPath)) {
    console.error(`No package.json found in ${cliArgs.modulePath}`);
    process.exit(1);
  }

  const pkg = readJsonFile<{
    name: string;
    peerDependencies?: Record<string, string>;
  }>(pkgJsonPath);
  const packageName = pkg.name;

  const requiredWorkspacePeers = [
    getWorkspacePackageVersion("packages/shell-api"),
    getWorkspacePackageVersion("packages/cqrs-client"),
    getWorkspacePackageVersion("packages/ui"),
  ].map((wp) => ({
    name: wp.name,
    expectedRange: `^${wp.version}`,
  }));

  // Run all gates sequentially and aggregate all failures into a single report.
  const gates: GateResult[] = [];

  gates.push(runDependencyGate(pkg, requiredWorkspacePeers));
  gates.push(await runBuildGate(packageName));
  gates.push(await runEslintGate(cliArgs.modulePath, absoluteModulePath));
  gates.push(await runStylelintGate(cliArgs.modulePath));
  gates.push(await runTestGate(absoluteModulePath));
  gates.push(await runAccessibilityGate(absoluteModulePath));
  gates.push(await runManifestGate(absoluteModulePath));

  const report = buildReport(packageName, cliArgs.modulePath, gates);
  outputReport(report, cliArgs);
  process.exitCode = report.overall === "fail" ? 1 : 0;
}

// Only run when executed directly (not when imported by tests)
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main();
}
