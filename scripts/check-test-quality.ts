/**
 * check-test-quality.ts
 * Validates test files against reliability standards:
 *   - Deterministic: No uncontrolled setTimeout, Date.now, etc.
 *   - Isolated: Proper setup/teardown patterns
 *   - Explicit: Every test file has assertions
 *   - Focused: Files ≤ 300 lines
 *   - Fast: No network client imports in test files
 *
 * Usage:
 *   pnpm tsx scripts/check-test-quality.ts [--changed-only|--all|--help]
 *
 * Default: --changed-only
 *
 * Exit codes:
 *   0 - No failures (warnings are OK)
 *   1 - One or more failures found
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// ─── Configuration ───

const WARN_LINE_LIMIT = 250;
const FAIL_LINE_LIMIT = 300;

const DETERMINISTIC_PATTERNS = [
  /\bsetTimeout\s*\(/,
  /\bsetInterval\s*\(/,
  /\bnew Date\s*\(\s*\)/,
  /\bDate\.now\s*\(\s*\)/,
];

const DETERMINISTIC_ALLOW_PATTERNS = [
  /vi\.useFakeTimers/,
  /vi\.advanceTimersByTime/,
];

const NETWORK_IMPORTS = [
  /\bimport\b.*\bfetch\b/,
  /\bimport\b.*\baxios\b/,
  /\brequire\s*\(\s*['"]axios['"]\s*\)/,
  /\bimport\b.*\bky\b/,
  /\bimport\b.*\bnode-fetch\b/,
  /\bimport\b.*\bundici\b/,
];

// ─── Types ───

interface Violation {
  file: string;
  line?: number;
  check: string;
  message: string;
  remediation: string;
  severity: "warn" | "fail";
}

// ─── CLI Argument Parsing ───

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log("Usage: pnpm tsx scripts/check-test-quality.ts [--changed-only|--all|--help]");
  console.log("");
  console.log("Validates test files against reliability standards.");
  console.log("");
  console.log("Options:");
  console.log("  --changed-only  Check only test files changed vs origin/main (default)");
  console.log("  --all           Check all test files in the workspace");
  console.log("  --help          Show this help message");
  process.exit(0);
}

const scanAll = args.includes("--all");

// ─── File Discovery ───

function resolveBaselineRef(): string | undefined {
  const canResolve = (ref: string): boolean => {
    try {
      execFileSync("git", ["rev-parse", "--verify", ref], {
        stdio: "ignore",
      });
      return true;
    } catch {
      return false;
    }
  };

  if (canResolve("origin/main")) {
    return "origin/main";
  }

  if (canResolve("main")) {
    return "main";
  }

  try {
    execFileSync("git", ["-c", "credential.interactive=never", "fetch", "origin", "main", "--depth=1"], {
      stdio: "ignore",
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GCM_INTERACTIVE: "never",
      },
    });
  } catch {
    // Local/manual run without remote access — continue with local diff sources
  }

  if (canResolve("origin/main")) {
    return "origin/main";
  }

  return undefined;
}

function getChangedTestFiles(): string[] {
  const changed = new Set<string>();
  const baselineRef = resolveBaselineRef();

  const collect = (args: string[]): void => {
    try {
      const output = execFileSync("git", args).toString();
      for (const file of output.split("\n")) {
        if (file.match(/\.(test|spec)\.(ts|tsx)$/) && file.trim() !== "") {
          changed.add(file);
        }
      }
    } catch {
      // Ignore and continue collecting from other git sources
    }
  };

  if (baselineRef) {
    collect(["diff", "--name-only", `${baselineRef}...HEAD`]);
  }
  collect(["diff", "--name-only"]);
  collect(["diff", "--cached", "--name-only"]);
  collect(["ls-files", "--others", "--exclude-standard"]);

  if (changed.size === 0) {
    console.error("⚠ Could not determine changed files — falling back to --all");
    return getAllTestFiles();
  }

  return [...changed].sort();
}

function getAllTestFiles(): string[] {
  const output = execFileSync("git", ["ls-files"]).toString();
  return output
    .split("\n")
    .filter((f) => f.match(/\.(test|spec)\.(ts|tsx)$/))
    .filter((f) => f.trim() !== "");
}

// ─── Checks ───

function isQualityIgnored(lines: string[], lineIndex: number): boolean {
  if (lineIndex === 0) return false;
  return lines[lineIndex - 1].trim() === "// quality-ignore";
}

function isMockOrFixturePath(file: string): boolean {
  return /\bmocks?\b/.test(file) || /\bfixtures?\b/.test(file);
}

function isContractPath(file: string): boolean {
  return /\b__contracts__\b/.test(file) || /\bcontracts\b/.test(file);
}

function checkDeterministic(file: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];

  // Check if file uses fake timers (allowed pattern)
  const hasFakeTimers = lines.some((line) =>
    DETERMINISTIC_ALLOW_PATTERNS.some((p) => p.test(line)),
  );

  for (let i = 0; i < lines.length; i++) {
    if (isQualityIgnored(lines, i)) continue;

    const line = lines[i];
    for (const pattern of DETERMINISTIC_PATTERNS) {
      if (!pattern.test(line)) continue;

      // Allow setTimeout in mock/fixture files
      if (pattern.source.includes("setTimeout") && isMockOrFixturePath(file)) continue;

      // Allow if file uses fake timers
      if (hasFakeTimers && pattern.source.includes("setTimeout")) continue;

      violations.push({
        file,
        line: i + 1,
        check: "deterministic",
        message: `${line.trim().slice(0, 60)} (${pattern.source.replace(/\\s\*\\\(/g, "(")})`,
        remediation:
          "Inject time or timers into the code under test, or add // quality-ignore with a justification for controlled timing behavior.",
        severity: "warn",
      });
    }
  }

  return violations;
}

function checkIsolation(file: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  let hasBeforeAll = false;
  let hasAfterAll = false;
  let beforeAllLine: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    if (/\bbeforeAll\s*\(/.test(lines[i])) {
      hasBeforeAll = true;
      beforeAllLine ??= i + 1;
    }
    if (/\bafterAll\s*\(/.test(lines[i])) hasAfterAll = true;
  }

  if (hasBeforeAll && !hasAfterAll) {
    violations.push({
      file,
      line: beforeAllLine,
      check: "isolation",
      message: "beforeAll without matching afterAll — shared state may leak between tests",
      remediation:
        "Add afterAll cleanup for any suite-level setup, or move mutable state into beforeEach/afterEach to keep tests isolated.",
      severity: "warn",
    });
  }

  return violations;
}

function checkExplicit(file: string, lines: string[]): Violation[] {
  const firstTestLine = lines.findIndex(
    (line) => /\bit\s*\(/.test(line) || /\btest\s*\(/.test(line),
  );
  const hasTestBlocks = firstTestLine !== -1;
  const hasAssertions = lines.some((line) => /\bexpect\s*\(/.test(line));

  if (hasTestBlocks && !hasAssertions) {
    return [
      {
        file,
        line: firstTestLine + 1,
        check: "explicit",
        message: "Test file has test blocks but zero expect() assertions",
        remediation:
          "Add at least one expect() assertion per file, or convert declaration-only type checks to compile-time assertions outside runtime test blocks.",
        severity: "fail",
      },
    ];
  }

  return [];
}

function checkFocused(file: string, lines: string[]): Violation[] {
  const lineCount = lines.length;

  if (lineCount > FAIL_LINE_LIMIT) {
    return [
      {
        file,
        line: lineCount,
        check: "focused",
        message: `${lineCount} lines (> ${FAIL_LINE_LIMIT} limit)`,
        remediation:
          "Split this file into smaller suites or helper utilities so each test file stays at or below 300 lines.",
        severity: "fail",
      },
    ];
  }

  if (lineCount > WARN_LINE_LIMIT) {
    return [
      {
        file,
        line: lineCount,
        check: "focused",
        message: `${lineCount} lines (approaching ${FAIL_LINE_LIMIT} limit)`,
        remediation:
          "Consider splitting this test file before it grows past the hard 300-line limit.",
        severity: "warn",
      },
    ];
  }

  return [];
}

function checkSpeed(file: string, lines: string[]): Violation[] {
  // Allow network imports in contract test files
  if (isContractPath(file)) return [];

  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (isQualityIgnored(lines, i)) continue;

    const line = lines[i];
    for (const pattern of NETWORK_IMPORTS) {
      if (pattern.test(line)) {
        violations.push({
          file,
          line: i + 1,
          check: "speed",
          message: `Network client import detected: ${line.trim().slice(0, 60)}`,
          remediation:
            "Replace real network clients with mocks, or keep transport-shape verification inside __contracts__/ or contracts/ test files only.",
          severity: "warn",
        });
      }
    }
  }

  return violations;
}

// ─── Main ───

const testFiles = scanAll ? getAllTestFiles() : getChangedTestFiles();

if (testFiles.length === 0) {
  console.log("✅ No test files to check");
  process.exit(0);
}

let totalWarnings = 0;
let totalFailures = 0;
const output: string[] = [];

for (const file of testFiles) {
  let content: string;
  try {
    content = readFileSync(file, "utf-8");
  } catch {
    output.push(`⚠ SKIP: ${file} — could not read file`);
    continue;
  }

  const lines = content.split("\n");
  const violations = [
    ...checkDeterministic(file, lines),
    ...checkIsolation(file, lines),
    ...checkExplicit(file, lines),
    ...checkFocused(file, lines),
    ...checkSpeed(file, lines),
  ];

  if (violations.length === 0) {
    output.push(`✓ PASS: ${file} — all checks passed`);
    continue;
  }

  for (const v of violations) {
    const location = v.line ? `${v.file}:${v.line}` : v.file;
    if (v.severity === "fail") {
      output.push(
        `✗ FAIL: ${location} — ${v.message} (${v.check} violation) — Fix: ${v.remediation}`,
      );
      totalFailures++;
    } else {
      output.push(
        `⚠ WARN: ${location} — ${v.message} (${v.check} violation) — Fix: ${v.remediation}`,
      );
      totalWarnings++;
    }
  }
}

// ─── Summary ───

console.log(output.join("\n"));
console.log("");
console.log(
  `Summary: ${testFiles.length} files checked, ${totalWarnings} warning(s), ${totalFailures} failure(s)`,
);

process.exit(totalFailures > 0 ? 1 : 0);
