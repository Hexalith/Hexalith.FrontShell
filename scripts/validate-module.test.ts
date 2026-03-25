/**
 * validate-module.test.ts
 * Tests for the module validation script's parsing, formatting, and CLI logic.
 * AC: 7-4#1, 7-4#6
 */

import { describe, it, expect } from "vitest";

import {
  parseArgs,
  buildReport,
  parseTscOutput,
  parseEslintJson,
  parseStylelintJson,
  parseCoverageJson,
  parseVitestJson,
  mapManifestErrors,
  formatText,
  formatJson,
} from "./validate-module.js";
import type { GateResult, GateViolation } from "./validate-module.js";

// ─── Task 1: CLI arg parsing and report building ─── AC: 7-4#1, 7-4#6

describe("parseArgs", () => {
  it("parses module path as first positional argument", () => {
    const result = parseArgs(["node", "validate-module.ts", "modules/hexalith-orders"]);
    expect(result).toEqual({
      modulePath: "modules/hexalith-orders",
      format: "text",
      output: undefined,
    });
  });

  it("parses --format json flag", () => {
    const result = parseArgs([
      "node", "validate-module.ts", "modules/hexalith-orders", "--format", "json",
    ]);
    expect(result?.format).toBe("json");
  });

  it("parses --format text flag (explicit default)", () => {
    const result = parseArgs([
      "node", "validate-module.ts", "--format", "text", "modules/hexalith-orders",
    ]);
    expect(result?.format).toBe("text");
  });

  it("parses --output flag", () => {
    const result = parseArgs([
      "node", "validate-module.ts", "modules/test", "--format", "json", "--output", "report.json",
    ]);
    expect(result?.output).toBe("report.json");
  });

  it("returns null for --help", () => {
    expect(parseArgs(["node", "validate-module.ts", "--help"])).toBeNull();
  });

  it("returns null when no arguments", () => {
    expect(parseArgs(["node", "validate-module.ts"])).toBeNull();
  });

  it("defaults format to text", () => {
    const result = parseArgs(["node", "validate-module.ts", "modules/test"]);
    expect(result?.format).toBe("text");
  });

  it("handles flags in any order", () => {
    const result = parseArgs([
      "node", "validate-module.ts", "--output", "out.json", "--format", "json", "modules/test",
    ]);
    expect(result).toEqual({
      modulePath: "modules/test",
      format: "json",
      output: "out.json",
    });
  });
});

describe("buildReport", () => {
  it("builds report with all gates passing", () => {
    const gates: GateResult[] = [
      { gate: "dependency", status: "pass", violations: [], duration_ms: 10 },
      { gate: "build", status: "pass", violations: [], duration_ms: 5000 },
    ];
    const report = buildReport("test-module", "/path/to/module", gates);
    expect(report.overall).toBe("pass");
    expect(report.summary).toEqual({
      total_gates: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
      total_violations: 0,
      total_errors: 0,
      total_warnings: 0,
    });
    expect(report.module).toBe("test-module");
    expect(report.modulePath).toBe("/path/to/module");
    expect(report.timestamp).toBeTruthy();
  });

  it("reports overall fail when any gate fails", () => {
    const violation: GateViolation = {
      gate: "build",
      severity: "error",
      message: "Build failed",
      file: "src/index.ts",
      line: 42,
    };
    const gates: GateResult[] = [
      { gate: "dependency", status: "pass", violations: [], duration_ms: 10 },
      { gate: "build", status: "fail", violations: [violation], duration_ms: 5000 },
    ];
    const report = buildReport("test", "/path", gates);
    expect(report.overall).toBe("fail");
    expect(report.summary.failed).toBe(1);
    expect(report.summary.passed).toBe(1);
    expect(report.summary.total_violations).toBe(1);
    expect(report.summary.total_errors).toBe(1);
    expect(report.summary.total_warnings).toBe(0);
  });

  it("counts warnings separately from errors", () => {
    const warning: GateViolation = {
      gate: "coverage",
      severity: "warning",
      message: "Low coverage",
    };
    const gates: GateResult[] = [
      { gate: "test", status: "pass", violations: [warning], duration_ms: 100 },
    ];
    const report = buildReport("test", "/path", gates);
    expect(report.summary.total_warnings).toBe(1);
    expect(report.summary.total_errors).toBe(0);
  });

  it("handles skipped gates", () => {
    const gates: GateResult[] = [
      { gate: "stylelint", status: "skip", violations: [], duration_ms: 0 },
    ];
    const report = buildReport("test", "/path", gates);
    expect(report.summary.skipped).toBe(1);
    expect(report.overall).toBe("pass");
  });
});

