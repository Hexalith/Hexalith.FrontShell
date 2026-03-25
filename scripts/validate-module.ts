/**
 * validate-module.ts
 * Validates a single module against all quality gates:
 *   1. Dependency check — verify peerDependency ranges in package.json
 *   2. Build — turbo build (includes TypeScript compilation via tsup)
 *   3. ESLint — turbo lint (ESLint via workspace scripts)
 *   4. Stylelint — token compliance for CSS files
 *   5. Tests — vitest with coverage >= 80%
 *   6. Manifest — validateManifest from @hexalith/shell-api
 *
 * Usage:
 *   pnpm tsx scripts/validate-module.ts modules/hexalith-orders
 *
 * Exit codes:
 *   0 - All gates pass
 *   1 - Any gate fails
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Helpers ───

let passCount = 0;
let failCount = 0;

function pass(gate: string, detail: string): void {
  passCount++;
  console.log(`  ✅ PASS — ${gate}: ${detail}`);
}

function fail(gate: string, detail: string): void {
  failCount++;
  console.log(`  ❌ FAIL — ${gate}: ${detail}`);
}

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

async function run(
  command: string,
  args: string[],
  cwd?: string,
): Promise<ExecResult> {
  try {
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

function printTrailingOutput(result: ExecResult, maxLines = 15): void {
  const output = (result.stdout + "\n" + result.stderr).trim();
  if (!output) return;
  const lines = output.split("\n").slice(-maxLines);
  for (const line of lines) {
    console.log(`    ${line}`);
  }
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

function getWorkspacePackageVersion(relativePackagePath: string): WorkspacePackageVersion {
  const packageJson = readJsonFile<WorkspacePackageVersion>(
    resolve(ROOT, relativePackagePath, "package.json"),
  );
  return packageJson;
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

// ─── CLI ───

const moduleArg = process.argv[2];

if (!moduleArg || moduleArg === "--help") {
  console.log("Usage: tsx scripts/validate-module.ts <module-path>");
  console.log(
    "Example: tsx scripts/validate-module.ts modules/hexalith-orders",
  );
  process.exit(moduleArg === "--help" ? 0 : 1);
}

const absoluteModulePath = resolve(ROOT, moduleArg);

if (!existsSync(absoluteModulePath)) {
  console.error(`Module not found: ${moduleArg}`);
  process.exit(1);
}

const pkgJsonPath = resolve(absoluteModulePath, "package.json");
if (!existsSync(pkgJsonPath)) {
  console.error(`No package.json found in ${moduleArg}`);
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
].map((workspacePackage) => ({
  name: workspacePackage.name,
  expectedRange: `^${workspacePackage.version}`,
}));

console.log(`\n🔍 Module Validation: ${packageName}`);
console.log(`   Path: ${moduleArg}`);
console.log("═".repeat(60));

// ─── Gate 1: Dependency Check ───

function checkDependencies(): void {
  console.log("\n── Gate 1: Dependency Check ──");

  const peerDeps = pkg.peerDependencies;
  if (!peerDeps) {
    fail("Dependencies", "No peerDependencies found in package.json");
    return;
  }

  const missing = requiredWorkspacePeers.filter(({ name }) => !peerDeps[name]);
  const mismatched = requiredWorkspacePeers.filter(
    ({ name, expectedRange }) => peerDeps[name] && peerDeps[name] !== expectedRange,
  );

  if (missing.length > 0) {
    fail(
      "Dependencies",
      `Missing peerDependencies: ${missing.map(({ name }) => name).join(", ")}`,
    );
    return;
  }

  if (mismatched.length > 0) {
    fail(
      "Dependencies",
      mismatched
        .map(
          ({ name, expectedRange }) =>
            `${name} expected ${expectedRange}, found ${peerDeps[name]}`,
        )
        .join("; "),
    );
    return;
  }

  pass(
    "Dependencies",
    `All ${requiredWorkspacePeers.length} required peerDependencies match workspace ranges`,
  );
}

// ─── Gate 2: Build ───

async function checkBuild(): Promise<boolean> {
  console.log("\n── Gate 2: TypeScript Build ──");

  const result = await run("pnpm", [
    "turbo",
    "build",
    `--filter=${packageName}`,
  ]);

  if (result.exitCode !== 0) {
    fail("Build", "TypeScript build failed");
    printTrailingOutput(result);
    return false;
  }

  pass("Build", "Compilation succeeded");
  return true;
}

// ─── Gate 3: ESLint ───

async function checkEslint(): Promise<boolean> {
  console.log("\n── Gate 3: ESLint ──");

  const result = await run("pnpm", [
    "turbo",
    "lint",
    `--filter=${packageName}`,
  ]);

  if (result.exitCode !== 0) {
    fail("ESLint", "Lint violations found");
    printTrailingOutput(result);
    return false;
  }

  pass("ESLint", "No violations");
  return true;
}

// ─── Gate 4: Stylelint ───

async function checkStylelint(): Promise<boolean> {
  console.log("\n── Gate 4: Stylelint ──");

  const cssGlob = `${moduleArg.replace(/\\/g, "/")}/src/**/*.css`;
  const result = await run("pnpm", ["exec", "stylelint", cssGlob]);

  if (result.exitCode !== 0) {
    const output = (result.stdout + result.stderr).trim();

    if (output.includes("No files matching")) {
      pass("Stylelint", "No CSS files to check");
      return true;
    }

    fail("Stylelint", "Token compliance violations");
    printTrailingOutput(result);
    return false;
  }

  pass("Stylelint", "Token compliance 100%");
  return true;
}

// ─── Gate 5: Tests with Coverage ───

async function checkTests(): Promise<boolean> {
  console.log("\n── Gate 5: Vitest with Coverage ──");

  const result = await run(
    "pnpm",
    ["exec", "vitest", "run", "--coverage"],
    absoluteModulePath,
  );

  if (result.exitCode !== 0) {
    fail("Tests", "Test failures or insufficient coverage");
    printTrailingOutput(result, 25);
    return false;
  }

  pass("Tests", "All tests pass, coverage >= 80%");
  return true;
}

// ─── Gate 6: Accessibility ───

async function checkAccessibility(): Promise<boolean> {
  console.log("\n── Gate 6: Accessibility (axe-core) ──");

  const playwrightConfigPath = resolve(absoluteModulePath, "playwright-ct.config.ts");
  const playwrightHarnessPath = resolve(absoluteModulePath, "playwright/index.tsx");

  if (!existsSync(playwrightConfigPath) || !existsSync(playwrightHarnessPath)) {
    fail(
      "Accessibility",
      "Missing Playwright component-test configuration required for axe-core validation",
    );
    return false;
  }

  const sourceDirectory = resolve(absoluteModulePath, "src");
  const accessibilitySpecs = collectFiles(
    sourceDirectory,
    (filePath) => filePath.endsWith(".spec.tsx"),
  );

  if (accessibilitySpecs.length === 0) {
    fail("Accessibility", "No component accessibility tests (*.spec.tsx) found");
    return false;
  }

  const result = await run(
    "pnpm",
    ["exec", "playwright", "test", "-c", "playwright-ct.config.ts"],
    absoluteModulePath,
  );

  if (result.exitCode !== 0) {
    fail("Accessibility", "axe-core component accessibility check failed");
    printTrailingOutput(result, 25);
    return false;
  }

  pass("Accessibility", `${accessibilitySpecs.length} component accessibility test(s) passed`);
  return true;
}

// ─── Gate 7: Manifest Validation ───

async function checkManifest(): Promise<boolean> {
  console.log("\n── Gate 7: Manifest Validation ──");

  const manifestPath = resolve(absoluteModulePath, "src/manifest.ts");
  if (!existsSync(manifestPath)) {
    fail("Manifest", "No src/manifest.ts found");
    return false;
  }

  try {
    const manifestModule = (await import(
      pathToFileURL(manifestPath).href
    )) as { manifest?: Record<string, unknown> };
    const { manifest } = manifestModule;

    if (!manifest) {
      fail("Manifest", "No 'manifest' named export found");
      return false;
    }

    const validatePath = resolve(ROOT, "packages/shell-api/src/index.ts");
    const { validateManifest } = (await import(
      pathToFileURL(validatePath).href
    )) as {
      validateManifest: (manifest: unknown) => ManifestValidationResult;
    };

    const result = validateManifest(manifest);

    if (!result.valid) {
      fail(
        "Manifest",
        result.errors.map((e) => `${e.field}: ${e.message}`).join("; "),
      );
      return false;
    }

    if (result.warnings.length > 0) {
      console.log(
        `    ⚠️  ${result.warnings.map((w) => `${w.field}: ${w.message}`).join("; ")}`,
      );
    }

    pass("Manifest", "All fields valid");
    return true;
  } catch (error: unknown) {
    const e = error as Error;
    fail("Manifest", `Validation error: ${e.message}`);
    return false;
  }
}

// ─── Main ───

function printSummary(): void {
  console.log("\n" + "═".repeat(60));

  if (failCount > 0) {
    console.log(`❌ FAIL — ${failCount} gate(s) failed, ${passCount} passed`);
    process.exit(1);
  } else {
    console.log(`✅ PASS — All ${passCount} gates passed`);
    process.exit(0);
  }
}

async function main(): Promise<void> {
  checkDependencies();
  if (failCount > 0) return printSummary();

  if (!(await checkBuild())) return printSummary();
  if (!(await checkEslint())) return printSummary();
  if (!(await checkStylelint())) return printSummary();
  if (!(await checkTests())) return printSummary();
  if (!(await checkAccessibility())) return printSummary();
  await checkManifest();

  printSummary();
}

main();
