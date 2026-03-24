/**
 * check-bundle-freshness.ts
 * Validates AI knowledge bundle is in sync with platform API:
 *   1. Version match: shell-api package.json version vs bundle index version
 *   2. Date staleness: last_synced in bundle index (warn if >30 days)
 *   3. Manifest completeness: every ModuleManifestV1 field in JSON Schema
 *   4. Hook completeness: every exported hook in cqrs-hooks.md
 *   5. Component completeness: every exported component in ui-components.md
 *
 * Usage:
 *   pnpm tsx scripts/check-bundle-freshness.ts
 *
 * Exit codes:
 *   0 - PASS or WARN (all critical checks green)
 *   1 - FAIL (version mismatch or missing documentation)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Helpers ───

let hasFailure = false;
let hasWarning = false;

function pass(check: string, detail: string): void {
  console.log(`  ✅ ${check}: ${detail}`);
}

function warn(check: string, detail: string): void {
  hasWarning = true;
  console.log(`  ⚠️  ${check}: ${detail}`);
}

function fail(check: string, detail: string): void {
  hasFailure = true;
  console.log(`  ❌ ${check}: ${detail}`);
}

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) {
    fail("File exists", `Missing: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf-8");
}

// ─── 1. Version Check ───

function checkVersion(): void {
  console.log("\n── Version Check ──");

  const pkgContent = readFile("packages/shell-api/package.json");
  if (!pkgContent) return;

  const pkg = JSON.parse(pkgContent) as { version: string };
  const pkgVersion = pkg.version;

  const indexContent = readFile("docs/ai-knowledge-bundle/index.md");
  if (!indexContent) return;

  const versionMatch = indexContent.match(/^version:\s*(.+)$/m);
  if (!versionMatch) {
    fail("Bundle version", "No version field found in index.md");
    return;
  }

  const bundleVersion = versionMatch[1].trim();
  const legacyVersionMatch = indexContent.match(/^bundle_version:\s*(.+)$/m);
  const legacyBundleVersion = legacyVersionMatch?.[1].trim();

  if (bundleVersion !== pkgVersion) {
    fail(
      "Version mismatch",
      `Index version: ${bundleVersion}, shell-api: ${pkgVersion}. Update docs/ai-knowledge-bundle/index.md`,
    );
    return;
  }

  if (legacyBundleVersion && legacyBundleVersion !== pkgVersion) {
    fail(
      "Bundle version mismatch",
      `bundle_version: ${legacyBundleVersion}, shell-api: ${pkgVersion}. Keep version fields aligned.`,
    );
    return;
  }

  pass(
    "Version match",
    legacyBundleVersion
      ? `${bundleVersion} (matches shell-api and bundle_version)`
      : `${bundleVersion} (matches shell-api)`,
  );
}

// ─── 2. Date Staleness ───

function checkStaleness(): void {
  console.log("\n── Date Staleness ──");

  const indexContent = readFile("docs/ai-knowledge-bundle/index.md");
  if (!indexContent) return;

  const dateMatch = indexContent.match(/^last_synced:\s*(.+)$/m);
  if (!dateMatch) {
    warn("Last synced", "No last_synced field found in index.md");
    return;
  }

  const lastSynced = new Date(dateMatch[1].trim());
  if (isNaN(lastSynced.getTime())) {
    warn("Last synced", `Invalid date format: ${dateMatch[1]}`);
    return;
  }

  const daysSinceSync = Math.floor(
    (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceSync > 30) {
    warn(
      "Staleness",
      `Bundle last synced ${daysSinceSync} days ago (${dateMatch[1].trim()}). Consider re-syncing.`,
    );
  } else {
    pass("Staleness", `Last synced ${daysSinceSync} day(s) ago`);
  }
}

// ─── 3. Manifest Schema Completeness ───

function checkManifestSchema(): void {
  console.log("\n── Manifest Schema Completeness ──");

  const typesContent = readFile(
    "packages/shell-api/src/manifest/manifestTypes.ts",
  );
  if (!typesContent) return;

  const schemaContent = readFile("docs/ai-knowledge-bundle/manifest-schema.json");
  if (!schemaContent) return;

  // Extract fields from ModuleManifestV1 interface
  const interfaceMatch = typesContent.match(
    /interface ModuleManifestV1\s*\{([^}]+)\}/,
  );
  if (!interfaceMatch) {
    fail("Manifest types", "Could not find ModuleManifestV1 interface");
    return;
  }

  const interfaceBody = interfaceMatch[1];
  const fieldNames = Array.from(
    interfaceBody.matchAll(/^\s*(\w+)\??\s*:/gm),
  ).map((m) => m[1]);

  // Parse JSON Schema
  let schema: {
    required?: string[];
    properties?: Record<string, unknown>;
  };
  try {
    schema = JSON.parse(schemaContent) as typeof schema;
  } catch {
    fail("JSON Schema", "manifest-schema.json is not valid JSON");
    return;
  }

  const schemaProperties = Object.keys(schema.properties ?? {});
  const schemaRequired = new Set(schema.required ?? []);

  const missingInSchema: string[] = [];
  for (const field of fieldNames) {
    if (!schemaProperties.includes(field)) {
      missingInSchema.push(field);
    }
  }

  if (missingInSchema.length > 0) {
    fail(
      "Manifest fields",
      `Missing from JSON Schema: ${missingInSchema.join(", ")}`,
    );
  } else {
    pass("Manifest fields", `All ${fieldNames.length} fields present in JSON Schema`);
  }

  // Check required fields: non-optional fields in interface should be in schema required
  const requiredFields = Array.from(
    interfaceBody.matchAll(/^\s*(\w+)\s*:/gm),
  )
    .map((m) => m[1])
    .filter((f) => !interfaceBody.match(new RegExp(`\\b${f}\\?\\s*:`)));

  const missingRequired: string[] = [];
  for (const field of requiredFields) {
    if (!schemaRequired.has(field)) {
      missingRequired.push(field);
    }
  }

  if (missingRequired.length > 0) {
    fail(
      "Required fields",
      `Not in JSON Schema required array: ${missingRequired.join(", ")}`,
    );
  } else {
    pass("Required fields", `All ${requiredFields.length} required fields verified`);
  }
}

// ─── 4. Hook Export Completeness ───

function checkHookCompleteness(): void {
  console.log("\n── Hook Export Completeness ──");

  const indexContent = readFile("packages/cqrs-client/src/index.ts");
  if (!indexContent) return;

  const docsContent = readFile("docs/ai-knowledge-bundle/cqrs-hooks.md");
  if (!docsContent) return;

  // Extract exported hook names (functions starting with "use")
  const hookExports = Array.from(
    indexContent.matchAll(/export\s*\{\s*(\w+)\s*\}/g),
  )
    .map((m) => m[1])
    .filter((name) => name.startsWith("use"));

  // Also check multi-export lines
  const multiExports = Array.from(
    indexContent.matchAll(/export\s*\{([^}]+)\}/g),
  ).flatMap((m) =>
    m[1]
      .split(",")
      .map((s) => s.trim().split(/\s+/)[0])
      .filter((name) => name.startsWith("use")),
  );

  const allHooks = [...new Set([...hookExports, ...multiExports])];

  const undocumented: string[] = [];
  for (const hook of allHooks) {
    if (!docsContent.includes(hook)) {
      undocumented.push(hook);
    }
  }

  if (undocumented.length > 0) {
    fail(
      "Hook documentation",
      `Undocumented hooks: ${undocumented.join(", ")}`,
    );
  } else {
    pass("Hook documentation", `All ${allHooks.length} hooks documented`);
  }
}

// ─── 5. Component Export Completeness ───

function checkComponentCompleteness(): void {
  console.log("\n── Component Export Completeness ──");

  const indexContent = readFile("packages/ui/src/index.ts");
  if (!indexContent) return;

  const docsContent = readFile("docs/ai-knowledge-bundle/ui-components.md");
  if (!docsContent) return;

  // Extract exported component names (PascalCase, not types, not utility functions)
  const componentExports = Array.from(
    indexContent.matchAll(/export\s*\{([^}]+)\}/g),
  )
    .flatMap((m) =>
      m[1]
        .split(",")
        .map((s) => s.trim().split(/\s+/)[0])
        .filter(Boolean),
    )
    // Filter: PascalCase components (not hooks, not utility functions, not types)
    .filter(
      (name) =>
        /^[A-Z]/.test(name) &&
        !name.endsWith("Props") &&
        !name.endsWith("Item") &&
        !name.endsWith("Option") &&
        !name.endsWith("Group") &&
        !name.endsWith("Section") &&
        !name.endsWith("Separator") &&
        !name.endsWith("Scale") &&
        !name.endsWith("Colors") &&
        !name.endsWith("Result") &&
        // Exclude type-like *State exports but keep real components (e.g., EmptyState)
        !(name.endsWith("State") && name !== "EmptyState"),
    );

  // Also filter out utility exports that aren't components
  const utilityExports = new Set([
    "computeComplianceScore",
    "contrastRatio",
    "relativeLuminance",
    "hexToRgb",
    "validateContrastMatrix",
    "validateThemeContrast",
    "validateFocusRingContrast",
    "lightTheme",
    "darkTheme",
    "FRESH_THRESHOLD_MS",
  ]);

  const components = componentExports.filter(
    (name) => !utilityExports.has(name),
  );

  const undocumented: string[] = [];
  for (const component of components) {
    if (!docsContent.includes(component)) {
      undocumented.push(component);
    }
  }

  if (undocumented.length > 0) {
    fail(
      "Component documentation",
      `Undocumented components: ${undocumented.join(", ")}`,
    );
  } else {
    pass(
      "Component documentation",
      `All ${components.length} components documented`,
    );
  }
}

// ─── 6. Bundle Files Existence ───

function checkBundleFiles(): void {
  console.log("\n── Bundle Files ──");

  const requiredFiles = [
    "docs/ai-knowledge-bundle/index.md",
    "docs/ai-knowledge-bundle/manifest-schema.json",
    "docs/ai-knowledge-bundle/manifest-guide.md",
    "docs/ai-knowledge-bundle/cqrs-hooks.md",
    "docs/ai-knowledge-bundle/ui-components.md",
    "docs/ai-knowledge-bundle/conventions.md",
    "docs/ai-knowledge-bundle/scaffold-structure.md",
    "docs/ai-knowledge-bundle/test-fixtures.md",
  ];

  let allPresent = true;
  for (const file of requiredFiles) {
    const fullPath = resolve(ROOT, file);
    if (!existsSync(fullPath)) {
      fail("Bundle file", `Missing: ${file}`);
      allPresent = false;
    }
  }

  if (allPresent) {
    pass("Bundle files", `All ${requiredFiles.length} bundle files present`);
  }
}

// ─── Main ───

console.log("🔍 Knowledge Bundle Freshness Check");
console.log("====================================");

checkBundleFiles();
checkVersion();
checkStaleness();
checkManifestSchema();
checkHookCompleteness();
checkComponentCompleteness();

console.log("\n====================================");

if (hasFailure) {
  console.log("❌ FAIL — Bundle is out of sync with platform API");
  console.log(
    "   Fix the issues above, then re-run: pnpm check:bundle-freshness",
  );
  process.exit(1);
} else if (hasWarning) {
  console.log("⚠️  WARN — Bundle may be stale but versions match");
  process.exit(0);
} else {
  console.log("✅ PASS — Bundle is fresh and complete");
  process.exit(0);
}