// ─── Task 2: TypeScript error parsing ─── AC: 7-4#1

describe("parseTscOutput", () => {
  it("parses standard TypeScript error format", () => {
    const output = `src/pages/OrderListPage.tsx(42,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'`;
    const violations = parseTscOutput(output);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      gate: "build",
      severity: "error",
      file: "src/pages/OrderListPage.tsx",
      line: 42,
      column: 5,
      rule: "TS2345",
      message: "Argument of type 'string' is not assignable to parameter of type 'number'",
    });
    expect(violations[0].remediation).toBeTruthy();
  });

  it("parses multiple TypeScript errors", () => {
    const output = [
      "src/index.ts(1,10): error TS2305: Module has no exported member 'Foo'",
      "src/pages/Detail.tsx(15,3): error TS2322: Type 'string' is not assignable to type 'number'",
    ].join("\n");
    const violations = parseTscOutput(output);
    expect(violations).toHaveLength(2);
    expect(violations[0].file).toBe("src/index.ts");
    expect(violations[1].file).toBe("src/pages/Detail.tsx");
  });

  it("returns empty array for clean output", () => {
    expect(parseTscOutput("Build succeeded")).toEqual([]);
    expect(parseTscOutput("")).toEqual([]);
  });

  it("ignores non-error lines in mixed output", () => {
    const output = [
      "turbo: Starting build...",
      "src/broken.ts(10,1): error TS1005: ';' expected",
      "turbo: Build failed.",
    ].join("\n");
    const violations = parseTscOutput(output);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("TS1005");
  });
});

// ─── Task 3: ESLint JSON parsing ─── AC: 7-4#1, 7-4#4

describe("parseEslintJson", () => {
  it("parses ESLint JSON output with violations", () => {
    const json = JSON.stringify([{
      filePath: "src/pages/OrderListPage.tsx",
      messages: [{
        ruleId: "@hexalith/no-direct-radix",
        line: 3,
        column: 1,
        message: "Direct import of @radix-ui/react-dialog is not allowed",
        severity: 2,
      }],
    }]);
    const violations = parseEslintJson(json);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      gate: "lint",
      severity: "error",
      file: "src/pages/OrderListPage.tsx",
      line: 3,
      column: 1,
      rule: "@hexalith/no-direct-radix",
    });
  });

  it("suggests @hexalith/ui alternative for Radix imports", () => {
    const json = JSON.stringify([{
      filePath: "src/index.ts",
      messages: [{
        ruleId: "import/restricted",
        line: 1,
        column: 1,
        message: "Import from @radix-ui/react-dialog is restricted",
        severity: 2,
      }],
    }]);
    const violations = parseEslintJson(json);
    expect(violations[0].remediation).toContain("<Modal>");
    expect(violations[0].remediation).toContain("@hexalith/ui");
  });

  it("handles multiple files with multiple messages", () => {
    const json = JSON.stringify([
      {
        filePath: "src/a.ts",
        messages: [
          { ruleId: "rule-a", line: 1, column: 1, message: "msg a", severity: 2 },
          { ruleId: "rule-b", line: 5, column: 3, message: "msg b", severity: 1 },
        ],
      },
      {
        filePath: "src/b.ts",
        messages: [
          { ruleId: "rule-c", line: 10, column: 1, message: "msg c", severity: 2 },
        ],
      },
    ]);
    const violations = parseEslintJson(json);
    expect(violations).toHaveLength(3);
    expect(violations[1].severity).toBe("warning"); // severity 1 = warning
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseEslintJson("not json")).toEqual([]);
  });

  it("returns empty array for clean output", () => {
    const json = JSON.stringify([{
      filePath: "src/clean.ts",
      messages: [],
    }]);
    expect(parseEslintJson(json)).toEqual([]);
  });
});

// ─── Task 4: Stylelint JSON parsing ─── AC: 7-4#1, 7-4#3

describe("parseStylelintJson", () => {
  it("parses Stylelint JSON output", () => {
    const json = JSON.stringify([{
      source: "src/pages/OrderList.module.css",
      warnings: [{
        rule: "custom-property-pattern",
        line: 12,
        column: 3,
        text: "Expected custom property pattern for color #f5f5f5",
        severity: "error",
      }],
    }]);
    const violations = parseStylelintJson(json);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      gate: "stylelint",
      severity: "error",
      file: "src/pages/OrderList.module.css",
      line: 12,
      column: 3,
      rule: "custom-property-pattern",
    });
  });

  it("suggests token replacement for hardcoded hex colors", () => {
    const json = JSON.stringify([{
      source: "src/test.css",
      warnings: [{
        rule: "custom-property-pattern",
        line: 5,
        column: 3,
        text: "Found hardcoded color #f5f5f5",
        severity: "error",
      }],
    }]);
    const violations = parseStylelintJson(json);
    expect(violations[0].actual).toBe("#f5f5f5");
    expect(violations[0].expected).toBe("var(--color-text-primary)");
    expect(violations[0].remediation).toContain("var(--color-text-primary)");
  });

  it("suggests token replacement for hardcoded px spacing", () => {
    const json = JSON.stringify([{
      source: "src/test.css",
      warnings: [{
        rule: "custom-property-pattern",
        line: 8,
        column: 3,
        text: "Expected custom property instead of 16px",
        severity: "warning",
      }],
    }]);
    const violations = parseStylelintJson(json);
    expect(violations[0].actual).toBe("16px");
    expect(violations[0].expected).toBe("var(--spacing-4)");
    expect(violations[0].remediation).toContain("var(--spacing-4)");
  });

  it("suggests semantic font-size tokens for typography violations", () => {
    const json = JSON.stringify([{
      source: "src/test.css",
      warnings: [{
        rule: "hexalith/no-hardcoded-typography",
        line: 3,
        column: 1,
        text: 'Font-size "20px" is not in the 7-step type scale. Use a font-size token (e.g., var(--font-size-body)).',
        severity: "error",
      }],
    }]);

    const violations = parseStylelintJson(json);
    expect(violations[0].actual).toBe("20px");
    expect(violations[0].expected).toBe("var(--font-size-md)");
    expect(violations[0].remediation).toContain("var(--font-size-md)");
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseStylelintJson("not json")).toEqual([]);
  });

  it("returns empty array for clean output", () => {
    expect(parseStylelintJson(JSON.stringify([{ source: "f.css", warnings: [] }]))).toEqual([]);
  });
});

// ─── Task 5: Coverage and test JSON parsing ─── AC: 7-4#1, 7-4#5

describe("parseCoverageJson", () => {
  it("reports files below threshold", () => {
    const json = JSON.stringify({
      total: { lines: { pct: 85 }, branches: { pct: 90 }, functions: { pct: 82 }, statements: { pct: 88 } },
      "src/pages/OrderCreatePage.tsx": {
        lines: { pct: 65 },
        branches: { pct: 50 },
        functions: { pct: 70 },
        statements: { pct: 60 },
      },
    });
    const violations = parseCoverageJson(json, 80);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toMatchObject({
      gate: "coverage",
      severity: "warning",
      file: "src/pages/OrderCreatePage.tsx",
    });
    expect(violations[0].actual).toContain("65%");
    expect(violations[0].expected).toContain("80%");
  });

  it("returns empty for files meeting threshold", () => {
    const json = JSON.stringify({
      total: { lines: { pct: 95 }, branches: { pct: 90 }, functions: { pct: 85 }, statements: { pct: 92 } },
      "src/good.ts": {
        lines: { pct: 95 },
        branches: { pct: 90 },
        functions: { pct: 85 },
        statements: { pct: 92 },
      },
    });
    expect(parseCoverageJson(json, 80)).toEqual([]);
  });

  it("skips the total entry", () => {
    const json = JSON.stringify({
      total: { lines: { pct: 50 }, branches: { pct: 50 }, functions: { pct: 50 }, statements: { pct: 50 } },
    });
    expect(parseCoverageJson(json, 80)).toEqual([]);
  });

  it("returns empty for invalid JSON", () => {
    expect(parseCoverageJson("bad", 80)).toEqual([]);
  });

  it("lists uncovered functions from detailed coverage output", () => {
    const json = JSON.stringify({
      "src/pages/OrderCreatePage.tsx": {
        statementMap: {
          0: { start: { line: 10, column: 0 }, end: { line: 10, column: 10 } },
          1: { start: { line: 20, column: 0 }, end: { line: 20, column: 12 } },
        },
        s: { 0: 1, 1: 0 },
        branchMap: {
          0: {
            locations: [
              { start: { line: 10, column: 0 }, end: { line: 10, column: 5 } },
              { start: { line: 10, column: 6 }, end: { line: 10, column: 10 } },
            ],
          },
        },
        b: { 0: [1, 0] },
        fnMap: {
          0: { name: "renderForm", line: 10 },
          1: { name: "submitOrder", line: 20 },
        },
        f: { 0: 1, 1: 0 },
      },
    });

    const violations = parseCoverageJson(json, 80);
    expect(violations.some((violation) => violation.message.includes("functions coverage"))).toBe(true);
    expect(violations).toContainEqual(expect.objectContaining({
      gate: "coverage",
      rule: "functions.uncovered",
      message: expect.stringContaining("submitOrder (line 20)"),
    }));
  });
});

describe("parseVitestJson", () => {
  it("parses failing test results", () => {
    const json = JSON.stringify({
      testResults: [{
        name: "src/pages/OrderList.test.tsx",
        status: "failed",
        assertionResults: [{
          fullName: "OrderList renders table with data",
          status: "failed",
          failureMessages: ["Expected 3 rows but found 0"],
        }],
      }],
    });
    const violations = parseVitestJson(json);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      gate: "test",
      severity: "error",
      file: "src/pages/OrderList.test.tsx",
    });
    expect(violations[0].message).toContain("OrderList renders table with data");
  });

  it("ignores passing test suites", () => {
    const json = JSON.stringify({
      testResults: [{
        name: "src/good.test.ts",
        status: "passed",
        assertionResults: [{ fullName: "works", status: "passed" }],
      }],
    });
    expect(parseVitestJson(json)).toEqual([]);
  });

  it("returns empty for invalid JSON", () => {
    expect(parseVitestJson("bad")).toEqual([]);
  });

  it("handles missing testResults", () => {
    expect(parseVitestJson(JSON.stringify({}))).toEqual([]);
  });
});

// ─── Task 6: Manifest error mapping ─── AC: 7-4#1, 7-4#2

describe("mapManifestErrors", () => {
  it("maps manifest errors to GateViolations with examples", () => {
    const errors = [
      { field: "name", message: "name must be lowercase kebab-case (e.g., my-module)" },
    ];
    const violations = mapManifestErrors(errors, "error");
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      gate: "manifest",
      severity: "error",
      rule: "name",
      message: "name must be lowercase kebab-case (e.g., my-module)",
    });
    expect(violations[0].expected).toContain("kebab-case");
    expect(violations[0].remediation).toContain("my-module");
  });

  it("maps warnings with correct severity", () => {
    const warnings = [
      { field: "navigation[0].path", message: 'path "/foo" does not match any declared route' },
    ];
    const violations = mapManifestErrors(warnings, "warning");
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe("warning");
  });

  it("handles unknown fields gracefully", () => {
    const errors = [
      { field: "unknownField", message: "invalid" },
    ];
    const violations = mapManifestErrors(errors, "error");
    expect(violations[0].remediation).toBe("invalid");
  });

  it("maps version field with example", () => {
    const errors = [
      { field: "version", message: "version must be a valid semver string" },
    ];
    const violations = mapManifestErrors(errors, "error");
    expect(violations[0].expected).toContain("semver");
    expect(violations[0].remediation).toContain("1.0.0");
  });
});

// ─── Tasks 7 & 8: Formatters ─── AC: 7-4#6

describe("formatJson", () => {
  it("returns valid JSON matching ValidationReport schema", () => {
    const report = buildReport("test", "/path", [
      { gate: "build", status: "pass", violations: [], duration_ms: 100 },
    ]);
    const output = formatJson(report);
    const parsed = JSON.parse(output);
    expect(parsed.module).toBe("test");
    expect(parsed.overall).toBe("pass");
    expect(parsed.gates).toHaveLength(1);
    expect(parsed.summary.total_gates).toBe(1);
  });

  it("includes all violation details in JSON", () => {
    const violation: GateViolation = {
      gate: "build",
      severity: "error",
      file: "src/index.ts",
      line: 10,
      column: 5,
      rule: "TS2345",
      message: "Type error",
      expected: "number",
      actual: "string",
      remediation: "Fix type",
    };
    const report = buildReport("test", "/path", [
      { gate: "build", status: "fail", violations: [violation], duration_ms: 50 },
    ]);
    const parsed = JSON.parse(formatJson(report));
    const v = parsed.gates[0].violations[0];
    expect(v.file).toBe("src/index.ts");
    expect(v.line).toBe(10);
    expect(v.column).toBe(5);
    expect(v.rule).toBe("TS2345");
    expect(v.expected).toBe("number");
    expect(v.actual).toBe("string");
    expect(v.remediation).toBe("Fix type");
  });
});

describe("formatText", () => {
  it("includes gate name and PASS for passing gates", () => {
    const report = buildReport("test-module", "modules/test", [
      { gate: "manifest", status: "pass", violations: [], duration_ms: 10 },
    ]);
    const output = formatText(report);
    expect(output).toContain("Manifest");
    expect(output).toContain("PASS");
  });

  it("includes file:line and remediation for violations", () => {
    const violation: GateViolation = {
      gate: "build",
      severity: "error",
      file: "src/pages/OrderListPage.tsx",
      line: 42,
      column: 5,
      message: "TS2345: Type mismatch",
      rule: "TS2345",
      remediation: "Check the type of the argument",
    };
    const report = buildReport("test", "modules/test", [
      { gate: "build", status: "fail", violations: [violation], duration_ms: 100 },
    ]);
    const output = formatText(report);
    expect(output).toContain("src/pages/OrderListPage.tsx:42:5");
    expect(output).toContain("TS2345");
    expect(output).toContain("Fix: Check the type of the argument");
  });

  it("includes summary line with fail counts", () => {
    const report = buildReport("test", "modules/test", [
      { gate: "build", status: "fail", violations: [{
        gate: "build", severity: "error", message: "fail",
      }], duration_ms: 100 },
      { gate: "lint", status: "pass", violations: [], duration_ms: 50 },
    ]);
    const output = formatText(report);
    expect(output).toContain("RESULT: FAIL");
    expect(output).toContain("1 gate(s) failed");
  });

  it("shows PASS summary when all gates pass", () => {
    const report = buildReport("test", "modules/test", [
      { gate: "build", status: "pass", violations: [], duration_ms: 100 },
    ]);
    const output = formatText(report);
    expect(output).toContain("RESULT: PASS");
  });

  it("shows SKIP for skipped gates", () => {
    const report = buildReport("test", "modules/test", [
      { gate: "stylelint", status: "skip", violations: [], duration_ms: 0 },
    ]);
    const output = formatText(report);
    expect(output).toContain("SKIP");
  });

  it("shows module name and path in header", () => {
    const report = buildReport("@hexalith/orders", "modules/hexalith-orders", []);
    const output = formatText(report);
    expect(output).toContain("@hexalith/orders");
    expect(output).toContain("modules/hexalith-orders");
  });
});
